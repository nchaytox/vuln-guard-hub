import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchScanStats } from '@/services/scanService';
import type { AggregatedScanStats, SeverityCounts } from '@/lib/scanStats';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
} from 'recharts';

const severityConfig = {
  critical: { label: 'Critiques', color: '#b91c1c' },
  high: { label: 'Élevées', color: '#ef4444' },
  medium: { label: 'Modérées', color: '#f97316' },
  low: { label: 'Faibles', color: '#22c55e' },
} as const;

type SeverityConfigKey = keyof typeof severityConfig;

const severityKeyMap: Record<SeverityConfigKey, keyof SeverityCounts> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
} as const;

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const axiosLike = error as { response?: { data?: { error?: unknown } } };
    const message = axiosLike.response?.data?.error;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Failed to load scans';
};

const formatNumber = (value: number) => value.toLocaleString();

const formatDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString();
};

export default function RiskDashboard() {
  const [stats, setStats] = useState<AggregatedScanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchScanStats();
        setStats(data);
      } catch (error: unknown) {
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const severityDistribution = useMemo(() => {
    if (!stats) return [];
    return (Object.keys(severityConfig) as SeverityConfigKey[])
      .map((key) => ({
        name: severityConfig[key].label,
        key,
        value: stats.totals[severityKeyMap[key]],
      }))
      .filter((entry) => entry.value > 0);
  }, [stats]);

  const trendData = useMemo(() => {
    if (!stats) return [];
    return stats.trend.map((point) => ({
      date: point.date,
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
    }));
  }, [stats]);

  const topTargets = useMemo(() => {
    if (!stats) return [];
    return stats.topTargets.map((target) => ({
      target: target.target,
      critical: target.critical,
      high: target.high,
      medium: target.medium,
      low: target.low,
    }));
  }, [stats]);

  const lastScanDate = stats?.summary.lastScanAt ? new Date(stats.summary.lastScanAt) : null;
  const criticalToResolved = stats?.summary.criticalToResolvedRatio ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6 pt-20">
        {loading && <p>Loading…</p>}
        {!loading && error && <p className="text-red-600">{error}</p>}
        {!loading && !error && !stats && <p className="text-muted-foreground">Aucune statistique disponible.</p>}
        {!loading && !error && stats && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total findings</CardTitle>
                  <CardDescription>
                    {`Critiques: ${stats.totals.CRITICAL} • Élevées: ${stats.totals.HIGH} • Modérées: ${stats.totals.MEDIUM} • Faibles: ${stats.totals.LOW}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{formatNumber(stats.summary.totalFindings)}</p>
                  <p className="text-sm text-muted-foreground">{formatNumber(stats.summary.totalScans)} scans analysés</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scans sans vulnérabilité</CardTitle>
                  <CardDescription>
                    {stats.summary.totalScans === 0
                      ? 'Aucun scan enregistré'
                      : `${stats.summary.resolvedScans} sur ${stats.summary.totalScans}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{formatNumber(stats.summary.resolvedScans)}</p>
                  <p className="text-sm text-muted-foreground">{formatNumber(stats.summary.uniqueTargets)} cibles analysées</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ratio critiques / résolus</CardTitle>
                  <CardDescription>
                    {criticalToResolved !== null
                      ? 'Nombre de vulnérabilités critiques par scan terminé'
                      : 'Aucun scan résolu à ce jour'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">
                    {criticalToResolved !== null ? criticalToResolved.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(stats.summary.scansWithCritical)} scans contiennent des critiques
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dernier scan</CardTitle>
                  <CardDescription>
                    {lastScanDate
                      ? `Cible ${stats.summary.lastScanTarget || ''}`
                      : 'Aucun scan enregistré'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">
                    {lastScanDate ? lastScanDate.toLocaleDateString() : '--'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lastScanDate ? lastScanDate.toLocaleTimeString() : ''}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Tendance des vulnérabilités</CardTitle>
                  <CardDescription>Volumes cumulés par sévérité</CardDescription>
                </CardHeader>
                <CardContent>
                  {trendData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Pas encore de données exploitables.</p>
                  ) : (
                    <ChartContainer config={severityConfig} className="w-full h-[340px] aspect-auto">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDateLabel(String(value))} />} />
                        <Area type="monotone" dataKey="critical" stackId="1" stroke="var(--color-critical)" fill="var(--color-critical)" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="high" stackId="1" stroke="var(--color-high)" fill="var(--color-high)" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="medium" stackId="1" stroke="var(--color-medium)" fill="var(--color-medium)" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="low" stackId="1" stroke="var(--color-low)" fill="var(--color-low)" fillOpacity={0.2} />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition des sévérités</CardTitle>
                  <CardDescription>Parts des vulnérabilités trouvées</CardDescription>
                </CardHeader>
                <CardContent>
                  {severityDistribution.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune vulnérabilité détectée.</p>
                  ) : (
                    <ChartContainer config={severityConfig} className="w-full h-[340px] aspect-auto">
                      <PieChart>
                        <Pie
                          data={severityDistribution}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={4}
                        >
                          {severityDistribution.map((entry) => (
                            <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top cibles à risque</CardTitle>
                <CardDescription>Classement par vulnérabilités critiques puis élevées</CardDescription>
              </CardHeader>
              <CardContent>
                {topTargets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun scan à analyser.</p>
                ) : (
                  <ChartContainer config={severityConfig} className="w-full h-[360px] aspect-auto">
                    <BarChart data={topTargets} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="target" type="category" width={220} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="critical" stackId="1" fill="var(--color-critical)" />
                      <Bar dataKey="high" stackId="1" fill="var(--color-high)" />
                      <Bar dataKey="medium" stackId="1" fill="var(--color-medium)" />
                      <Bar dataKey="low" stackId="1" fill="var(--color-low)" />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
