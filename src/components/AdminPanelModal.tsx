import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, LogOut, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Creator } from '../types';
import type { SiteSettings } from '../cms/types';
import { CREATORS } from '../data/content';
import { COPY_FIELDS, DEFAULT_SITE_SETTINGS } from '../cms/defaults';
import { useSiteContent } from '../cms/SiteContent';
import { AdminPageLinks } from '../cms/AdminPageLinks';
import { BANK_FIELDS, FAQ_FIELD, PROFILE_SECTIONS, StructuredField, StructuredFields, itemId } from '../cms/editor';
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

const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';
const primaryClass = `${buttonClass} border-pink-500 bg-pink-600 text-white hover:bg-pink-500`;
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

  return <div role="dialog" aria-modal="true" aria-label="Painel administrativo" className="fixed inset-0 z-[10000] bg-black/85 p-2 text-white backdrop-blur-sm sm:p-5">
    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d16] shadow-2xl">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div><h1 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={21} className="text-pink-400" /> Administração</h1><p className="mt-1 text-xs text-slate-400">Conteúdo da página inicial</p></div>
        <div className="flex items-center gap-2">
          {user && <button type="button" disabled={busy} onClick={() => void run(async () => { await signOutUser(); })} className={buttonClass} title="Terminar sessão"><LogOut size={16} /><span className="hidden sm:inline">Sair</span></button>}
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
        <nav aria-label="Secções administrativas" className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
          {([['profiles', 'Perfis e média'], ['copy', 'Textos da página'], ['faqs', 'Perguntas frequentes'], ['bank', 'Dados de pagamento'], ['setup', 'Publicação inicial']] as const).map(([id, label]) => <button key={id} type="button" disabled={busy} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${tab === id ? 'bg-pink-500/15 text-pink-200' : 'text-slate-400 hover:bg-white/5'}`}>{label}</button>)}
        </nav>
        <div className="shrink-0 space-y-2 px-5 pt-3" aria-live="polite">
          {contentError && <p role="alert" className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Não foi possível carregar o conteúdo remoto: {contentError}</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          {success && <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{success}</p>}
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto p-5"><fieldset disabled={busy} className="min-w-0">
          {tab === 'profiles' && <div className="grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Escolhe a criadora</h2><p className="mt-1 text-xs text-slate-500">Cada perfil tem os seus próprios conteúdos.</p></div>
              <div role="group" aria-label="Criadoras" className="grid grid-cols-2 gap-2 md:grid-cols-1">
                {creators.map((creator) => <button key={creator.id} type="button" aria-pressed={!newProfile && draft?.id === creator.id} onClick={() => { if (draft?.id !== creator.id) chooseProfile(creator.id); }} className={`flex min-w-0 items-center gap-2.5 rounded-xl border p-2.5 text-left ${!newProfile && draft?.id === creator.id ? 'border-pink-400/60 bg-pink-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                  {creator.avatar ? <img src={creator.avatar} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full bg-white/5 object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-sm font-semibold text-pink-200">{creator.name.slice(0, 1)}</span>}
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{creator.name}</span><span className="block truncate text-xs text-slate-400">{creator.handle}</span></span>
                </button>)}
                {newProfile && draft && <div className="flex items-center gap-2 rounded-xl border border-pink-400/60 bg-pink-500/10 p-3 text-sm text-pink-100"><Plus size={16} /><span className="min-w-0 truncate">{draft.name} · rascunho</span></div>}
              </div>
              <button type="button" className={`${buttonClass} w-full`} onClick={() => { if (confirmProfileChange()) { setDraft(newCreator()); setNewProfile(true); setProfileDirty(true); setSection('profile'); setError(''); setSuccess(''); } }}><Plus size={16} /> Criar perfil</button>
            </aside>
            <section className="min-w-0 space-y-5">
              {draft ? <>
                <div><h2 className="text-xl font-semibold">{draft.name}</h2><p className="mt-1 text-xs text-slate-400">{newProfile ? 'Este perfil só aparece na página depois de o guardares.' : 'Edita os conteúdos e os links desta criadora.'}</p></div>
                <nav aria-label="Abas do perfil" className="grid grid-cols-2 gap-2 lg:grid-cols-3">{Object.entries(PROFILE_SECTIONS).map(([id, config]) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)} className={`min-w-0 rounded-lg border px-3 py-2.5 text-left text-xs leading-relaxed sm:text-sm ${section === id ? 'border-pink-400/50 bg-pink-500/15 text-pink-100' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{config.label}</button>)}</nav>
                <div><h3 className="text-lg font-semibold">{PROFILE_SECTIONS[section].label}</h3>{PROFILE_SECTIONS[section].hint && <p className="mt-2 text-xs leading-relaxed text-slate-400">{PROFILE_SECTIONS[section].hint}</p>}</div>
                {section === 'links' ? <AdminPageLinks creatorId={draft.id} creatorName={draft.name} isNew={newProfile} hasChanges={profileDirty} /> : <StructuredFields fields={PROFILE_SECTIONS[section].fields} value={draft} onChange={updateDraft} onUpload={upload} path="profile" />}
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
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <p className="text-xs text-slate-400">{busy ? 'A comunicar com o banco de dados…' : contentLoading ? 'A carregar o conteúdo…' : profileDirty || settingsDirty ? 'Há alterações por guardar.' : 'Sem alterações por guardar.'}</p>
          {tab === 'profiles' && <button type="button" disabled={busy || !draft || !profileDirty} className={primaryClass} onClick={() => void saveProfile()}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Guardar perfil</button>}
          {(tab === 'copy' || tab === 'faqs' || tab === 'bank') && <button type="button" disabled={busy || !settingsDirty} className={primaryClass} onClick={() => void saveSettings()}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Guardar conteúdo da página</button>}
        </footer>
      </>}
    </div>
  </div>;
};
