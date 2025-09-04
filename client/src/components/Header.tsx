import { Shield, Github, LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

export const Header = () => {
  const navigate = useNavigate();
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    navigate('/login');
  };
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-primary rounded-lg p-2">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">VulnTrack</h1>
            <p className="text-sm text-muted-foreground">Dependency Vulnerability Scanner</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          {hasToken && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/scans">
                <Clock className="h-4 w-4 mr-2" />
                My Scans
              </Link>
            </Button>
          )}
          {hasToken && (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
