import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export type Scan = {
  id: number;
  type: 'repo' | 'file' | string;
  target: string;
  result: any;
  created_at: string;
};

export async function fetchMyScans(params?: { type?: 'repo'|'file'; start?: string; end?: string; limit?: number; offset?: number }): Promise<Scan[]> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await axios.get(`${API_URL}/api/scans`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    params,
  });
  return res.data as Scan[];
}

export async function exportMyScans(params?: { type?: 'repo'|'file'; start?: string; end?: string }) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await axios.get(`${API_URL}/api/scans/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    params,
    responseType: 'blob',
  });
  return res.data as Blob;
}
