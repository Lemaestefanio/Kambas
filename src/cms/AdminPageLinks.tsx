import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

export const PROFILE_PAGES = [
  { path: '/', title: 'Página principal', description: 'Perfil e feed com compra sem conta por predefinição. As experiências podem ser editadas em Versões A/B.' },
  { path: '/perfil-3', title: 'Checkout direto sem login', description: 'Acesso ao perfil com pagamento direto ao selecionar conteúdo bloqueado.' },
  { path: '/promo-3', title: 'Teaser e promoção VIP', description: 'Página de apresentação com a oferta promocional.' },
  { path: '/mensagens', title: 'Mensagens com vídeo teaser', description: 'Abre a conversa da criadora com o vídeo de apresentação.' },
] as const;

export function profilePageUrl(origin: string, path: string, creatorId: string): string | null {
  try {
    const base = new URL(origin);
    if (!['https:', 'http:'].includes(base.protocol) || !creatorId) return null;
    const url = new URL(path, base.origin);
    url.searchParams.set('creator', creatorId);
    return url.href;
  } catch { return null; }
}

export function AdminPageLinks({ creatorId, creatorName, isNew, hasChanges }: { creatorId: string; creatorName: string; isNew: boolean; hasChanges: boolean }) {
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copying, setCopying] = useState(false);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  useEffect(() => { setCopied(''); setCopyError(''); }, [creatorId]);

  const copy = async (url: string) => {
    setCopying(true); setCopied(''); setCopyError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('A cópia automática não está disponível. Seleciona o endereço abaixo e copia-o manualmente.');
      await navigator.clipboard.writeText(url);
      setCopied(url);
    } catch (cause) {
      setCopyError(cause instanceof Error && cause.message.startsWith('A cópia automática') ? cause.message : 'Não foi possível copiar automaticamente. Seleciona o endereço e copia-o manualmente.');
    } finally { setCopying(false); }
  };

  if (isNew) return <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">Guarda este perfil antes de partilhar os seus links.</p>;
  if (!profilePageUrl(origin, '/', creatorId)) return <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">Os links de partilha ficam disponíveis quando o site estiver aberto num endereço web. Esta pré-visualização em ficheiro não tem um endereço público.</p>;
  return <div className="space-y-4">
    <p className="text-sm leading-relaxed text-slate-400">Cada link abre diretamente o perfil de {creatorName}. Usa o endereço do site publicado para partilhar nas redes sociais.</p>
    {hasChanges && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">Os links mostram a versão guardada. Guarda o perfil para publicar as alterações atuais.</p>}
    {copyError && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{copyError}</p>}
    {PROFILE_PAGES.map((page, index) => {
      const url = profilePageUrl(origin, page.path, creatorId)!;
      return <section key={page.path} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <h3 className="text-sm font-semibold text-pink-200">{index + 1}. {page.title}</h3>
        <p className="text-xs leading-relaxed text-slate-400">{page.description}</p>
        <input aria-label={`Link: ${page.title}`} readOnly value={url} onFocus={(event) => event.target.select()} className="w-full min-w-0 rounded-lg border border-white/15 bg-[#11131d] px-3 py-2.5 text-xs text-slate-200" />
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={copying} onClick={() => void copy(url)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-white hover:bg-white/10 disabled:opacity-40">{copied === url ? <Check size={15} /> : <Copy size={15} />}{copied === url ? 'Copiado!' : 'Copiar link'}</button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 text-xs text-pink-200 hover:underline"><ExternalLink size={15} /> Abrir página</a>
        </div>
      </section>;
    })}
    <p role="status" className="sr-only">{copied ? 'Link copiado com sucesso.' : ''}</p>
  </div>;
}

