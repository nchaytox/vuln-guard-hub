import { useState } from "react";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { VulnerabilityResults, Vulnerability } from "@/components/VulnerabilityResults";
import { analyzeFileContent, analyzeGithubRepo } from "@/utils/mockVulnerabilities";
import { parseTrivyResultsToVulnerabilities } from "@/utils/trivyParser";
import { runTrivyScan } from "@/services/trivyService";
import { scanFile } from "@/services/uploadService";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanTarget, setScanTarget] = useState<string>("");
  const [scanType, setScanType] = useState<'file' | 'github'>('file');
  const [hasScanned, setHasScanned] = useState(false);
  const { toast } = useToast();

  const handleScan = async (type: 'file' | 'github', data: string | File) => {
    setIsLoading(true);
    setHasScanned(false);
    setScanType(type);
    
    try {
      let target: string;
      let backendResult: any | null = null;
      
      if (type === 'file' && data instanceof File) {
        target = data.name;
        await analyzeFileContent(data);
        backendResult = await scanFile(data);
      } else if (type === 'github' && typeof data === 'string') {
        target = data;
        await analyzeGithubRepo(data);
        backendResult = await runTrivyScan(data);
      } else {
        throw new Error('Invalid scan parameters');
      }
      
      const parsed = parseTrivyResultsToVulnerabilities(backendResult);
      setScanTarget(target);
      setVulnerabilities(parsed);
      setHasScanned(true);
      
      toast({
        title: "Scan completed",
        description: `Found ${parsed.length} vulnerabilities in ${target}`,
        duration: 3000,
      });
      
    } catch (error: any) {
      const detail = error?.response?.data?.error || error?.message || 'Unknown error';
      toast({
        title: "Scan failed",
        description: String(detail),
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8 pt-20">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            Secure Your Dependencies
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your project's dependency files or scan GitHub repositories 
            to identify known security vulnerabilities and get actionable fixes.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <UploadSection onScan={handleScan} isLoading={isLoading} />
        </div>
        
        {hasScanned && (
          <div className="max-w-6xl mx-auto">
            <VulnerabilityResults 
              vulnerabilities={vulnerabilities}
              scanTarget={scanTarget}
              scanType={scanType}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
