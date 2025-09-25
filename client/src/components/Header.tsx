import { Shield, Github, LogOut, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMe } from "@/services/userService";

export const Header = () => {
  const navigate = useNavigate();
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!hasToken) { setUsername(null); return; }
      try {
        const me = await getMe();
        if (mounted) setUsername(me?.username || null);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [hasToken]);

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    navigate('/login');
  };
  return (
    <header className="border-b border-border bg-card fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 cursor-pointer select-none">
          <div className="bg-gradient-primary rounded-lg p-2">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">VulnTrack</h1>
            <p className="text-sm text-muted-foreground">Dependency Vulnerability Scanner</p>
          </div>
        </Link>
        
        <div className="flex items-center space-x-2">
          {hasToken && username && (
            <span className="text-sm text-muted-foreground mr-2">Signed in as <b>{username}</b></span>
          )}
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          {hasToken && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/risk-dashboard">
                  <Activity className="h-4 w-4 mr-2" />
                  Risk Dashboard
                </Link>
              </Button>
              
              <Button variant="outline" size="sm" asChild>
                <Link to="/scans">
                  <Clock className="h-4 w-4 mr-2" />
                  My Scans
                </Link>
              </Button>
              
              <Button variant="outline" size="sm" asChild>
                <Link to="/profile">Profile</Link>
              </Button>
            </>
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
