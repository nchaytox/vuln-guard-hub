import { useState } from "react";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { VulnerabilityResults, Vulnerability } from "@/components/VulnerabilityResults";
import { generateMockVulnerabilities, analyzeFileContent, analyzeGithubRepo } from "@/utils/mockVulnerabilities";
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
      
      if (type === 'file' && data instanceof File) {
        target = data.name;
        await analyzeFileContent(data);
      } else if (type === 'github' && typeof data === 'string') {
        target = data;
        await analyzeGithubRepo(data);
      } else {
        throw new Error('Invalid scan parameters');
      }
      
      setScanTarget(target);
      const mockVulns = generateMockVulnerabilities(target, type);
      setVulnerabilities(mockVulns);
      setHasScanned(true);
      
      toast({
        title: "Scan completed",
        description: `Found ${mockVulns.length} vulnerabilities in ${target}`,
        duration: 3000,
      });
      
    } catch (error) {
      toast({
        title: "Scan failed",
        description: "An error occurred while scanning for vulnerabilities",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
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