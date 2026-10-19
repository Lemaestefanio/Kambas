import React, { lazy, Suspense, useState, useEffect } from 'react';
import { OnlyFansHeader } from './components/OnlyFansHeader';
import { RecommendedProfilesBar } from './components/RecommendedProfilesBar';
import { ProfileSection } from './components/ProfileSection';
import { TeaserSection, type ContentTab } from './components/TeaserSection';
import { FeedSection } from './components/FeedSection';
import { PlansSection } from './components/PlansSection';
import { OtherCreatorsGrid } from './components/OtherCreatorsGrid';
import { MicroCommitmentQuiz } from './components/MicroCommitmentQuiz';
import { DiscreetBillingNotice } from './components/DiscreetBillingNotice';
import { FAQSection } from './components/FAQSection';
import { StickyBottomBar } from './components/StickyBottomBar';
import { BottomNavOnlyFans } from './components/BottomNavOnlyFans';
import { LiveSocialProofToast } from './components/LiveSocialProofToast';
import { IncomingMessageToast } from './components/IncomingMessageToast';
import { ArrowRight } from 'lucide-react';
import type { Plan, Creator, AppUser } from './types';
import { CREATORS } from './data/content';
import {
  subscribeToCreators,
  onAuthChange,
  signOutUser,
} from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { SiteContentProvider, useSiteContent } from './cms/SiteContent';
import type { PageMode, ActiveView } from './App';
import { getRequestedCreatorId } from './utils/creatorRoute';
import { openConfiguredAction, safeActionUrl } from './utils/actionLinks';
import { resolvePageVariant } from './utils/pageVariants';
import { PlatformSkeleton } from './components/PlatformSkeleton';

const PhotoGalleryGrid = lazy(() => import('./components/PhotoGalleryGrid').then(module => ({ default: module.PhotoGalleryGrid })));
const VoiceNotesList = lazy(() => import('./components/VoiceNotesList').then(module => ({ default: module.VoiceNotesList })));
const PlansModal = lazy(() => import('./components/PlansModal').then(module => ({ default: module.PlansModal })));
const PaymentModal = lazy(() => import('./components/PaymentModal').then(module => ({ default: module.PaymentModal })));
const StoryViewerModal = lazy(() => import('./components/StoryViewerModal').then(module => ({ default: module.StoryViewerModal })));
const CreatorChatDrawer = lazy(() => import('./components/CreatorChatDrawer').then(module => ({ default: module.CreatorChatDrawer })));
const CreatorsDirectoryModal = lazy(() => import('./components/CreatorsDirectoryModal').then(module => ({ default: module.CreatorsDirectoryModal })));
const PostCommentsModal = lazy(() => import('./components/PostCommentsModal').then(module => ({ default: module.PostCommentsModal })));
const TipModal = lazy(() => import('./components/TipModal').then(module => ({ default: module.TipModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(module => ({ default: module.AuthModal })));
const AdminPanelModal = lazy(() => import('./components/AdminPanelModal').then(module => ({ default: module.AdminPanelModal })));
const DedicatedMessagesPage = lazy(() => import('./components/DedicatedMessagesPage').then(module => ({ default: module.DedicatedMessagesPage })));
const DedicatedCommentsPage = lazy(() => import('./components/DedicatedCommentsPage').then(module => ({ default: module.DedicatedCommentsPage })));

function SectionLoading() {
  return <div className="space-y-4 p-5" role="status" aria-label="A preparar conteúdo" aria-busy="true"><div className="h-12 rounded-xl bg-slate-200 motion-safe:animate-pulse" /><div className="h-64 rounded-2xl bg-slate-200 motion-safe:animate-pulse" /></div>;
}

function DialogLoading() {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-6" role="status" aria-label="A preparar janela" aria-busy="true"><div className="h-10 w-10 rounded-full border-4 border-white/25 border-t-white motion-safe:animate-spin" /></div>;
}

function CatalogueStatus({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return <PlatformSkeleton />;
  return (
    <main className="mx-auto min-h-screen max-w-[600px] bg-slate-50 px-6 py-12" aria-busy={!error}>
      <div className="mx-auto max-w-sm">
        <div className="mb-10 flex h-24 items-center justify-center rounded-2xl bg-slate-950 p-4">
          <img src="/assets/platform-logo.png" alt="Luanda Privé" width="240" height="80" className="h-full w-full object-contain" decoding="async" />
        </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm leading-relaxed text-slate-600" role="alert">{error}</p>
            <button type="button" onClick={onRetry} className="mt-5 rounded-full bg-[#00aff0] px-6 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500">Tentar novamente</button>
          </div>
      </div>
    </main>
  );
}

// This module and its Firebase subscriptions are loaded only after age consent.
export default function PlatformApp() {
  return <SiteContentProvider><PlatformContent /></SiteContentProvider>;
}


// URL-based routing to support separate dedicated links
const parseUrlRoute = (): {
  mode: PageMode;
  view: ActiveView;
  isAdmin: boolean;
} => {
  const pathname = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);

  const isAdmin =
    pathname.includes('/admin') ||
    pathname.includes('/admin-luanda-prive') ||
    pathname.includes('/admin-loanda-prive') ||
    params.get('admin') === 'true';

  const isMessages =
    pathname.includes('/mensagens') ||
    pathname.includes('/chat') ||
    params.get('view') === 'messages';

  const isComments =
    pathname.includes('/comentarios') ||
    params.get('view') === 'comments';

  const isCheckout =
    pathname.includes('/checkout') ||
    params.get('view') === 'checkout';

  let view: ActiveView = 'feed';
  if (isMessages) view = 'messages';
  else if (isComments) view = 'comments';
  else if (isCheckout) view = 'checkout';

  let mode: PageMode = 'direct-pay';
  if (params.get('mode') === 'login-first') mode = 'login-first';
  if (
    pathname.includes('/perfil-3') ||
    params.get('mode') === 'direct-pay' ||
    params.get('variant') === '2'
  ) {
    mode = 'direct-pay';
  } else if (
    pathname.includes('/promo-3') ||
    params.get('mode') === 'teaser-promo' ||
    params.get('variant') === '3'
  ) {
    mode = 'teaser-promo';
  }

  return {
    mode,
    view,
    isAdmin,
  };
};

export function PlatformContent() {
  const initialRoute = parseUrlRoute();
  const { copy, loading: settingsLoading, error: settingsError, retry: retrySettings } = useSiteContent();

  const [creatorsList, setCreatorsList] = useState<Creator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [creatorsError, setCreatorsError] = useState<string | null>(null);
  const [creatorsAttempt, setCreatorsAttempt] = useState(0);
  const [activeCreatorId, setActiveCreatorId] = useState<string>(() =>
    getRequestedCreatorId(window.location.search) || CREATORS[0].id
  );
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Dedicated Route and View state
  const [pageMode] = useState<PageMode>(initialRoute.mode);
  const [activeView, setActiveView] = useState<ActiveView>(initialRoute.view);

  // Administrative route (authorization is enforced by Firebase rules)
  const [isAdminOpen, setIsAdminOpen] = useState(initialRoute.isAdmin);

  // Only Firebase may confirm a signed-in account; guest checkout needs no account.
  const [authUser, setAuthUser] = useState<AppUser | FirebaseUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [checkoutAfterAuth, setCheckoutAfterAuth] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Modals for deep navigation & realism
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePostCaption, setActivePostCaption] = useState('');
  const [activePostId, setActivePostId] = useState<string | undefined>();
  const [isTipOpen, setIsTipOpen] = useState(false);

  // 15-minute countdown for Variant 3 (Promo-3)
  const [promoTimeLeft, setPromoTimeLeft] = useState(14 * 60 + 58);

  useEffect(() => {
    if (pageMode === 'teaser-promo') {
      const timer = setInterval(() => {
        setPromoTimeLeft((prev) => (prev > 0 ? prev - 1 : 14 * 60 + 59));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pageMode]);

  const formatPromoTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Subscribe to Firebase Auth changes
  useEffect(() => {
    const unsubAuth = onAuthChange((user) => {
      setAuthUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Wait for the published snapshot before mounting any profile images.
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const fail = () => {
      if (!active) return;
      setCreatorsLoading(false);
      setCreatorsError('O perfil está temporariamente indisponível. Verifica a ligação e tenta novamente.');
    };
    const timeout = window.setTimeout(fail, 12_000);
    try {
      unsubscribe = subscribeToCreators(firestoreCreators => {
        if (!active) return;
        window.clearTimeout(timeout);
        const originalOrder = new Map(CREATORS.map((creator, index) => [creator.id, index]));
        const ordered = [...firestoreCreators].sort((a, b) =>
          (originalOrder.get(a.id) ?? CREATORS.length) - (originalOrder.get(b.id) ?? CREATORS.length)
        );
        // Defaults are used only after the server confirms an unpublished catalogue.
        setCreatorsList(ordered.length ? ordered : CREATORS);
        setCreatorsLoading(false);
        setCreatorsError(null);
      }, () => {
        window.clearTimeout(timeout);
        fail();
      });
    } catch {
      window.clearTimeout(timeout);
      fail();
    }
    return () => {
      active = false;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [creatorsAttempt]);

  const retryCatalogue = () => {
    setCreatorsLoading(true);
    setCreatorsError(null);
    setCreatorsAttempt(value => value + 1);
    retrySettings();
  };

  if (creatorsLoading || settingsLoading || creatorsError || settingsError) {
    return <CatalogueStatus error={creatorsError || settingsError} onRetry={retryCatalogue} />;
  }

  const publishedCreator =
    creatorsList.find((c) => c.id === activeCreatorId) || creatorsList[0];
  if (!publishedCreator) {
    return <CatalogueStatus error="Ainda não existem perfis disponíveis." onRetry={retryCatalogue} />;
  }
  const variant = resolvePageVariant(publishedCreator, window.location.search);
  const currentCreator = variant.creator;
  const requiresAccount = pageMode === 'login-first' || (
    variant.checkoutMode === 'account' && !window.location.pathname.includes('/perfil-3') && pageMode !== 'teaser-promo'
  );
  const hasAccount = !!authUser && !authUser.isAnonymous;
  const variantCheckout = safeActionUrl(publishedCreator.pageVariants?.[variant.variant]?.checkoutUrl);

  // Admin callbacks run only after Firestore confirms the corresponding write.
  const handleUpdateCreator = (updated: Creator) => {
    setCreatorsList(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleAddCreator = (newCreator: Creator) => {
    setCreatorsList(prev => prev.some(c => c.id === newCreator.id)
      ? prev.map(c => c.id === newCreator.id ? newCreator : c)
      : [...prev, newCreator]);
    setActiveCreatorId(newCreator.id);
  };

  const handleDeleteCreator = (creatorId: string) => {
    setCreatorsList(prev => prev.filter(c => c.id !== creatorId));
    if (activeCreatorId === creatorId) {
      setActiveCreatorId(creatorsList.find(c => c.id !== creatorId)?.id ?? CREATORS[0].id);
    }
  };

  // Default A is guest checkout. Account-first is an explicit experiment option.
  const handleOpenPlans = () => {
    setCheckoutError('');
    if (requiresAccount && !hasAccount) {
      setCheckoutAfterAuth(true);
      setIsAuthOpen(true);
      return;
    }
    if (!variantCheckout && openConfiguredAction(currentCreator, 'subscribe')) return;
    setIsPlansModalOpen(true);
  };

  const handleSelectPlan = (plan: Plan, subscription = true) => {
    if (!subscription) setIsTipOpen(false);
    if (subscription && requiresAccount && !hasAccount) {
      setCheckoutAfterAuth(true);
      setIsPlansModalOpen(false);
      setIsAuthOpen(true);
      return;
    }
    // If in Promo mode (/promo-3), apply 50% discount tag
    let appliedPlan = plan;
    if (subscription && pageMode === 'teaser-promo') {
      const halfPriceRaw = Math.round(plan.rawPrice * 0.5);
      const formattedPrice = `${halfPriceRaw.toLocaleString('pt-AO')} Kz`;
      appliedPlan = {
        ...plan,
        price: formattedPrice,
        rawPrice: halfPriceRaw,
        badge: '50% OFF APLICADO',
        badgeType: 'accent',
      };
    }

    setSelectedPlan(appliedPlan);
    setIsPlansModalOpen(false);

    // Direct redirection to configured external checkout link:
    const targetUrl = (subscription ? variantCheckout : null)
      || safeActionUrl(appliedPlan.checkoutUrl)
      || safeActionUrl(subscription ? currentCreator.checkoutUrl : currentCreator.tipCheckoutUrl);
    if (!targetUrl) {
      setCheckoutError('O pagamento deste plano ainda não está disponível. Tenta outro plano ou volta mais tarde.');
      return;
    }
    window.location.assign(targetUrl);
  };

  const handleSelectCreator = (creator: Creator) => {
    setCheckoutAfterAuth(false);
    setCheckoutError('');
    setActiveCreatorId(creator.id);
    setActiveTab('posts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStory = (index: number) => {
    setSelectedStoryIndex(index);
    setIsStoryOpen(true);
  };

  const handleOpenComments = (caption: string, postId?: string) => {
    setActivePostCaption(caption);
    setActivePostId(postId);
    setActiveView('comments');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTip = () => {
    if (openConfiguredAction(currentCreator, 'tip')) return;
    setIsTipOpen(true);
  };

  // Navigating to dedicated Messages page
  const handleOpenMessagesView = () => {
    if (openConfiguredAction(currentCreator, 'message')) return;
    setActiveView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDirectory = () => {
    if (openConfiguredAction(currentCreator, 'explore')) return;
    setIsDirectoryOpen(true);
  };

  const handleOpenNotifications = () => {
    if (openConfiguredAction(currentCreator, 'notifications')) return;
    setIsDirectoryOpen(true);
  };

  const handleOpenAuth = () => {
    if (openConfiguredAction(currentCreator, 'login')) return;
    setCheckoutAfterAuth(false);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] max-w-[600px] mx-auto pb-44 shadow-xl sm:border-x sm:border-slate-200 text-[#1c1e21] relative antialiased">
      {checkoutError && <div role="alert" className="sticky top-0 z-[100] flex items-center gap-3 border-b border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="flex-1">{checkoutError}</p><button type="button" onClick={() => setCheckoutError('')} aria-label="Fechar aviso" className="p-2">×</button></div>}
      {/* Página 3: Promo Banner de Alta Conversão com Contagem Decrescente (Só aparece em /promo-3) */}
      {pageMode === 'teaser-promo' && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white px-3.5 py-2.5 flex items-center justify-between border-b border-rose-800 shadow-md">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <div>
              <p className="text-xs font-black text-white">
                {copy('site.promoBrand')}<span className="text-rose-400">{copy('site.promoOffer')}</span>
              </p>
              <p className="text-[10px] text-slate-300">
                {copy('site.promoExpiry')}{' '}
                <span className="font-mono font-bold text-rose-300 bg-black/40 px-1.5 py-0.5 rounded ml-1">
                  {formatPromoTime(promoTimeLeft)}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenPlans}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold text-xs shadow-md active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>{copy('site.promoButton')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Social Proof Conversion Toasts (100% Anónimas, sem apelidos nem cidades) */}
      {!isAdminOpen && <LiveSocialProofToast />}

      {/* Incoming Message Notification from active creator */}
      {!isAdminOpen && activeView !== 'messages' && (
        <IncomingMessageToast
          creator={currentCreator}
          onUnlockClick={handleOpenMessagesView}
        />
      )}

      {/* 1. DEDICATED MESSAGES VIEW */}
      {activeView === 'messages' && (
        <Suspense fallback={<SectionLoading />}>
          <DedicatedMessagesPage
            creator={currentCreator}
            onBack={() => setActiveView('feed')}
            onUnlockClick={handleOpenPlans}
            onOpenPlans={handleOpenPlans}
          />
        </Suspense>
      )}

      {/* 2. DEDICATED COMMENTS VIEW (Estilo OnlyFans / Instagram) */}
      {activeView === 'comments' && (
        <Suspense fallback={<SectionLoading />}>
          <DedicatedCommentsPage
            creator={currentCreator}
            postCaption={activePostCaption}
            postId={activePostId}
            onBack={() => setActiveView('feed')}
            user={authUser}
            onUnlockClick={handleOpenPlans}
          />
        </Suspense>
      )}


      {activeView === 'checkout' && <main className="min-h-screen py-6">
        <button type="button" onClick={() => setActiveView('feed')} className="mx-4 mb-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium">Voltar ao perfil</button>
        <PlansSection creator={currentCreator} onOpenPlansModal={handleOpenPlans} />
      </main>}

      {/* 4. STANDARD FEED VIEW */}
      {activeView === 'feed' && (
        <>
          {/* 1. Header & Top Bar: Sticky Navigation Bar */}
          <OnlyFansHeader
            currentCreator={currentCreator}
            allCreators={creatorsList}
            onSelectCreator={handleSelectCreator}
            onOpenDirectory={handleOpenDirectory}
            user={authUser}
            onOpenAuth={handleOpenAuth}
            onSignOut={async () => {
              sessionStorage.removeItem('luanda_prive_user');
              await signOutUser();
              setAuthUser(null);
            }}
          />

          {/* 2. Perfis Organizados: Stories / Criadoras em Destaque de Luanda */}
          <RecommendedProfilesBar
            creators={creatorsList}
            activeCreatorId={currentCreator.id}
            onSelectCreator={handleSelectCreator}
            onOpenDirectory={handleOpenDirectory}
          />

          {/* 3. Perfil da Criadora: Capa, Avatar, Estatísticas, Bio e Destaques */}
          <ProfileSection
            key={currentCreator.id}
            creator={currentCreator}
            onOpenStory={handleOpenStory}
            onOpenChat={handleOpenMessagesView}
            onSelectTab={(tab) => setActiveTab(tab)}
          />

          {/* 4. Caixa Principal de Assinatura VIP */}
          <PlansSection
            creator={currentCreator}
            onOpenPlansModal={handleOpenPlans}
          />

          {/* 5. Separador Navegável de Conteúdos (Posts, Fotos, Vídeos, Voz) */}
          <TeaserSection
            creator={currentCreator}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onUnlockClick={handleOpenPlans}
          />

          {/* 6. Feed Dinâmico por Tipo de Conteúdo (com desfoque ou visibilidade total configurada) */}
          <main>
            {activeTab === 'posts' && (
              <FeedSection
                creator={currentCreator}
                onUnlockClick={handleOpenPlans}
                onOpenComments={handleOpenComments}
                onOpenTip={handleOpenTip}
              />
            )}

            {activeTab === 'photos' && (
              <Suspense fallback={<SectionLoading />}>
                <PhotoGalleryGrid
                  creator={currentCreator}
                  onUnlockClick={handleOpenPlans}
                />
              </Suspense>
            )}

            {activeTab === 'videos' && (
              <FeedSection
                creator={currentCreator}
                onUnlockClick={handleOpenPlans}
                onOpenComments={handleOpenComments}
                onOpenTip={handleOpenTip}
              />
            )}

            {activeTab === 'audio' && (
              <Suspense fallback={<SectionLoading />}>
                <VoiceNotesList
                  creator={currentCreator}
                  onUnlockClick={handleOpenPlans}
                />
              </Suspense>
            )}
          </main>

          {/* 7. Organização de Perfis: Vitrine de Outras Criadoras em Luanda */}
          <OtherCreatorsGrid
            creators={creatorsList}
            currentCreatorId={currentCreator.id}
            onSelectCreator={handleSelectCreator}
            onOpenDirectory={handleOpenDirectory}
          />

          {/* 8. Quiz Interativo de Preferências */}
          <div className="pt-1">
            <MicroCommitmentQuiz
              creator={currentCreator}
              onUnlockClick={handleOpenPlans}
            />
          </div>

          {/* 9. Garantia de Sigilo Bancário no Multicaixa Express */}
          <DiscreetBillingNotice />

          {/* 10. FAQ / Dúvidas Frequentes */}
          <FAQSection />

          {/* Rodapé Limpo e 100% Profissional (sem botões de admin visíveis para visitantes) */}
          <footer className="py-8 px-4 text-center border-t border-slate-200 mt-6 text-xs text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-600">{copy('site.footerBrand')}</p>
            <p className="text-[11px] text-slate-400">
              {copy('site.footerNotice')}
            </p>
            <p className="text-[10px] text-slate-300 pt-2">{copy('site.footerCopyright')}</p>
          </footer>

          {/* Barra Inferior Fixa para Desktops/Tablets */}
          <div className="hidden sm:block">
            {currentCreator.plans.length > 0 && <StickyBottomBar creator={currentCreator} onUnlockClick={handleOpenPlans} />}
          </div>

          {/* Barra de Navegação Inferior Estilo OnlyFans Mobile */}
          <BottomNavOnlyFans
            onHomeClick={() => {
              setActiveView('feed');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExploreClick={handleOpenDirectory}
            onChatClick={handleOpenMessagesView}
            onNotificationsClick={handleOpenNotifications}
            onUnlockClick={handleOpenPlans}
            user={authUser}
            onOpenAuth={handleOpenAuth}
          />
        </>
      )}

      {/* Modal Visualizador de Stories em Ecrã Inteiro */}
      {isStoryOpen && (
        <Suspense fallback={<DialogLoading />}>
          <StoryViewerModal
            creator={currentCreator}
            initialStoryIndex={selectedStoryIndex}
            isOpen={isStoryOpen}
            onClose={() => setIsStoryOpen(false)}
            onUnlockClick={handleOpenPlans}
          />
        </Suspense>
      )}

      {/* Gaveta de Chat Secundária */}
      {isChatOpen && (
        <Suspense fallback={<DialogLoading />}>
          <CreatorChatDrawer
            creator={currentCreator}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            onUnlockClick={handleOpenPlans}
          />
        </Suspense>
      )}

      {/* Directório Completo de Todas as Criadoras com Filtro por Bairro */}
      {isDirectoryOpen && (
        <Suspense fallback={<DialogLoading />}>
          <CreatorsDirectoryModal
            creators={creatorsList}
            isOpen={isDirectoryOpen}
            onClose={() => setIsDirectoryOpen(false)}
            onSelectCreator={handleSelectCreator}
          />
        </Suspense>
      )}

      {/* Modal de Comentários Reais da Publicação */}
      {isCommentsOpen && (
        <Suspense fallback={<DialogLoading />}>
          <PostCommentsModal
            isOpen={isCommentsOpen}
            onClose={() => setIsCommentsOpen(false)}
            creator={currentCreator}
            postCaption={activePostCaption}
            postId={activePostId}
            onUnlockClick={handleOpenPlans}
          />
        </Suspense>
      )}

      {/* Modal de Gorjetas/Mimos em Kwanzas */}
      {isTipOpen && (
        <Suspense fallback={<DialogLoading />}>
          <TipModal
            isOpen={isTipOpen}
            onClose={() => setIsTipOpen(false)}
            creator={currentCreator}
            onProceedToPayment={(plan) => handleSelectPlan(plan, false)}
          />
        </Suspense>
      )}

      {/* Modal Oficial de Escolha de Planos */}
      {isPlansModalOpen && (
        <Suspense fallback={<DialogLoading />}>
          <PlansModal
            creator={currentCreator}
            isOpen={isPlansModalOpen}
            onClose={() => setIsPlansModalOpen(false)}
            onSelectPlan={handleSelectPlan}
          />
        </Suspense>
      )}

      {/* Modal de Pagamento Multicaixa Express / Iban */}
      {isPaymentOpen && (
        <Suspense fallback={<DialogLoading />}>
          <PaymentModal
            plan={selectedPlan}
            creator={currentCreator}
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            onSuccess={() => {}}
          />
        </Suspense>
      )}

      {/* Modal de Autenticação / Criação de Conta do Fã */}
      {isAuthOpen && (
        <Suspense fallback={<DialogLoading />}>
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => { setIsAuthOpen(false); setCheckoutAfterAuth(false); }}
            allowAnonymous={!checkoutAfterAuth}
            onSuccess={(user) => {
              setAuthUser(user);
              if (checkoutAfterAuth && !user.isAnonymous) {
                setCheckoutAfterAuth(false);
                if (variantCheckout || !openConfiguredAction(currentCreator, 'subscribe')) setIsPlansModalOpen(true);
              }
            }}
            creatorName={currentCreator.shortName}
          />
        </Suspense>
      )}

      {/* PAINEL ADMINISTRATIVO (Firebase Auth e autorização no servidor) */}
      {isAdminOpen && (
        <Suspense fallback={<DialogLoading />}>
          <AdminPanelModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            creators={creatorsList}
            onUpdateCreator={handleUpdateCreator}
            onAddCreator={handleAddCreator}
            onDeleteCreator={handleDeleteCreator}
            activeCreatorId={currentCreator.id}
          />
        </Suspense>
      )}
    </div>
  );
}

