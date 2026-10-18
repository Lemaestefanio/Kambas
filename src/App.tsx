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
import { AgencyPhotoManagerModal } from './components/AgencyPhotoManagerModal';
import { Plan, Creator } from './types';
import { CREATORS } from './data/content';
import {
  subscribeToCreators,
  seedInitialCreatorsIfEmpty,
  updateCreatorAvatarInFirestore,
  batchUpdateAvatarsInFirestore,
} from './firebase';

const getInitialCreators = (): Creator[] => {
  try {
    const saved = localStorage.getItem('agency_custom_avatars');
    if (saved) {
      const customAvatars: Record<string, string> = JSON.parse(saved);
      return CREATORS.map((c) => {
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
    }
  } catch (e) {
    console.error('Failed to load custom avatars from cache:', e);
  }
  return CREATORS;
};

export default function App() {
  const [creatorsList, setCreatorsList] = useState<Creator[]>(getInitialCreators);
  const [activeCreatorId, setActiveCreatorId] = useState<string>(CREATORS[0].id);
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Agency Photo Manager Modal state
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
  const [photoManagerTargetId, setPhotoManagerTargetId] = useState<string | undefined>(undefined);

  // Modals for deep navigation & realism
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePostCaption, setActivePostCaption] = useState('');
  const [isTipOpen, setIsTipOpen] = useState(false);

  // Real-time synchronization with Firebase Firestore
  useEffect(() => {
    // 1. Seed initial agency models into Firestore if database is fresh
    seedInitialCreatorsIfEmpty(CREATORS).catch((err) => {
      console.warn('Firebase seeding notice:', err);
    });

    // 2. Real-time subscription to Firestore creators
    const unsubscribe = subscribeToCreators(
      (firestoreCreators) => {
        if (firestoreCreators && firestoreCreators.length > 0) {
          // Merge with CREATORS defaults to ensure rich client structures are preserved
          const merged = CREATORS.map((def) => {
            const remote = firestoreCreators.find((fc) => fc.id === def.id);
            if (remote) {
              return {
                ...def,
                ...remote,
                // Ensure avatar is applied to first highlight cover if matching
                highlights: def.highlights.map((h, idx) =>
                  idx === 0 && remote.avatar ? { ...h, coverImage: remote.avatar } : h
                ),
              };
            }
            return def;
          });

          // Also include any extra custom models added to Firestore
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

  const handleUpdateAvatar = async (creatorId: string, dataUrl: string) => {
    // Optimistic UI update
    setCreatorsList((prev) =>
      prev.map((c) => {
        if (c.id === creatorId) {
          return {
            ...c,
            avatar: dataUrl,
            highlights: c.highlights.map((h, idx) =>
              idx === 0 ? { ...h, coverImage: dataUrl } : h
            ),
          };
        }
        return c;
      })
    );

    // Save offline cache
    try {
      const saved = JSON.parse(localStorage.getItem('agency_custom_avatars') || '{}');
      saved[creatorId] = dataUrl;
      localStorage.setItem('agency_custom_avatars', JSON.stringify(saved));
    } catch (e) {
      console.error(e);
    }

    // Persist permanently in Firestore Cloud Database
    try {
      setIsCloudSyncing(true);
      await updateCreatorAvatarInFirestore(creatorId, dataUrl);
    } catch (cloudErr) {
      console.error('Failed to sync avatar to Firebase Firestore:', cloudErr);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleBatchUpdateAvatars = async (avatarsMap: Record<string, string>) => {
    // Optimistic UI update
    setCreatorsList((prev) =>
      prev.map((c) => {
        if (avatarsMap[c.id]) {
          return {
            ...c,
            avatar: avatarsMap[c.id],
            highlights: c.highlights.map((h, idx) =>
              idx === 0 ? { ...h, coverImage: avatarsMap[c.id] } : h
            ),
          };
        }
        return c;
      })
    );

    // Save offline cache
    try {
      const saved = JSON.parse(localStorage.getItem('agency_custom_avatars') || '{}');
      const merged = { ...saved, ...avatarsMap };
      localStorage.setItem('agency_custom_avatars', JSON.stringify(merged));
    } catch (e) {
      console.error(e);
    }

    // Batch commit to Firestore Cloud Database
    try {
      setIsCloudSyncing(true);
      await batchUpdateAvatarsInFirestore(avatarsMap);
    } catch (cloudErr) {
      console.error('Failed to batch save avatars to Firebase:', cloudErr);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleResetAvatars = () => {
    localStorage.removeItem('agency_custom_avatars');
    setCreatorsList(CREATORS);
    // Optionally reseed original avatars to Firestore
    const resetMap: Record<string, string> = {};
    CREATORS.forEach((c) => {
      resetMap[c.id] = c.avatar;
    });
    batchUpdateAvatarsInFirestore(resetMap).catch(console.error);
  };

  const handleOpenPhotoManager = (targetCreatorId?: string) => {
    setPhotoManagerTargetId(targetCreatorId);
    setIsPhotoManagerOpen(true);
  };

  const handleOpenPlans = () => {
    setIsPlansModalOpen(true);
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsPlansModalOpen(false);
    setIsPaymentOpen(true);
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
    setIsCommentsOpen(true);
  };

  const handleOpenTip = () => {
    setIsTipOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] max-w-[600px] mx-auto pb-44 shadow-xl sm:border-x sm:border-slate-200 text-[#1c1e21] relative antialiased">
      {/* 18+ Age Verification Modal */}
      <AgeVerificationModal onVerified={() => setAgeVerified(true)} />

      {/* Live Social Proof Conversion Toasts */}
      {ageVerified && <LiveSocialProofToast />}

      {/* Incoming Message Notification from active creator */}
      {ageVerified && (
        <IncomingMessageToast
          creator={currentCreator}
          onUnlockClick={handleOpenPlans}
        />
      )}

      {/* 1. Header & Top Bar: Sticky OnlyFans Navigation Bar */}
      <OnlyFansHeader
        currentCreator={currentCreator}
        allCreators={creatorsList}
        onSelectCreator={handleSelectCreator}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
        onOpenPhotoManager={() => handleOpenPhotoManager()}
      />

      {/* 2. Perfis Organizados: Stories / Criadoras em Destaque de Luanda */}
      <RecommendedProfilesBar
        creators={creatorsList}
        activeCreatorId={currentCreator.id}
        onSelectCreator={handleSelectCreator}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
      />

      {/* 3. Perfil da Criadora: Capa limpa, Avatar, Estatísticas, Bio e Destaques */}
      <ProfileSection
        creator={currentCreator}
        onOpenStory={handleOpenStory}
        onOpenChat={() => setIsChatOpen(true)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onEditPhoto={() => handleOpenPhotoManager(currentCreator.id)}
      />

      {/* 4. Caixa Principal de Assinatura VIP (OnlyFans Style - Sem expor preço antecipadamente) */}
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

      {/* 6. Feed Dinâmico por Tipo de Conteúdo */}
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

      {/* Barra Inferior Fixa para Desktops/Tablets */}
      <div className="hidden sm:block">
        <StickyBottomBar creator={currentCreator} onUnlockClick={handleOpenPlans} />
      </div>

      {/* Barra de Navegação Inferior Estilo OnlyFans Mobile */}
      <BottomNavOnlyFans
        onHomeClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExploreClick={() => setIsDirectoryOpen(true)}
        onChatClick={() => setIsChatOpen(true)}
        onNotificationsClick={() => setIsDirectoryOpen(true)}
        onUnlockClick={handleOpenPlans}
      />

      {/* Modal Visualizador de Stories em Ecrã Inteiro */}
      <StoryViewerModal
        creator={currentCreator}
        initialStoryIndex={selectedStoryIndex}
        isOpen={isStoryOpen}
        onClose={() => setIsStoryOpen(false)}
        onUnlockClick={handleOpenPlans}
      />

      {/* Gaveta de Chat Privado Interativo com a Criadora */}
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
        onOpenPhotoManager={() => handleOpenPhotoManager()}
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

      {/* Modal Oficial de Escolha de Planos (Abre ao clicar em desbloquear) */}
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

      {/* Modal de Gestão de Fotos Reais da Agência */}
      <AgencyPhotoManagerModal
        isOpen={isPhotoManagerOpen}
        onClose={() => setIsPhotoManagerOpen(false)}
        creators={creatorsList}
        onUpdateAvatar={handleUpdateAvatar}
        onBatchUpdateAvatars={handleBatchUpdateAvatars}
        onResetAvatars={handleResetAvatars}
        initialSelectedCreatorId={photoManagerTargetId}
        isCloudSyncing={isCloudSyncing}
      />
    </div>
  );
}
