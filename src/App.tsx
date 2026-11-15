import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import AppShell from '@/components/AppShell';
import Dashboard from '@/pages/Dashboard';
import MyChitties from '@/pages/MyChitties';
import ChittyDetail from '@/pages/ChittyDetail';
import Reports from '@/pages/Reports';
import Profile from '@/pages/Profile';
import CreateChittyModal from '@/components/CreateChittyModal';
import AuthScreen from '@/auth/AuthScreen';
import MemberViewPage from '@/pages/MemberViewPage';
import { Loader2 } from 'lucide-react';
import type { PageId } from '@/nav';

function getMemberToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/m\/([0-9a-fA-F-]{36})$/);
  if (match) return match[1];
  const params = new URLSearchParams(window.location.search);
  return params.get('member');
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState<PageId>('dashboard');
  const [activeChittyId, setActiveChittyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [memberToken, setMemberToken] = useState<string | null>(null);

  useEffect(() => {
    const token = getMemberToken();
    if (token) setMemberToken(token);
  }, []);

  const handleNavigate = (next: PageId) => {
    if (next !== 'chitty-detail') {
      setActiveChittyId(null);
    }
    setPage(next);
  };

  const handleSignOut = async () => {
    await signOut();
    setPage('dashboard');
  };

  const openCreate = () => setCreateOpen(true);
  const closeCreate = () => setCreateOpen(false);
  const handleCreated = () => {
    setCreateOpen(false);
    setRefreshKey((k) => k + 1);
    setPage('chitties');
  };

  const openChitty = (id: string) => {
    setActiveChittyId(id);
    setPage('chitty-detail');
  };

  const handleChittyUpdated = () => setRefreshKey((k) => k + 1);

  // Member personal link view — bypasses auth, read-only
  if (memberToken) {
    return (
      <ThemeProvider>
        <MemberViewPage token={memberToken} />
      </ThemeProvider>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <AppShell current={page} onNavigate={handleNavigate} onSignOut={handleSignOut}>
        {page === 'dashboard' && (
          <Dashboard
            onCreateChitty={openCreate}
            onOpenChitty={openChitty}
            refreshKey={refreshKey}
          />
        )}
        {page === 'chitties' && (
          <MyChitties
            onCreateChitty={openCreate}
            onOpenChitty={openChitty}
            refreshKey={refreshKey}
          />
        )}
        {page === 'chitty-detail' && activeChittyId && (
          <ChittyDetail
            chittyId={activeChittyId}
            onBack={() => setPage('chitties')}
            onUpdated={handleChittyUpdated}
          />
        )}
        {page === 'reports' && <Reports />}
        {page === 'profile' && <Profile />}
      </AppShell>
      <CreateChittyModal open={createOpen} onClose={closeCreate} onCreated={handleCreated} />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
