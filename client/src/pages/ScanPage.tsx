import { useState } from 'react';
import { runTrivyScan } from '../services/trivyService';
import { Header } from '@/components/Header';

export default function ScanPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    try {
      const data = await runTrivyScan(repoUrl);
      setResult(data);
    } catch (err) {
      alert("Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-4 pt-20">
      <h2 className="text-xl font-bold mb-4">Scanner un repo GitHub avec Trivy</h2>
      <input
        type="text"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="https://github.com/nom-utilisateur/repo"
        className="border px-2 py-1 w-full mb-2"
      />
      <button onClick={handleScan} className="bg-blue-600 text-white px-4 py-2 rounded">
        Lancer le scan
      </button>

      {loading && <p>Analyse en cours...</p>}

      {result && (
        <pre className="mt-4 p-2 bg-gray-100 rounded max-h-96 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      </div>
    </div>
  );
}
