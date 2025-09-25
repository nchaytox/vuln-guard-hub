import axios from 'axios';
import { extractErrorMessage } from '../lib/http';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export async function scanFile(file: File) {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const form = new FormData();
    form.append('file', file);
    const res = await axios.post(`${API_URL}/api/upload/upload`, form, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.data;
  } catch (error: any) {
    const msg = extractErrorMessage(error);
    throw new Error(msg);
  }
}
