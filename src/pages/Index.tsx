import { useAuth, AuthProvider } from '@/hooks/useAuth';
import CareTrackApp from '@/components/caretrack/CareTrackApp';
import Auth from '@/pages/Auth';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) return <Auth />;
  return <CareTrackApp />;
}

const Index = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default Index;
