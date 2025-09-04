import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export const runTrivyScan = async (repoUrl: string) => {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await axios.post(
      `${API_URL}/scan`,
      { repoUrl },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );
    return response.data;
  } catch (error: any) {
    console.error('Erreur lors du scan Trivy :', error.response?.data || error.message);
    throw error;
  }
};
