import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { exportMyScans, fetchMyScans, Scan } from '@/services/scanService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { runTrivyScan } from '@/services/trivyService';
import { countSeverities } from '@/lib/scanStats';

export default function MyScans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'repo' | 'file'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [rerunLoadingId, setRerunLoadingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyScans({ type: filterType === 'all' ? undefined : filterType, start: startDate || undefined, end: endDate || undefined });
        setScans(data);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load scans');
      } finally {
        setLoading(false);
      }
    })();
  }, [filterType, startDate, endDate]);

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      if (filterType !== 'all' && s.type !== filterType) return false;
      const created = new Date(s.created_at).getTime();
      if (startDate) {
        const startTs = new Date(startDate).getTime();
        if (created < startTs) return false;
      }
      if (endDate) {
        const endTs = new Date(endDate).getTime();
        if (created > endTs) return false;
      }
      return true;
    });
  }, [scans, filterType, startDate, endDate]);


  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyScans({ type: filterType === 'all' ? undefined : filterType, start: startDate || undefined, end: endDate || undefined });
      setScans(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load scans');
    } finally {
      setLoading(false);
    }
  };

  const rerun = async (scan: Scan) => {
    if (scan.type !== 'repo') return;
    setRerunLoadingId(scan.id);
    try {
      await runTrivyScan(scan.target);
      await refresh();
    } catch (error) {
      console.warn('Failed to re-run scan', error);
    } finally {
      setRerunLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6 pt-20">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>My Scans</CardTitle>
          <CardDescription>Latest scans for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border rounded px-2 py-1 bg-background text-foreground"
              >
                <option value="all">All</option>
                <option value="repo">Repo</option>
                <option value="file">File</option>
                
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1 bg-background text-foreground"
              />
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={refresh}>Refresh</Button>
              <Button variant="outline" onClick={async () => {
                try {
                  const blob = await exportMyScans({ type: filterType === 'all' ? undefined : filterType, start: startDate || undefined, end: endDate || undefined });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'scans.csv';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.warn('Failed to export scans', error);
                }
              }}>Export CSV</Button>
            </div>
          </div>

          {loading && <p>Loading…</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!loading && !error && (
            filtered.length === 0 ? (
              <p className="text-muted-foreground">No scans yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Severities</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.id}</TableCell>
                          <TableCell className="capitalize">{s.type}</TableCell>
                          <TableCell className="font-mono text-sm max-w-sm truncate" title={s.target}>{s.target}</TableCell>
                          <TableCell>
                            {(() => {
                              const c = countSeverities(s.result);
                              return (
                                <div className="flex flex-wrap gap-1 text-xs">
                                  <span className="px-2 py-0.5 rounded bg-red-900/20 text-red-700">C: {c.CRITICAL}</span>
                                  <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-600">H: {c.HIGH}</span>
                                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-700">M: {c.MEDIUM}</span>
                                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-700">L: {c.LOW}</span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                                {expandedId === s.id ? 'Hide' : 'View'}
                              </Button>
                              {s.type === 'repo' && (
                                <Button variant="outline" size="sm" onClick={() => rerun(s)} disabled={rerunLoadingId === s.id}>
                                  {rerunLoadingId === s.id ? 'Re-running…' : 'Re-run'}
                                </Button>
                              )}
                              
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filtered.map((s) => (
                  expandedId === s.id ? (
                    <pre key={`pre-${s.id}`} className="p-3 bg-muted rounded overflow-auto text-xs">
                      {JSON.stringify(s.result, null, 2)}
                    </pre>
                  ) : null
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
