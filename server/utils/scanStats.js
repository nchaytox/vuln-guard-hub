const SEVERITY_KEYS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const createEmptyCounts = () => ({
  CRITICAL: 0,
  HIGH: 0,
  MEDIUM: 0,
  LOW: 0,
  total: 0,
});

const toArrayResult = (result) => {
  if (!result) return [];

  let parsed = result;
  if (typeof result === 'string') {
    try {
      parsed = JSON.parse(result);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return [parsed];
  return [];
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const isSeverityKey = (value) => SEVERITY_KEYS.includes(value);

export const countSeverities = (result) => {
  const counts = createEmptyCounts();
  const items = toArrayResult(result);

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const results = asArray(item.Results);

    for (const resultEntry of results) {
      if (!resultEntry || typeof resultEntry !== 'object') continue;
      const vulnerabilities = asArray(resultEntry.Vulnerabilities);

      for (const vulnerability of vulnerabilities) {
        if (!vulnerability || typeof vulnerability !== 'object') continue;
        const severityValue = vulnerability.Severity;
        if (typeof severityValue !== 'string') continue;
        const severity = severityValue.toUpperCase();
        if (isSeverityKey(severity)) {
          counts[severity] += 1;
          counts.total += 1;
        }
      }
    }
  }

  return counts;
};

export const aggregateScanStats = (scans) => {
  const totals = createEmptyCounts();
  const trendMap = new Map();
  const targetMap = new Map();

  let resolvedScans = 0;
  let scansWithCritical = 0;
  let latestScan = null;

  for (const scan of scans) {
    const counts = countSeverities(scan.result);

    totals.CRITICAL += counts.CRITICAL;
    totals.HIGH += counts.HIGH;
    totals.MEDIUM += counts.MEDIUM;
    totals.LOW += counts.LOW;
    totals.total += counts.total;

    if (counts.total === 0) resolvedScans += 1;
    if (counts.CRITICAL > 0) scansWithCritical += 1;

    const createdAt = new Date(scan.created_at);
    if (!Number.isNaN(createdAt.valueOf())) {
      const dayKey = createdAt.toISOString().slice(0, 10);
      const dayEntry = trendMap.get(dayKey) || createEmptyCounts();
      dayEntry.CRITICAL += counts.CRITICAL;
      dayEntry.HIGH += counts.HIGH;
      dayEntry.MEDIUM += counts.MEDIUM;
      dayEntry.LOW += counts.LOW;
      dayEntry.total += counts.total;
      trendMap.set(dayKey, dayEntry);

      if (!latestScan || createdAt > latestScan.date) {
        latestScan = { date: createdAt, target: scan.target };
      }
    }

    const targetKey = scan.target || 'unknown';
    const targetEntry = targetMap.get(targetKey) || {
      target: targetKey,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0,
      scans: 0,
    };

    targetEntry.critical += counts.CRITICAL;
    targetEntry.high += counts.HIGH;
    targetEntry.medium += counts.MEDIUM;
    targetEntry.low += counts.LOW;
    targetEntry.total += counts.total;
    targetEntry.scans += 1;
    targetMap.set(targetKey, targetEntry);
  }

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, counts]) => ({
      date,
      critical: counts.CRITICAL,
      high: counts.HIGH,
      medium: counts.MEDIUM,
      low: counts.LOW,
      total: counts.total,
    }));

  const topTargets = Array.from(targetMap.values())
    .sort((a, b) => {
      if (b.critical !== a.critical) return b.critical - a.critical;
      if (b.high !== a.high) return b.high - a.high;
      return b.total - a.total;
    })
    .slice(0, 5);

  return {
    totals,
    trend,
    topTargets,
    summary: {
      totalScans: scans.length,
      totalFindings: totals.total,
      resolvedScans,
      scansWithCritical,
      criticalToResolvedRatio: resolvedScans > 0 ? totals.CRITICAL / resolvedScans : null,
      lastScanAt: latestScan ? latestScan.date.toISOString() : null,
      lastScanTarget: latestScan ? latestScan.target : null,
      uniqueTargets: targetMap.size,
    },
  };
};
