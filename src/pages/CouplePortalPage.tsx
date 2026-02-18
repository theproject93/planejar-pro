import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ImagePlus, Loader2, MessageCircleHeart, Send, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type PortalEvent = {
  event_id: string;
  event_name: string;
  event_date: string;
  location: string | null;
  couple: string | null;
};

type CouplePost = {
  id: string;
  event_id: string;
  kind: 'info' | 'milestone' | 'celebration';
  title: string;
  message: string;
  photo_url: string | null;
  author_role: 'assessoria' | 'noivos';
  author_name: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<CouplePost['author_role'], string> = {
  assessoria: 'Assessoria',
  noivos: 'Noivos',
};

const ROLE_STYLE: Record<CouplePost['author_role'], string> = {
  assessoria: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  noivos: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function CouplePortalPage() {
  const { token } = useParams<{ token: string }>();
  const [eventInfo, setEventInfo] = useState<PortalEvent | null>(null);
  const [posts, setPosts] = useState<CouplePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const displayEventName = useMemo(() => {
    if (!eventInfo) return '';
    return eventInfo.couple?.trim() || eventInfo.event_name;
  }, [eventInfo]);

  const loadPortal = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const [eventRes, postsRes] = await Promise.all([
      supabase
        .rpc('get_couple_portal_event_by_token', { p_token: token })
        .single(),
      supabase.rpc('get_couple_updates_by_token', { p_token: token }),
    ]);

    if (eventRes.error || !eventRes.data) {
      setError('Link dos noivos invalido ou expirado.');
      setLoading(false);
      return;
    }

    setEventInfo(eventRes.data as PortalEvent);
    setPosts((postsRes.data as CouplePost[]) ?? []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  async function uploadPhoto(file: File) {
    if (!token) return null;
    setUploading(true);
    setError(null);
    try {
      const extension = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${token}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const uploadRes = await supabase.storage
        .from('couple-updates')
        .upload(fileName, file, {
          upsert: false,
          contentType: file.type,
        });
      if (uploadRes.error) throw uploadRes.error;

      const { data: publicData } = supabase.storage
        .from('couple-updates')
        .getPublicUrl(fileName);

      return publicData.publicUrl;
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Falha no upload da foto.'
      );
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function publishPost() {
    if (!token || saving) return;
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile);
      if (!photoUrl) {
        setSaving(false);
        return;
      }
    }

    const res = await supabase.rpc('create_couple_update_by_token', {
      p_token: token,
      p_title: title.trim() || null,
      p_message: cleanMessage,
      p_photo_url: photoUrl,
      p_author_name: authorName.trim() || null,
    });

    if (res.error) {
      setError(res.error.message || 'Nao foi possivel publicar agora.');
      setSaving(false);
      return;
    }

    setTitle('');
    setMessage('');
    setPhotoFile(null);
    setSuccess('Publicacao enviada com sucesso.');
    setSaving(false);
    await loadPortal();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-blue-50 px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md w-full">
          <p className="text-lg font-semibold text-gray-900">Portal indisponivel</p>
          <p className="text-sm text-gray-600 mt-2">
            Este link nao esta ativo. Solicite um novo link para a assessoria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-rose-600 font-semibold">
            <Sparkles className="w-4 h-4" />
            Modo Tranquilidade
          </div>
          <h1 className="text-3xl font-bold mt-2">{displayEventName}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Acompanhem os preparativos e conversem com a assessoria em tempo real.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            {new Date(eventInfo.event_date).toLocaleDateString('pt-BR')} •{' '}
            {eventInfo.location || 'Local a definir'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-4">
            <MessageCircleHeart className="w-5 h-5 text-rose-500" />
            Compartilhar atualizacao
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Seu nome (opcional)"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Titulo (opcional)"
            />
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Escrevam aqui como estao se sentindo, ideias e observacoes dos preparativos..."
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
              <ImagePlus className="w-4 h-4" />
              {photoFile ? 'Trocar foto' : 'Adicionar foto'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {photoFile ? (
              <span className="text-xs text-gray-500">{photoFile.name}</span>
            ) : (
              <span className="text-xs text-gray-400">Sem foto selecionada</span>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}

          <button
            type="button"
            onClick={() => void publishPost()}
            disabled={saving || uploading || !message.trim()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {saving || uploading ? 'Publicando...' : 'Publicar no mural'}
          </button>
        </div>

        <div className="space-y-4">
          {posts.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">
              Ainda sem publicacoes. Quando voces ou a assessoria enviarem updates,
              tudo aparece aqui.
            </div>
          )}

          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{post.title}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(post.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-semibold ${
                    ROLE_STYLE[post.author_role]
                  }`}
                >
                  {post.author_name?.trim() || ROLE_LABEL[post.author_role]}
                </span>
              </div>

              <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{post.message}</p>

              {post.photo_url ? (
                <img
                  src={post.photo_url}
                  alt={post.title}
                  className="mt-4 w-full rounded-xl border border-gray-100 object-cover max-h-[440px]"
                />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

