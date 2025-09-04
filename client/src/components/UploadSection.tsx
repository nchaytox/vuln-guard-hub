import { useState } from "react";
import { Upload, Github, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

interface UploadSectionProps {
  onScan: (type: 'file' | 'github', data: string | File) => void;
  isLoading: boolean;
}

export const UploadSection = ({ onScan, isLoading }: UploadSectionProps) => {
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['.json', '.txt', '.yml', '.yaml', '.lock'];
      const isValid = validTypes.some(type => file.name.toLowerCase().endsWith(type));
      
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please upload a dependency file (package.json, requirements.txt, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleFileScan = () => {
    if (selectedFile) {
      onScan('file', selectedFile);
    }
  };

  const handleGithubScan = () => {
    if (githubUrl.trim()) {
      onScan('github', githubUrl.trim());
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <span>Scan for Vulnerabilities</span>
        </CardTitle>
        <CardDescription>
          Upload a dependency file or provide a GitHub repository URL to scan for known vulnerabilities
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Upload File</span>
            </TabsTrigger>
            <TabsTrigger value="github" className="flex items-center space-x-2">
              <Github className="h-4 w-4" />
              <span>GitHub Repo</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Dependency File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop or click to upload
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports: package.json, requirements.txt, Dockerfile, *.lock files
                </p>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".json,.txt,.yml,.yaml,.lock"
                  onChange={handleFileChange}
                  className="mx-auto max-w-xs"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-success">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            
            <Button 
              onClick={handleFileScan} 
              disabled={!selectedFile || isLoading}
              className="w-full"
            >
              {isLoading ? "Scanning..." : "Scan File"}
            </Button>
          </TabsContent>
          
          <TabsContent value="github" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github-url">GitHub Repository URL</Label>
              <Input
                id="github-url"
                type="url"
                placeholder="https://github.com/username/repository"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a public GitHub repository URL to scan its dependencies
              </p>
            </div>
            
            <Button 
              onClick={handleGithubScan} 
              disabled={!githubUrl.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Scanning..." : "Scan Repository"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};