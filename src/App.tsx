import React, { useState, useEffect } from 'react';
import { OnlyFansHeader } from './components/OnlyFansHeader';
import { RecommendedProfilesBar } from './components/RecommendedProfilesBar';
import { ProfileSection } from './components/ProfileSection';
import { TeaserSection, ContentTab } from './components/TeaserSection';
import { FeedSection } from './components/FeedSection';
import { PhotoGalleryGrid } from './components/PhotoGalleryGrid';
import { VoiceNotesList } from './components/VoiceNotesList';
import { PlansSection } from './components/PlansSection';
import { OtherCreatorsGrid } from './components/OtherCreatorsGrid';
import { MicroCommitmentQuiz } from './components/MicroCommitmentQuiz';
import { DiscreetBillingNotice } from './components/DiscreetBillingNotice';
import { FAQSection } from './components/FAQSection';
import { StickyBottomBar } from './components/StickyBottomBar';
import { BottomNavOnlyFans } from './components/BottomNavOnlyFans';
import { LiveSocialProofToast } from './components/LiveSocialProofToast';
import { AgeVerificationModal } from './components/AgeVerificationModal';
import { IncomingMessageToast } from './components/IncomingMessageToast';
import { PlansModal } from './components/PlansModal';
import { PaymentModal } from './components/PaymentModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { CreatorChatDrawer } from './components/CreatorChatDrawer';
import { CreatorsDirectoryModal } from './components/CreatorsDirectoryModal';
import { PostCommentsModal } from './components/PostCommentsModal';
import { TipModal } from './components/TipModal';
import { AuthModal } from './components/AuthModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { DedicatedMessagesPage } from './components/DedicatedMessagesPage';
import { DedicatedCommentsPage } from './components/DedicatedCommentsPage';
import { SafeBridgePage } from './components/SafeBridgePage';
import { Clock, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { Plan, Creator, AppUser } from './types';
import { CREATORS } from './data/content';
import {
  subscribeToCreators,
  seedInitialCreatorsIfEmpty,
  onAuthChange,
  signOutUser,
} from './firebase';
import { User as FirebaseUser } from 'firebase/auth';

export type PageMode = 'login-first' | 'direct-pay' | 'teaser-promo';
export type ActiveView = 'feed' | 'messages' | 'comments' | 'checkout';

const getInitialCreators = (): Creator[] => {
  try {
    const fullSaved = localStorage.getItem('luanda_prive_all_creators');
    if (fullSaved) {
      const parsed = JSON.parse(fullSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    const customAvatarsSaved = localStorage.getItem('agency_custom_avatars');
    const customAvatars = customAvatarsSaved ? JSON.parse(customAvatarsSaved) : {};

    return CREATORS.map((c) => {
      const ind = localStorage.getItem(`luanda_prive_creator_${c.id}`);
      if (ind) {
        try {
          return JSON.parse(ind);
        } catch {}
      }
      if (customAvatars[c.id]) {
        return {
          ...c,
          avatar: customAvatars[c.id],
          highlights: c.highlights.map((h, idx) =>
            idx === 0 ? { ...h, coverImage: customAvatars[c.id] } : h
          ),
        };
      }
      return c;
    });
  } catch (e) {
    console.error('Failed to load creators from cache:', e);
  }
  return CREATORS;
};

// URL-based routing to support separate dedicated links
const parseUrlRoute = (): {
  mode: PageMode;
  view: ActiveView;
  isAdmin: boolean;
} => {
  const pathname = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
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

  let mode: PageMode = 'login-first';
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

export default function App() {
  const initialRoute = parseUrlRoute();

  const [creatorsList, setCreatorsList] = useState<Creator[]>(getInitialCreators);
  const [activeCreatorId, setActiveCreatorId] = useState<string>(CREATORS[0].id);
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);

  // Dedicated Route and View state
  const [pageMode] = useState<PageMode>(initialRoute.mode);
  const [activeView, setActiveView] = useState<ActiveView>(initialRoute.view);

  // Secret Admin Panel state (isolated, not visible to regular users)
  const [isAdminOpen, setIsAdminOpen] = useState(initialRoute.isAdmin);

  // User Authentication state (restored from browser session for privacy)
  const [authUser, setAuthUser] = useState<AppUser | FirebaseUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('luanda_prive_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Modals for deep navigation & realism
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePostCaption, setActivePostCaption] = useState('');
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

  // Real-time synchronization with Firebase Firestore
  useEffect(() => {
    seedInitialCreatorsIfEmpty(CREATORS).catch((err) => {
      console.warn('Firebase seeding notice:', err);
    });

    const unsubscribe = subscribeToCreators(
      (firestoreCreators) => {
        if (firestoreCreators && firestoreCreators.length > 0) {
          const merged = CREATORS.map((def) => {
            const remote = firestoreCreators.find((fc) => fc.id === def.id);
            if (remote) {
              return {
                ...def,
                ...remote,
                highlights:
                  remote.highlights !== undefined
                    ? remote.highlights
                    : def.highlights,
                posts:
                  remote.posts !== undefined
                    ? remote.posts
                    : def.posts,
                galleryPhotos:
                  remote.galleryPhotos !== undefined
                    ? remote.galleryPhotos
                    : def.galleryPhotos,
              };
            }
            return def;
          });

          const extraModels = firestoreCreators.filter(
            (fc) => !CREATORS.some((def) => def.id === fc.id)
          );

          setCreatorsList([...merged, ...extraModels]);
        }
      },
      (err) => {
        console.error('Firestore subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const currentCreator =
    creatorsList.find((c) => c.id === activeCreatorId) || creatorsList[0];

  const [isSafeBridgeActive, setIsSafeBridgeActive] = useState<boolean>(() => {
    try {
      const ua = (navigator.userAgent || '').toLowerCase();
      const search = window.location.search.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      const isBot =
        ua.includes('facebookexternalhit') ||
        ua.includes('facebot') ||
        ua.includes('meta-externalagent') ||
        ua.includes('googlebot') ||
        ua.includes('twitterbot');

      const isSafeParam =
        search.includes('safe=1') ||
        search.includes('fb=1') ||
        pathname.includes('/seguro') ||
        search.includes('fbclid');

      const isEnabledInStorage = localStorage.getItem('luanda_prive_fb_cloaking_enabled') === 'true';
      const isHumanVerified = sessionStorage.getItem('luanda_prive_human_verified') === 'true';

      return (isBot || isSafeParam || isEnabledInStorage) && !isHumanVerified;
    } catch {
      return false;
    }
  });

  const handleUpdateCreator = (updated: Creator) => {
    setCreatorsList((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      try {
        localStorage.setItem('luanda_prive_all_creators', JSON.stringify(next));
        localStorage.setItem(`luanda_prive_creator_${updated.id}`, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save notice:', e);
      }
      return next;
    });
  };

  const handleAddCreator = (newCreator: Creator) => {
    setCreatorsList((prev) => {
      const next = [...prev, newCreator];
      try {
        localStorage.setItem('luanda_prive_all_creators', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage save notice:', e);
      }
      return next;
    });
    saveCreatorToFirestore(newCreator);
    setActiveCreatorId(newCreator.id);
  };

  const handleDeleteCreator = (creatorId: string) => {
    setCreatorsList((prev) => {
      const next = prev.filter((c) => c.id !== creatorId);
      try {
        localStorage.setItem('luanda_prive_all_creators', JSON.stringify(next));
        localStorage.removeItem(`luanda_prive_creator_${creatorId}`);
      } catch (e) {
        console.warn('LocalStorage remove notice:', e);
      }
      return next;
    });
    setActiveCreatorId((prev) => {
      if (prev === creatorId) {
        const remaining = creatorsList.filter((c) => c.id !== creatorId);
        return remaining.length > 0 ? remaining[0].id : prev;
      }
      return prev;
    });
  };

  /**
   * Action: Open Plans / Unlock Content
   * Respects the 3 distinct page links:
   * - Página 1 (login-first /): Requires account creation first!
   * - Página 2 (direct-pay /perfil-3): Directly opens payment without any login!
   * - Página 3 (teaser-promo /promo-3): Opens plans with 50% discount highlight!
   */
  const handleOpenPlans = () => {
    if (pageMode === 'login-first' && !authUser) {
      setIsAuthOpen(true);
      return;
    }
    setIsPlansModalOpen(true);
  };

  const handleSelectPlan = (plan: Plan) => {
    // If in Promo mode (/promo-3), apply 50% discount tag
    let appliedPlan = plan;
    if (pageMode === 'teaser-promo') {
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
    const targetUrl =
      appliedPlan.checkoutUrl ||
      currentCreator.checkoutUrl ||
      'https://pay.meuskambas.online/checkout/sandra-gomes-chat-privado-30-dias';

    window.location.href = targetUrl;
  };

  const handleSelectCreator = (creator: Creator) => {
    setActiveCreatorId(creator.id);
    setActiveTab('posts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStory = (index: number) => {
    setSelectedStoryIndex(index);
    setIsStoryOpen(true);
  };

  const handleOpenComments = (caption: string) => {
    setActivePostCaption(caption);
    setActiveView('comments');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTip = () => {
    setIsTipOpen(true);
  };

  // Navigating to dedicated Messages page
  const handleOpenMessagesView = () => {
    setActiveView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isSafeBridgeActive) {
    return (
      <SafeBridgePage
        onEnterPlatform={() => {
          setIsSafeBridgeActive(false);
          setAgeVerified(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] max-w-[600px] mx-auto pb-44 shadow-xl sm:border-x sm:border-slate-200 text-[#1c1e21] relative antialiased">
      {/* 18+ Age Verification Modal */}
      <AgeVerificationModal onVerified={() => setAgeVerified(true)} />

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
                Luanda Privé · <span className="text-rose-400">50% DE DESCONTO VIP</span>
              </p>
              <p className="text-[10px] text-slate-300">
                Oferta de boas-vindas expira em:{' '}
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
            <span>Aproveitar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Social Proof Conversion Toasts (100% Anónimas, sem apelidos nem cidades) */}
      {ageVerified && <LiveSocialProofToast />}

      {/* Incoming Message Notification from active creator */}
      {ageVerified && activeView !== 'messages' && (
        <IncomingMessageToast
          creator={currentCreator}
          onUnlockClick={handleOpenMessagesView}
        />
      )}

      {/* 1. DEDICATED MESSAGES VIEW */}
      {activeView === 'messages' && (
        <DedicatedMessagesPage
          creator={currentCreator}
          onBack={() => setActiveView('feed')}
          onUnlockClick={handleOpenPlans}
          onOpenPlans={handleOpenPlans}
        />
      )}

      {/* 2. DEDICATED COMMENTS VIEW (Estilo OnlyFans / Instagram) */}
      {activeView === 'comments' && (
        <DedicatedCommentsPage
          creator={currentCreator}
          postCaption={activePostCaption}
          onBack={() => setActiveView('feed')}
          user={authUser}
          onUnlockClick={handleOpenPlans}
        />
      )}


      {/* 4. STANDARD FEED VIEW */}
      {activeView === 'feed' && (
        <>
          {/* 1. Header & Top Bar: Sticky Navigation Bar */}
          <OnlyFansHeader
            currentCreator={currentCreator}
            allCreators={creatorsList}
            onSelectCreator={handleSelectCreator}
            onOpenDirectory={() => setIsDirectoryOpen(true)}
            user={authUser}
            onOpenAuth={() => setIsAuthOpen(true)}
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
            onOpenDirectory={() => setIsDirectoryOpen(true)}
          />

          {/* 3. Perfil da Criadora: Capa, Avatar, Estatísticas, Bio e Destaques */}
          <ProfileSection
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
              <PhotoGalleryGrid
                creator={currentCreator}
                onUnlockClick={handleOpenPlans}
              />
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
              <VoiceNotesList
                creator={currentCreator}
                onUnlockClick={handleOpenPlans}
              />
            )}
          </main>

          {/* 7. Organização de Perfis: Vitrine de Outras Criadoras em Luanda */}
          <OtherCreatorsGrid
            creators={creatorsList}
            currentCreatorId={currentCreator.id}
            onSelectCreator={handleSelectCreator}
            onOpenDirectory={() => setIsDirectoryOpen(true)}
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
            <p className="font-semibold text-slate-600">Luanda Privé · Luanda, Angola</p>
            <p className="text-[11px] text-slate-400">
              Acesso exclusivo para maiores de 18 anos. Pagamentos discretos e seguros via Multicaixa Express.
            </p>
            <p className="text-[10px] text-slate-300 pt-2">© 2026 Luanda Privé · Todos os direitos reservados</p>
          </footer>

          {/* Barra Inferior Fixa para Desktops/Tablets */}
          <div className="hidden sm:block">
            <StickyBottomBar creator={currentCreator} onUnlockClick={handleOpenPlans} />
          </div>

          {/* Barra de Navegação Inferior Estilo OnlyFans Mobile */}
          <BottomNavOnlyFans
            onHomeClick={() => {
              setActiveView('feed');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExploreClick={() => setIsDirectoryOpen(true)}
            onChatClick={handleOpenMessagesView}
            onNotificationsClick={() => setIsDirectoryOpen(true)}
            onUnlockClick={handleOpenPlans}
            user={authUser}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        </>
      )}

      {/* Modal Visualizador de Stories em Ecrã Inteiro */}
      <StoryViewerModal
        creator={currentCreator}
        initialStoryIndex={selectedStoryIndex}
        isOpen={isStoryOpen}
        onClose={() => setIsStoryOpen(false)}
        onUnlockClick={handleOpenPlans}
      />

      {/* Gaveta de Chat Secundária */}
      <CreatorChatDrawer
        creator={currentCreator}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onUnlockClick={handleOpenPlans}
      />

      {/* Directório Completo de Todas as Criadoras com Filtro por Bairro */}
      <CreatorsDirectoryModal
        creators={creatorsList}
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        onSelectCreator={handleSelectCreator}
      />

      {/* Modal de Comentários Reais da Publicação */}
      <PostCommentsModal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        creator={currentCreator}
        postCaption={activePostCaption}
      />

      {/* Modal de Gorjetas/Mimos em Kwanzas */}
      <TipModal
        isOpen={isTipOpen}
        onClose={() => setIsTipOpen(false)}
        creator={currentCreator}
        onProceedToPayment={handleSelectPlan}
      />

      {/* Modal Oficial de Escolha de Planos */}
      <PlansModal
        creator={currentCreator}
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        onSelectPlan={handleSelectPlan}
      />

      {/* Modal de Pagamento Multicaixa Express / Iban */}
      <PaymentModal
        plan={selectedPlan}
        creator={currentCreator}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => {}}
      />

      {/* Modal de Autenticação / Criação de Conta do Fã */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setAuthUser(user);
          // Se entrou como anónimo, não leva no plano de pagamentos - só entra na plataforma!
          if (!user.isAnonymous) {
            setIsPlansModalOpen(true);
          }
        }}
        creatorName={currentCreator.shortName}
      />

      {/* PAINEL ADMINISTRATIVO SECRETO (Isolado e protegido por PIN) */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        creators={creatorsList}
        onUpdateCreator={handleUpdateCreator}
        onAddCreator={handleAddCreator}
        onDeleteCreator={handleDeleteCreator}
        activeCreatorId={currentCreator.id}
      />
    </div>
  );
}
