import axios from 'axios';

// IMPORTANT: Never hardcode secrets in client code.
// If you need to call GitHub, proxy via your backend or use a public endpoint.
// Keeping a placeholder here to avoid breaking imports; returns an empty list by default.
export const fetchVulnerabilities = async (): Promise<Vulnerability[]> => {
  console.warn('fetchVulnerabilities: not configured. Returning empty list.');
  return [];
};

export type Vulnerability = {
  id: string;
  packageName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
};
