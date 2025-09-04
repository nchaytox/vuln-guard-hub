import { Vulnerability } from "@/components/VulnerabilityResults";

function toSeverity(s?: string): Vulnerability['severity'] {
  const sev = (s || '').toUpperCase();
  if (sev === 'CRITICAL') return 'critical';
  if (sev === 'HIGH') return 'high';
  if (sev === 'MEDIUM') return 'medium';
  return 'low';
}

// Map Trivy JSON output to the UI Vulnerability type
export function parseTrivyResultsToVulnerabilities(data: any): Vulnerability[] {
  const out: Vulnerability[] = [];

  // Trivy can output either an array of artifacts or a single object
  const artifacts = Array.isArray(data) ? data : data ? [data] : [];

  let idCounter = 1;
  for (const artifact of artifacts) {
    const results = Array.isArray(artifact?.Results) ? artifact.Results : [];
    for (const r of results) {
      // Vulnerabilities
      const vulns = Array.isArray(r?.Vulnerabilities) ? r.Vulnerabilities : [];
      for (const v of vulns) {
        const dependency = String(v?.PkgName || r?.Target || 'unknown');
        const vId = String(v?.VulnerabilityID || v?.PrimaryURL || `VULN-${idCounter}`);
        const desc = String(v?.Title || v?.Description || '').trim() || 'No description';
        const fixVersion = v?.FixedVersion ? String(v.FixedVersion) : undefined;
        out.push({
          id: String(idCounter++),
          dependency,
          severity: toSeverity(v?.Severity),
          cveId: vId,
          description: desc,
          fixAvailable: Boolean(fixVersion),
          fixVersion,
        });
      }

      // Misconfigurations (map as vulnerabilities for display)
      const mis = Array.isArray(r?.Misconfigurations) ? r.Misconfigurations : [];
      for (const m of mis) {
        const dependency = String(r?.Target || 'misconfiguration');
        const vId = String(m?.ID || m?.AVDID || `MISCONF-${idCounter}`);
        const desc = String(m?.Title || m?.Description || '').trim() || 'Misconfiguration';
        out.push({
          id: String(idCounter++),
          dependency,
          severity: toSeverity(m?.Severity),
          cveId: vId,
          description: desc,
          fixAvailable: false,
        });
      }
    }
  }

  return out;
}
