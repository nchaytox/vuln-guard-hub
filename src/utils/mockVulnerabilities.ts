import { Vulnerability } from "@/components/VulnerabilityResults";

// Mock vulnerability data for demonstration
export const generateMockVulnerabilities = (target: string, type: 'file' | 'github'): Vulnerability[] => {
  const vulnerabilities: Vulnerability[] = [];
  
  // Simulate different scenarios based on target
  const random = Math.random();
  
  if (random < 0.3) {
    // 30% chance of no vulnerabilities
    return [];
  }
  
  if (random < 0.7) {
    // 40% chance of few vulnerabilities
    vulnerabilities.push(
      {
        id: "1",
        dependency: "lodash",
        severity: "medium",
        cveId: "CVE-2021-23337",
        description: "Command injection vulnerability in lodash template",
        fixAvailable: true,
        fixVersion: "4.17.21"
      },
      {
        id: "2", 
        dependency: "axios",
        severity: "low",
        cveId: "CVE-2020-28168",
        description: "Server-side request forgery vulnerability",
        fixAvailable: true,
        fixVersion: "0.21.1"
      }
    );
  } else {
    // 30% chance of many vulnerabilities
    vulnerabilities.push(
      {
        id: "1",
        dependency: "express",
        severity: "critical",
        cveId: "CVE-2022-24999",
        description: "Remote code execution vulnerability in express framework",
        fixAvailable: true,
        fixVersion: "4.18.2"
      },
      {
        id: "2",
        dependency: "moment",
        severity: "high", 
        cveId: "CVE-2022-31129",
        description: "Regular expression denial of service vulnerability",
        fixAvailable: false
      },
      {
        id: "3",
        dependency: "underscore",
        severity: "medium",
        cveId: "CVE-2021-23358",
        description: "Arbitrary code execution via template injection",
        fixAvailable: true,
        fixVersion: "1.13.1"
      },
      {
        id: "4",
        dependency: "jquery",
        severity: "low",
        cveId: "CVE-2020-11022",
        description: "Cross-site scripting vulnerability in jQuery",
        fixAvailable: true,
        fixVersion: "3.5.0"
      },
      {
        id: "5",
        dependency: "node-fetch",
        severity: "high",
        cveId: "CVE-2022-0235",
        description: "Size limit bypass vulnerability leading to denial of service", 
        fixAvailable: true,
        fixVersion: "3.1.1"
      },
      {
        id: "6",
        dependency: "ws",
        severity: "medium",
        cveId: "CVE-2021-32640",
        description: "ReDoS vulnerability in Sec-Websocket-Protocol header",
        fixAvailable: true,
        fixVersion: "7.4.6"
      }
    );
  }
  
  return vulnerabilities;
};

export const analyzeFileContent = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Simulate analysis delay
      setTimeout(() => {
        resolve(content);
      }, 1500);
    };
    reader.readAsText(file);
  });
};

export const analyzeGithubRepo = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    // Simulate GitHub API call delay
    setTimeout(() => {
      resolve(`Analyzed GitHub repository: ${url}`);
    }, 2000);
  });
};