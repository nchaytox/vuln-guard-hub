import axios from 'axios';
import { extractErrorMessage } from '@/lib/http';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export type UserProfile = {
  username: string;
  email?: string | null;
  display_name?: string | null;
  created_at: string;
};

export async function getMe(): Promise<UserProfile> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await axios.get(`${API_URL}/auth/me`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  return res.data as UserProfile;
}

export async function updateMe(payload: { email?: string | null; displayName?: string | null; password?: string; }): Promise<UserProfile> {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await axios.patch(`${API_URL}/auth/me`, payload, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    return res.data as UserProfile;
  } catch (err: any) {
    const msg = extractErrorMessage(err);
    throw new Error(msg);
  }
}
