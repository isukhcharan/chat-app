import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Zap, Loader2, Users } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface InvitePreview {
  workspace: {
    id: string;
    name: string;
    slug: string;
    _count: { members: number };
  };
  email?: string;
  expiresAt?: string;
}

const INVITE_TOKEN_KEY = 'nexus_pending_invite';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get(`/invites/${token}`)
      .then((data: any) => setPreview(data))
      .catch((err: any) => setError(typeof err === 'string' ? err : 'Invalid invite link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    // Not logged in — store token and redirect to auth
    if (!user) {
      sessionStorage.setItem(INVITE_TOKEN_KEY, token);
      navigate('/auth');
      return;
    }

    setAccepting(true);
    setError(null);
    try {
      await api.post(`/invites/${token}/accept`);
      sessionStorage.removeItem(INVITE_TOKEN_KEY);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Nexus</span>
        </div>

        <div className="bg-base-800 border border-border rounded-xl p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 nexus-btn-ghost text-xs"
              >
                Go home
              </button>
            </div>
          ) : preview ? (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-3">
                  <Zap className="w-7 h-7 text-white" fill="white" />
                </div>
                <h1 className="text-base font-semibold mb-1">
                  You've been invited to
                </h1>
                <p className="text-lg font-bold text-text-primary">
                  {preview.workspace.name}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-2">
                  <Users className="w-3.5 h-3.5" />
                  {preview.workspace._count.members}{' '}
                  {preview.workspace._count.members === 1 ? 'member' : 'members'}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="nexus-btn-primary w-full"
              >
                {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
                {user ? 'Accept invite' : 'Sign in to join'}
              </button>

              {!user && (
                <p className="text-center text-xs text-text-muted mt-3">
                  You'll be redirected to sign in and then automatically joined to this workspace.
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
