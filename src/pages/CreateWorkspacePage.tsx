import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateWorkspacePage() {
  const navigate = useNavigate();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ws: any = await api.post('/workspaces', {
        name: name.trim(),
        slug: slug || undefined,
      });
      await refreshWorkspaces();
      switchWorkspace(ws);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Failed to create workspace');
    } finally {
      setLoading(false);
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
          <h1 className="text-base font-semibold mb-1">Create your workspace</h1>
          <p className="text-xs text-text-muted mb-5">
            A workspace is where your team communicates. Give it a name to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Workspace name
              </label>
              <input
                autoFocus
                className="nexus-input"
                placeholder="Acme Inc."
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                URL slug
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted flex-shrink-0">nexus.app/</span>
                <input
                  className="nexus-input flex-1"
                  placeholder="acme-inc"
                  value={slug}
                  onChange={(e) => {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '')
                        .replace(/-+/g, '-'),
                    );
                    setSlugEdited(true);
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="nexus-btn-primary w-full"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create workspace
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
