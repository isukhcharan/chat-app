import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { SocketProvider } from '@/contexts/SocketContext';
import AuthPage from '@/components/auth/AuthPage';
import ChatPage from '@/pages/ChatPage';
import CreateWorkspacePage from '@/pages/CreateWorkspacePage';
import InvitePage from '@/pages/InvitePage';

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <WorkspaceProvider>
      <Outlet />
    </WorkspaceProvider>
  );
}

function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { currentWorkspace, loading } = useWorkspace();
  if (loading) return null;
  if (!currentWorkspace) return <Navigate to="/workspaces/new" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route path="/invite/:token" element={<InvitePage />} />

      {/* All protected routes share WorkspaceProvider */}
      <Route element={<ProtectedLayout />}>
        <Route path="/workspaces/new" element={<CreateWorkspacePage />} />
        <Route
          path="/"
          element={
            <SocketProvider>
              <WorkspaceGuard>
                <ChatPage />
              </WorkspaceGuard>
            </SocketProvider>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
