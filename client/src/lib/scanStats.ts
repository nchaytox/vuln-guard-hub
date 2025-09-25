import type { Scan } from '@/services/scanService';

const SEVERITY_KEYS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
type SeverityKey = (typeof SEVERITY_KEYS)[number];

export type SeverityCounts = Record<SeverityKey, number> & { total: number };

export type TrendPoint = {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
};

export type TargetStat = {
  target: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  scans: number;
};

export type StatSummary = {
  totalScans: number;
  totalFindings: number;
  resolvedScans: number;
  scansWithCritical: number;
  criticalToResolvedRatio: number | null;
  lastScanAt: string | null;
  lastScanTarget: string | null;
  uniqueTargets: number;
};

export type AggregatedScanStats = {
  totals: SeverityCounts;
  trend: TrendPoint[];
  topTargets: TargetStat[];
  summary: StatSummary;
};

const createEmptyCounts = (): SeverityCounts => ({
  CRITICAL: 0,
  HIGH: 0,
  MEDIUM: 0,
  LOW: 0,
  total: 0,
});

const toArrayResult = (result: unknown): unknown[] => {
  if (!result) return [];

  let parsed: unknown = result;
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

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const isSeverityKey = (value: string): value is SeverityKey =>
  (SEVERITY_KEYS as readonly string[]).includes(value);

export const countSeverities = (result: unknown): SeverityCounts => {
  const counts = createEmptyCounts();
  const items = toArrayResult(result);

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const results = asArray((item as { Results?: unknown }).Results);

    for (const resultEntry of results) {
      if (!resultEntry || typeof resultEntry !== 'object') continue;
      const vulnerabilities = asArray(
        (resultEntry as { Vulnerabilities?: unknown }).Vulnerabilities,
      );

      for (const vulnerability of vulnerabilities) {
        if (!vulnerability || typeof vulnerability !== 'object') continue;
        const severityValue = (vulnerability as { Severity?: unknown }).Severity;
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

export const aggregateScanStats = (scans: Scan[]): AggregatedScanStats => {
  const totals = createEmptyCounts();
  const trendMap = new Map<string, SeverityCounts>();
  const targetMap = new Map<string, TargetStat>();

  let resolvedScans = 0;
  let scansWithCritical = 0;
  let latestScan: { date: Date; target: string } | null = null;

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
      const dayEntry = trendMap.get(dayKey) ?? createEmptyCounts();
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

    const targetEntry = targetMap.get(scan.target) ?? {
      target: scan.target,
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
    targetMap.set(scan.target, targetEntry);
  }

  const trend: TrendPoint[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, counts]) => ({
      date,
      critical: counts.CRITICAL,
      high: counts.HIGH,
      medium: counts.MEDIUM,
      low: counts.LOW,
      total: counts.total,
    }));

  const topTargets: TargetStat[] = Array.from(targetMap.values())
    .sort((a, b) => {
      if (b.critical !== a.critical) return b.critical - a.critical;
      if (b.high !== a.high) return b.high - a.high;
      return b.total - a.total;
    })
    .slice(0, 5);

  const summary: StatSummary = {
    totalScans: scans.length,
    totalFindings: totals.total,
    resolvedScans,
    scansWithCritical,
    criticalToResolvedRatio: resolvedScans > 0 ? totals.CRITICAL / resolvedScans : null,
    lastScanAt: latestScan ? latestScan.date.toISOString() : null,
    lastScanTarget: latestScan ? latestScan.target : null,
    uniqueTargets: targetMap.size,
  };

  return { totals, trend, topTargets, summary };
};
