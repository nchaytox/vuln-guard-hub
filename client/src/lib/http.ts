import axios, { AxiosError } from 'axios';

export function extractErrorMessage(err: any): string {
  const ax = err as AxiosError<any>;
  const status = ax.response?.status;
  const serverMsg = (ax.response?.data as any)?.error || (ax.response?.data as any)?.message;
  if (status === 400) return serverMsg || 'Requête invalide';
  if (status === 401 || status === 403) return serverMsg || 'Non autorisé';
  if (status === 413) return 'Fichier trop volumineux (limite atteinte)';
  if (status === 415) return 'Type de fichier non autorisé';
  if (status === 429) return 'Trop de requêtes: réessayez plus tard';
  if (status && status >= 500) return 'Erreur serveur lors du scan';
  return serverMsg || ax.message || 'Erreur réseau';
}

