import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, FileText, HelpCircle, LoaderCircle, LogOut, Plus, Save, Search, Settings, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Creator } from '../types';
import type { SiteSettings } from '../cms/types';
import { CREATORS } from '../data/content';
import { COPY_FIELDS, DEFAULT_SITE_SETTINGS } from '../cms/defaults';
import { useSiteContent } from '../cms/SiteContent';
import { AdminPageLinks } from '../cms/AdminPageLinks';
import { CommentsEditor } from '../cms/CommentsEditor';
import { BANK_FIELDS, FAQ_FIELD, PROFILE_SECTIONS, StructuredField, StructuredFields, itemId } from '../cms/editor';
import { validateManagedComments } from '../utils/managedComments';
import { safeActionUrl } from '../utils/actionLinks';
import { deleteCreatorFromFirestore, onAdminAuthChange, publishInitialContent, saveCreatorToFirestore, saveSiteSettings, signInWithGoogle, signOutUser, uploadAdminMedia } from '../firebase';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  creators: Creator[];
  onUpdateCreator: (creator: Creator) => void;
  onAddCreator?: (creator: Creator) => void;
  onDeleteCreator?: (id: string) => void;
  activeCreatorId: string;
}

const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400 disabled:cursor-not-allowed disabled:opacity-40';
const primaryClass = `${buttonClass} border-pink-500 bg-pink-600 text-white shadow-lg shadow-pink-950/20 hover:bg-pink-500`;
const adminTabs = [
  { id: 'profiles', label: 'Perfis e conteúdos', icon: Users },
  { id: 'copy', label: 'Textos da página', icon: FileText },
  { id: 'faqs', label: 'Perguntas frequentes', icon: HelpCircle },
  { id: 'bank', label: 'Pagamentos', icon: CreditCard },
  { id: 'setup', label: 'Publicação inicial', icon: Settings },
] as const;
const actionLabels: Record<string, string> = { subscribe: 'Subscrever', message: 'Mensagem', tip: 'Gorjeta', signup: 'Criar conta', login: 'Entrar', explore: 'Explorar', notifications: 'Notificações' };
const clone = <T,>(value: T): T => structuredClone(value);

function newCreator(): Creator {
  return {
    id: `creator-${itemId()}`, name: 'Novo perfil', shortName: 'Novo perfil', handle: '@novoperfil', age: 18,
    city: '', neighborhood: '', verified: false, isOnline: false, avatar: '', banner: '', bio: '',
    stats: { photos: 0, videos: 0, likes: '0' }, postCount: 0, mediaCount: 0,
    highlights: [], galleryPhotos: [], voiceNotes: [], posts: [], plans: [], incomingMessage: '', whatsappNumber: '',
    preferInternalCheckout: true, videoPaywallSeconds: 4.5,
  };
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose, creators, onUpdateCreator, onAddCreator, onDeleteCreator, activeCreatorId }) => {
  const { settings, error: contentError, loading: contentLoading } = useSiteContent();
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<'profiles' | 'copy' | 'faqs' | 'bank' | 'setup'>('profiles');
  const [section, setSection] = useState('profile');
  const [draft, setDraft] = useState<Creator | null>(null);
  const [newProfile, setNewProfile] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(() => clone(settings));
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [copySection, setCopySection] = useState('all');
  const [profileSearch, setProfileSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState<'all' | 'online' | 'offline'>('all');

  useEffect(() => onAdminAuthChange((allowed, account) => {
    setIsAdmin(allowed); setUser(account); setAuthLoading(false);
  }), []);

  // Remote updates never replace an unsaved editing session.
  useEffect(() => {
    if (!profileDirty && !newProfile) {
      const current = creators.find((creator) => creator.id === draft?.id)
        || creators.find((creator) => creator.id === activeCreatorId) || creators[0];
      setDraft(current ? clone(current) : null);
    }
  }, [creators, activeCreatorId, profileDirty, newProfile]);
  useEffect(() => { if (!settingsDirty) setSettingsDraft(clone(settings)); }, [settings, settingsDirty]);
  useEffect(() => {
    if (!profileDirty && !settingsDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [profileDirty, settingsDirty]);

  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setSuccess('');
    try { await operation(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível guardar. O rascunho foi mantido; tenta novamente.'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const upload = async (file: File, accept: (url: string) => void) => run(async () => {
    const url = await uploadAdminMedia(file);
    accept(url);
    setSuccess('Ficheiro enviado. Guarda as alterações para o apresentar na página.');
  });

  const updateDraft = (next: Creator) => { setDraft(next); setProfileDirty(true); setSuccess(''); };
  const updateSettings = (next: SiteSettings) => { setSettingsDraft(next); setSettingsDirty(true); setSuccess(''); };
  const confirmProfileChange = () => !profileDirty || window.confirm('Este perfil tem alterações por guardar. Queres descartá-las?');
  const chooseProfile = (id: string) => {
    if (!confirmProfileChange()) return;
    const found = creators.find((creator) => creator.id === id);
    if (found) { setDraft(clone(found)); setNewProfile(false); setProfileDirty(false); setError(''); setSuccess(''); }
  };
  const close = () => {
    if (busy) return;
    if ((profileDirty || settingsDirty) && !window.confirm('Há alterações por guardar. Queres fechar o painel? O rascunho fica disponível enquanto esta página estiver aberta.')) return;
    onClose();
  };

  const saveProfile = () => run(async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.shortName.trim() || !draft.handle.trim()) throw new Error('Preenche o nome, o nome curto e o nome de utilizador.');
    if (!Number.isFinite(draft.age) || draft.age < 18) throw new Error('A idade do perfil tem de ser igual ou superior a 18 anos.');
    if (draft.plans.length === 0) throw new Error('Adiciona pelo menos um plano antes de publicar o perfil.');
    const commentsError = validateManagedComments(draft.managedComments, draft.posts);
    if (commentsError) throw new Error(commentsError);
    for (const [key, value] of Object.entries(draft.actionLinks || {})) {
      if (typeof value !== 'string' || (value.trim() && !safeActionUrl(value))) throw new Error(`O link de “${actionLabels[key] || key}” é inválido. Usa https:// ou um caminho interno que comece por /.`);
    }
    const saved = clone(draft);
    const wasNew = newProfile;
    const result = await saveCreatorToFirestore(saved);
    if (result === false) throw new Error('O banco de dados não confirmou a gravação. As alterações continuam no rascunho.');
    if (wasNew) onAddCreator?.(saved); else onUpdateCreator(saved);
    setProfileDirty(false); setNewProfile(false);
    setSuccess('Perfil guardado no banco de dados.');
  });

  const saveSettings = () => run(async () => {
    if (settingsDraft.faqs.some((faq) => !faq.question.trim() || !faq.answer.trim())) throw new Error('Completa a pergunta e a resposta em todas as perguntas frequentes.');
    await saveSiteSettings(clone(settingsDraft));
    setSettingsDirty(false);
    setSuccess('Conteúdo da página guardado no banco de dados.');
  });

  const removeProfile = () => {
    if (!draft || newProfile || creators.length <= 1 || !window.confirm(`Eliminar o perfil “${draft.name}” da página? Esta alteração é guardada no banco de dados.`)) return;
    const id = draft.id;
    void run(async () => {
      await deleteCreatorFromFirestore(id);
      onDeleteCreator?.(id);
      setDraft(clone(creators.find((creator) => creator.id !== id)!));
      setProfileDirty(false);
      setSuccess('Perfil eliminado do banco de dados.');
    });
  };

  if (!isOpen) return null;
  const copyEntries = Object.entries(COPY_FIELDS) as Array<[string, { label: string; section: string; value: string }]>;
  const copySections = [...new Set(copyEntries.map(([, field]) => field.section))];
  const matchingCopy = copyEntries.filter(([key, field]) => (copySection === 'all' || field.section === copySection) && `${field.label} ${field.section} ${settingsDraft.copy[key] ?? field.value}`.toLocaleLowerCase('pt').includes(search.toLocaleLowerCase('pt')));
  const normalizedProfileSearch = profileSearch.trim().toLocaleLowerCase('pt');
  const matchingProfiles = creators.filter((creator) => `${creator.name} ${creator.handle} ${creator.city}`.toLocaleLowerCase('pt').includes(normalizedProfileSearch)
    && (profileFilter === 'all' || (profileFilter === 'online' ? creator.isOnline : !creator.isOnline)));
  const activeSection = PROFILE_SECTIONS[section] || PROFILE_SECTIONS.profile;
  const editingSettings = tab === 'copy' || tab === 'faqs' || tab === 'bank';
  const currentDirty = tab === 'profiles' ? profileDirty : editingSettings ? settingsDirty : profileDirty || settingsDirty;

  return <div role="dialog" aria-modal="true" aria-label="Painel administrativo" className="fixed inset-0 z-[10000] bg-black/85 p-0 text-white backdrop-blur-sm sm:p-4">
    <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden border border-white/10 bg-[#0b0d16] shadow-2xl sm:rounded-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0e101a] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0 rounded-xl border border-white/10 bg-black px-3 py-1.5"><img src="/assets/platform-logo.png" alt="Luanda Privé" width="140" height="47" className="h-[40px] w-[120px] object-contain sm:h-[47px] sm:w-[140px]" /></div>
          <div className="hidden min-w-0 sm:block"><h1 className="text-lg font-semibold tracking-tight">Painel de gestão</h1><p className="mt-0.5 text-xs text-slate-400">Perfis, conteúdos e pagamentos num só lugar</p></div>
        </div>
        <div className="flex items-center gap-2">
          {user && <button type="button" disabled={busy} onClick={() => void run(async () => { await signOutUser(); })} className={buttonClass} aria-label="Terminar sessão" title="Terminar sessão"><LogOut size={16} /><span className="hidden sm:inline">Sair</span></button>}
          <button type="button" onClick={close} disabled={busy} aria-label="Fechar painel" className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40"><X size={22} /></button>
        </div>
      </header>

      {!isAdmin ? <main className="flex flex-1 items-center justify-center overflow-auto p-6">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-7 text-center">
          <ShieldCheck size={38} className="mx-auto text-pink-400" /><h2 className="text-xl font-semibold">Acesso administrativo</h2>
          {authLoading ? <p className="flex items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle size={17} className="animate-spin" /> A verificar a sessão…</p>
            : <><p className="text-sm leading-relaxed text-slate-300">Entra com a conta Google autorizada a gerir o portal.</p>
              {user && <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-200">A conta {user.email || user.displayName || 'atual'} não tem permissão de administrador. A autorização deve ser configurada no Firebase por quem gere o projeto.</p>}
              <button type="button" disabled={busy} className={`${primaryClass} w-full`} onClick={() => void run(async () => { await signInWithGoogle(); })}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {user ? 'Entrar com outra conta Google' : 'Entrar com Google'}</button>
            </>}
          {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
          <p className="text-xs leading-relaxed text-slate-500">É necessária uma ligação à internet e a configuração do domínio do site no Firebase Authentication.</p>
        </div>
      </main> : <>
        <nav aria-label="Secções administrativas" className="shrink-0 border-b border-white/10 bg-white/[0.015] px-4 py-3 sm:px-6">
          <label className="block text-xs font-medium text-slate-400 sm:hidden">Área de gestão<select value={tab} disabled={busy} onChange={(event) => setTab(event.target.value as typeof tab)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#11131d] px-3 py-2.5 text-sm text-white">{adminTabs.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>
          <div className="hidden gap-1 overflow-x-auto sm:flex">{adminTabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} disabled={busy} onClick={() => setTab(id)} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400 ${tab === id ? 'bg-pink-500/15 text-pink-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}><Icon size={16} />{label}</button>)}</div>
        </nav>
        <div className="shrink-0 space-y-2 px-4 pt-3 sm:px-6" aria-live="polite">
          {contentError && <p role="alert" className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Não foi possível carregar o conteúdo remoto: {contentError}</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          {success && <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{success}</p>}
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><fieldset disabled={busy} className="min-w-0">
          {tab === 'profiles' && <div className="grid items-start gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Os teus perfis</h2><span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">{creators.length}</span></div>
              <div className="space-y-2">
                <label className="relative block"><Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-500" /><input aria-label="Pesquisar perfis por nome, utilizador ou cidade" type="search" value={profileSearch} onChange={(event) => setProfileSearch(event.target.value)} placeholder="Pesquisar perfil…" className="w-full rounded-xl border border-white/10 bg-[#0b0d16] py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-pink-400 focus:outline-none" /></label>
                <select aria-label="Filtrar perfis por estado" value={profileFilter} onChange={(event) => setProfileFilter(event.target.value as typeof profileFilter)} className="w-full rounded-xl border border-white/10 bg-[#0b0d16] px-3 py-2 text-xs text-slate-300"><option value="all">Todos os perfis</option><option value="online">Estado online</option><option value="offline">Estado offline</option></select>
              </div>
              <p className="text-xs text-slate-500" aria-live="polite">{matchingProfiles.length} de {creators.length} perfis</p>
              <div role="group" aria-label="Criadoras" className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 md:max-h-[400px]">
                {matchingProfiles.map((creator) => <button key={creator.id} type="button" aria-pressed={!newProfile && draft?.id === creator.id} onClick={() => { if (draft?.id !== creator.id) chooseProfile(creator.id); }} className={`flex min-w-0 items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${!newProfile && draft?.id === creator.id ? 'border-pink-400/60 bg-pink-500/10' : 'border-transparent hover:border-white/10 hover:bg-white/5'}`}>
                  {creator.avatar ? <img src={creator.avatar} alt="" loading="lazy" decoding="async" width="40" height="40" className="h-10 w-10 shrink-0 rounded-full bg-white/5 object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-sm font-semibold text-pink-200">{creator.name.slice(0, 1)}</span>}
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{creator.name}</span><span className="block truncate text-xs text-slate-400">{creator.handle}</span></span>
                  {creator.isOnline && <span aria-label="Estado online" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
                </button>)}
                {matchingProfiles.length === 0 && <p className="px-2 py-4 text-center text-xs leading-relaxed text-slate-400">Nenhum perfil encontrado. Experimenta outro nome ou filtro.</p>}
                {newProfile && draft && <div className="flex items-center gap-2 rounded-xl border border-pink-400/60 bg-pink-500/10 p-3 text-sm text-pink-100"><Plus size={16} /><span className="min-w-0 truncate">{draft.name} · rascunho</span></div>}
              </div>
              <button type="button" className={`${buttonClass} w-full`} onClick={() => { if (confirmProfileChange()) { setDraft(newCreator()); setNewProfile(true); setProfileDirty(true); setSection('profile'); setError(''); setSuccess(''); } }}><Plus size={16} /> Criar perfil</button>
            </aside>
            <section className="min-w-0 space-y-5">
              {draft ? <>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/[0.08] to-transparent p-4 sm:p-5">
                  <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-500/10 text-lg font-semibold text-pink-200">{draft.avatar ? <img src={draft.avatar} alt="" width="48" height="48" decoding="async" className="h-full w-full object-cover" /> : draft.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-semibold">{draft.name}</h2><p className="mt-0.5 truncate text-xs text-slate-400">{draft.handle}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${newProfile ? 'bg-amber-500/10 text-amber-200' : 'bg-emerald-500/10 text-emerald-200'}`}>{newProfile ? 'Rascunho' : 'Publicado'}</span></div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">{newProfile ? 'Preenche o perfil e um plano. Só fica visível depois de guardares.' : 'Escolhe uma secção, edita o conteúdo e guarda no fim.'}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">{[[draft.posts.length, 'Publicações'], [draft.galleryPhotos.length, 'Fotos na galeria'], [draft.plans.length, 'Planos']].map(([count, label]) => <div key={label} className="rounded-xl bg-black/15 px-3 py-2"><span className="block text-lg font-semibold">{count}</span><span className="text-[11px] text-slate-400">{label}</span></div>)}</div>
                </div>
                <nav aria-label="Abas do perfil">
                  <label className="block text-xs font-medium text-slate-400 lg:hidden">O que queres editar?<select aria-label="Secção do perfil" value={section} onChange={(event) => setSection(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#11131d] px-3 py-3 text-sm text-white">{Object.entries(PROFILE_SECTIONS).map(([id, config]) => <option key={id} value={id}>{config.label}</option>)}</select></label>
                  <div className="hidden grid-cols-3 gap-2 lg:grid">{Object.entries(PROFILE_SECTIONS).map(([id, config]) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)} className={`min-w-0 rounded-xl border px-3 py-2.5 text-left text-xs font-medium leading-relaxed transition-colors ${section === id ? 'border-pink-400/50 bg-pink-500/15 text-pink-100' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{config.label}</button>)}</div>
                </nav>
                <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.015] p-4 sm:p-5">
                  <div className="border-b border-white/10 pb-4"><h3 className="text-lg font-semibold">{activeSection.label}</h3>{activeSection.hint && <p className="mt-2 text-xs leading-relaxed text-slate-400">{activeSection.hint}</p>}</div>
                  {section === 'comments' ? <CommentsEditor creator={draft} onChange={updateDraft} disabled={busy} /> : <>
                    {section === 'links' && <AdminPageLinks creatorId={draft.id} creatorName={draft.name} isNew={newProfile} hasChanges={profileDirty} />}
                    <StructuredFields fields={activeSection.fields} value={draft} onChange={updateDraft} onUpload={upload} path="profile" />
                  </>}
                </div>
                {!newProfile && section === 'profile' && <div className="border-t border-white/10 pt-5"><button type="button" disabled={creators.length <= 1} onClick={removeProfile} className={`${buttonClass} text-rose-300`}><Trash2 size={16} /> Eliminar perfil</button>{creators.length <= 1 && <p className="mt-2 text-xs text-slate-500">Mantém pelo menos um perfil na página.</p>}</div>}
              </> : <p className="text-sm text-slate-400">Cria um perfil ou publica o conteúdo original na secção “Publicação inicial”.</p>}
            </section>
          </div>}
          {tab === 'copy' && <section className="space-y-5">
            <div><h2 className="text-xl font-semibold">Textos da página</h2><p className="mt-1 text-sm text-slate-400">Edita títulos, botões, mensagens e avisos. Mantém os marcadores entre chavetas para inserir os dados do perfil.</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Pesquisar textos" placeholder="Pesquisar um texto…" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border border-white/15 bg-[#11131d] p-3 text-sm" /><select aria-label="Filtrar secção" value={copySection} onChange={(event) => setCopySection(event.target.value)} className="rounded-lg border border-white/15 bg-[#11131d] p-3 text-sm"><option value="all">Todas as secções</option>{copySections.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
            {matchingCopy.length === 0 && <p className="text-sm text-slate-400">Nenhum texto encontrado.</p>}
            {matchingCopy.map(([key, field]) => <div key={key} className="rounded-xl border border-white/10 p-4"><p className="mb-2 text-xs text-pink-300">{field.section}</p><StructuredField field={{ label: field.label, kind: 'long' }} value={settingsDraft.copy[key] ?? field.value} onChange={(value) => updateSettings({ ...settingsDraft, copy: { ...settingsDraft.copy, [key]: value } })} onUpload={upload} path={`copy-${key}`} /></div>)}
          </section>}
          {tab === 'faqs' && <section className="mx-auto max-w-3xl space-y-5"><h2 className="text-xl font-semibold">Perguntas frequentes</h2><StructuredField field={FAQ_FIELD} value={settingsDraft.faqs} onChange={(faqs) => updateSettings({ ...settingsDraft, faqs })} onUpload={upload} path="faqs" /></section>}
          {tab === 'bank' && <section className="mx-auto max-w-3xl space-y-5"><div><h2 className="text-xl font-semibold">Dados de pagamento</h2><p className="mt-1 text-sm leading-relaxed text-slate-400">Estes dados são apresentados aos visitantes no pagamento. Confirma-os antes de guardar. A confirmação bancária de pagamentos exige integração própria.</p></div><StructuredFields fields={BANK_FIELDS} value={settingsDraft.bankDetails} onChange={(bankDetails) => updateSettings({ ...settingsDraft, bankDetails })} onUpload={upload} path="bank" /></section>}
          {tab === 'setup' && <section className="mx-auto max-w-2xl space-y-5 rounded-xl border border-white/10 p-6"><h2 className="text-xl font-semibold">Publicar o conteúdo original</h2><p className="text-sm leading-relaxed text-slate-300">Esta ação adiciona ao banco de dados os perfis originais que ainda não existem e publica os textos iniciais se não houver uma configuração guardada.</p><p className="text-sm leading-relaxed text-slate-400">Os documentos que já existem são preservados. Perfis originais eliminados anteriormente voltam a ser adicionados; usa esta ação apenas quando quiseres recuperar esse conteúdo.</p><button type="button" className={primaryClass} onClick={() => { if (window.confirm('Adicionar os perfis originais que faltam e os textos iniciais, preservando os documentos existentes?')) void run(async () => { await publishInitialContent(clone(CREATORS), clone(DEFAULT_SITE_SETTINGS)); setSuccess('Publicação inicial concluída. Os documentos que já existiam foram preservados.'); }); }}><Save size={16} /> Publicar conteúdo original</button></section>}
        </fieldset></main>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#10121d] px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1"><p role="status" className={`flex items-center gap-2 text-xs font-medium ${currentDirty ? 'text-amber-200' : 'text-slate-300'}`}>{busy ? <LoaderCircle size={15} className="shrink-0 animate-spin" /> : currentDirty ? <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" /> : <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />}{busy ? 'A guardar / enviar ficheiro…' : contentLoading ? 'A carregar o conteúdo…' : currentDirty ? 'Alterações por guardar' : 'Tudo guardado'}</p><p className="mt-1 truncate text-[11px] text-slate-500">{tab === 'profiles' ? draft?.name || 'Seleciona um perfil' : editingSettings ? 'Conteúdo partilhado por todos os perfis' : 'Configuração da publicação'}</p></div>
          {tab === 'profiles' && settingsDirty && <button type="button" disabled={busy} onClick={() => setTab('copy')} className="text-xs text-amber-200 underline underline-offset-4">Textos por guardar</button>}
          {tab !== 'profiles' && profileDirty && <button type="button" disabled={busy} onClick={() => setTab('profiles')} className="text-xs text-amber-200 underline underline-offset-4">Perfil por guardar</button>}
          {tab === 'setup' && settingsDirty && <button type="button" disabled={busy} onClick={() => setTab('copy')} className="text-xs text-amber-200 underline underline-offset-4">Textos por guardar</button>}
          {tab === 'profiles' && <button type="button" disabled={busy || !draft || !profileDirty} className={primaryClass} onClick={() => void saveProfile()}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Guardar perfil</button>}
          {editingSettings && <button type="button" disabled={busy || !settingsDirty} className={primaryClass} onClick={() => void saveSettings()}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Guardar página</button>}
        </footer>
      </>}
    </div>
  </div>;
};

