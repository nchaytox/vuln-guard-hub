import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getMe, updateMe, type UserProfile } from '@/services/userService';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setProfile(me);
        setDisplayName(me.display_name || '');
      } catch (e: any) {
        // keep page usable; show a toast for visibility
        toast({ title: 'Failed to load profile', description: String(e?.message || e), variant: 'destructive' });
      }
    })();
  }, [toast]);

  const onSave = async () => {
    if (password && password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    try {
      const payload: any = {};
      const trimmedDisplay = displayName.trim();
      const currentDisplay = profile?.display_name || '';
      if (trimmedDisplay !== currentDisplay) {
        payload.displayName = trimmedDisplay || null; // send null to clear
      }
      if (password) payload.password = password;

      if (Object.keys(payload).length === 0) {
        toast({ title: 'Nothing to update' });
        return;
      }

      setLoading(true);
      const updated = await updateMe(payload);
      setProfile(updated);
      setPassword('');
      setConfirm('');
      toast({ title: 'Profile updated' });
    } catch (e: any) {
      toast({ title: 'Update failed', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-20">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>View and update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Username (read-only)</label>
              <Input value={profile?.username || ''} readOnly aria-readonly="true" />
            </div>
           
            <div>
              <label className="block text-sm mb-1">Display name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <hr className="my-4" />
            <div>
              <label className="block text-sm mb-1">New password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••" />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirm password</label>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="••••••" />
            </div>
            <Button onClick={onSave} disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
