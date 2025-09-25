# Security Automation Playbook

This document explains how the security CI/CD workflows operate, the jobs that must stay green before a merge, and how to triage findings.

## Workflows overview

| Workflow | Trigger | Scope |
|---|---|---|
| `security-pr` | Every pull request targeting `main` or `develop` | Diff-focused checks (Semgrep, Trivy, Gitleaks, SBOM) that gate merges |
| `security-release` | Push to `main`, published releases, nightly schedule (02:00 UTC), manual dispatch | Full repository history scans, release SBOM attachment |

Each job uploads artefacts for 30–45 days (`semgrep.sarif`, `gitleaks.json`, `trivy-*.json`, `sbom-cyclonedx.json`). Semgrep and Trivy config jobs also upload SARIF reports to GitHub Code Scanning so findings surface under *Security → Code scanning alerts*.

## GitHub project configuration

1. **Enable Code security & analysis**
   - Navigate to *Settings → Security & analysis*.
   - Enable Code scanning alerts, Dependabot alerts, and Secret scanning for the repository. (For private repositories, ensure the organisation has GitHub Advanced Security entitlements.)

2. **Branch protection for `main`**
   - Open *Settings → Branches → Branch protection rules*.
   - Add/modify the rule for `main` and require:
     - *Require pull request reviews* → minimum 2 approvals.
     - *Require status checks to pass before merging* → add the jobs: `Semgrep SAST`, `Gitleaks (diff)`, `Trivy SCA (filesystem)`, `Trivy IaC/config scan`, `Trivy container image scan`, `Generate SBOM`.
     - Enable *Require branches to be up to date* so rebased PRs rerun the security checks.

3. **Security tab visibility**
   - Code scanning alerts (SARIF uploads) are visible once the first workflow run is complete.
   - Required checks enforce that High/Critical SAST/SCA issues or secrets block merges.

## Job details & gates

### Semgrep (SAST)
- Ruleset: `p/owasp-top-ten` (JS/TS/Node coverage).
- Threshold: job fails when a finding is reported with Semgrep severity `ERROR` (mapped to High/Critical).
- False positives: document in a tracking issue, suppress via `// nosemgrep` comments only when justified, or update `.semgrepignore`. Record rationale in PR description.
- Artefacts: `semgrep.sarif`, `semgrep.json`.

### Gitleaks (secret scanning)
- PR workflow scans the diff (`base..head`) and fails on any leak.
- Release workflow scans the entire history nightly and on release.
- Remediation policy: immediately revoke/rotate affected credentials, purge from git history (if practical), and update `.gitleaks.toml` only for well-understood false positives (add comment with ticket reference).
- Artefacts: `gitleaks.json`, `gitleaks-full.json`.

### Trivy (SCA, IaC, container)
- Filesystem scan: audits dependencies (`server`, `client`) plus OS packages; fails on High/Critical CVEs (ignoring unfixed in PR runs, full evaluation on release).
- Config scan: checks Dockerfiles and Compose files; outputs SARIF for code scanning alerts.
- Image scan: builds `server/Dockerfile` and inspects OS + libraries before publishing.
- Cache: reuse vulnerability DB via `actions/cache` to keep runtimes low.
- False positives: baseline in `trivyignore.yaml` (with comments referencing CVE triage issue) if the upstream assessment justifies it.
- Artefacts: `trivy-fs.json`, `trivy-config.sarif`, `trivy-image.json`.

### SBOM generation
- Generated with `anchore/sbom-action@v0` (CycloneDX JSON).
- Attached as artefact on every run; on release events the SBOM is uploaded to the GitHub release.
- Use the SBOM for vulnerability watch (e.g., re-scan via Trivy `--input sbom` in future tasks).

## Triage workflow

1. **Assess severity**: High/Critical findings block merges by design.
2. **Open an issue**: capture remediation plan, target release, and owner.
3. **Fix or suppress**:
   - Fix code / update dependency.
   - If suppression is unavoidable, document the justification (link issue ID, expected removal date) and add to the relevant ignore file.
4. **Verify**: rerun `security-pr` locally via `act` (optional) or push updated branch; ensure checks are green.

## Nightly/Release tasks

The `security-release` workflow performs exhaustive scans and publishes SBOMs. Review scheduled run results at least weekly:
- Resolve any new High/Critical findings before the next release.
- If a release run fails, block the release until findings are mitigated or accepted with sign-off from security/PO.

## Artefact naming convention (all workflows)

| Artefact | Producer job |
|---|---|
| `semgrep.sarif`, `semgrep.json` | Semgrep SAST |
| `gitleaks.json` / `gitleaks-full.json` | Gitleaks |
| `trivy-fs.json` | Trivy SCA |
| `trivy-config.sarif` | Trivy config |
| `trivy-image.json` | Trivy image |
| `sbom-cyclonedx.json` | SBOM job |

Retention defaults to 30 days (PR) and 45 days (release); adjust if the project timeline changes.

## Local developer hygiene (optional but encouraged)

- Install `pre-commit` hooks for Gitleaks (`gitleaks protect --staged`) and Semgrep (`semgrep scan --config p/owasp-top-ten`).
- Run `npm audit` / `npm audit fix` opportunistically on the client/server packages.
- Rebuild and scan images locally with `trivy image --severity HIGH,CRITICAL <tag>` before pushing complex Docker changes.

Keeping the above practices and workflows aligned ensures the “Required checks” gate on `main` protects the release pipeline while keeping findings actionable and auditable.
