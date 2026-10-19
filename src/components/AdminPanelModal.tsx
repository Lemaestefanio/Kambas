import React, { useState } from 'react';
import {
  X,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Plus,
  Sparkles,
  Shield,
  Key,
  CheckCircle2,
  Video,
  Image as ImageIcon,
  DollarSign,
  Copy,
  Link,
  Check,
  User,
  CreditCard,
  Play,
  Clock,
  Layers,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Creator, CreatorPost, StoryHighlight, Plan, MediaPhoto } from '../types';
import { saveCreatorToFirestore, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { compressImageFile } from '../utils/imageCompressor';
import { saveMediaBlob } from '../utils/mediaStorage';
import { LuandaPriveLogo } from './LuandaPriveLogo';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  creators: Creator[];
  onUpdateCreator: (updatedCreator: Creator) => void;
  onAddCreator?: (newCreator: Creator) => void;
  onDeleteCreator?: (creatorId: string) => void;
  activeCreatorId: string;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  creators,
  onUpdateCreator,
  onAddCreator,
  onDeleteCreator,
  activeCreatorId,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Selected Creator for editing
  const [selectedId, setSelectedId] = useState(activeCreatorId || creators[0]?.id);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'posts' | 'gallery' | 'video-paywall' | 'stories' | 'prices' | 'links' | 'cloaking'
  >('profile');

  // Facebook Bot Protection & Cloaking state
  const [fbCloakingEnabled, setFbCloakingEnabled] = useState<boolean>(() => {
    return localStorage.getItem('luanda_prive_fb_cloaking_enabled') === 'true';
  });

  // GPO / Gateway API Credentials state
  const [gpoApiKey, setGpoApiKey] = useState(
    () => localStorage.getItem('luanda_prive_gpo_api_key') || ''
  );
  const [gpoMerchantId, setGpoMerchantId] = useState(
    () => localStorage.getItem('luanda_prive_gpo_merchant_id') || ''
  );
  const [gpoSecretKey, setGpoSecretKey] = useState(
    () => localStorage.getItem('luanda_prive_gpo_secret_key') || ''
  );
  const [gpoEnvironment, setGpoEnvironment] = useState<'sandbox' | 'production'>(
    () => (localStorage.getItem('luanda_prive_gpo_env') as any) || 'production'
  );

  // Selected Creator data
  const currentCreator = creators.find((c) => c.id === selectedId) || creators[0];

  // Editable Profile fields
  const [profileName, setProfileName] = useState(currentCreator?.name || '');
  const [profileBio, setProfileBio] = useState(currentCreator?.bio || '');
  const [profileNeighborhood, setProfileNeighborhood] = useState(currentCreator?.neighborhood || '');
  const [profileAvatar, setProfileAvatar] = useState(currentCreator?.avatar || '');
  const [profileBanner, setProfileBanner] = useState(currentCreator?.banner || '');
  const [profileWhatsapp, setProfileWhatsapp] = useState(currentCreator?.whatsappNumber || '+244 945 882 109');

  // Video Paywall & Teaser fields
  const [previewVideoUrl, setPreviewVideoUrl] = useState(currentCreator?.previewVideo || '');
  const [videoPaywallSeconds, setVideoPaywallSeconds] = useState(currentCreator?.videoPaywallSeconds || 4.5);
  const [creatorCheckoutUrl, setCreatorCheckoutUrl] = useState(currentCreator?.checkoutUrl || '');
  const [creatorTipCheckoutUrl, setCreatorTipCheckoutUrl] = useState(currentCreator?.tipCheckoutUrl || '');
  const [preferInternalCheckout, setPreferInternalCheckout] = useState<boolean>(
    currentCreator?.preferInternalCheckout !== false
  );

  // New Post Form state
  const [postType, setPostType] = useState<'photo' | 'video'>('photo');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postText, setPostText] = useState('');
  const [postUnlocked, setPostUnlocked] = useState(false); // false = blurred VIP, true = public preview
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Gallery Form state
  const [galleryPhotoUrl, setGalleryPhotoUrl] = useState('');
  const [galleryPhotoCaption, setGalleryPhotoCaption] = useState('');
  const [galleryPhotoUnlocked, setGalleryPhotoUnlocked] = useState(true);

  // New Story Form state
  const [storyType, setStoryType] = useState<'image' | 'video'>('image');
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyTitle, setStoryTitle] = useState('');
  const [storyCaption, setStoryCaption] = useState('');

  // Editable Plan Prices & Mimos state
  const [plansState, setPlansState] = useState<Plan[]>(currentCreator?.plans || []);
  const [mimoPricesState, setMimoPricesState] = useState<number[]>(
    currentCreator?.mimoPrices || [2000, 5000, 10000, 20000]
  );

  // Bank & MCX details state
  const [mcxPhone, setMcxPhone] = useState('945 882 109');
  const [bankIban, setBankIban] = useState('AO06 0040 0000 8923 1102 1014 9');
  const [bankBeneficiary, setBankBeneficiary] = useState('Serviços Digitais Privé AO');

  // Update inputs when switching creator
  const handleSelectCreator = (id: string) => {
    setSelectedId(id);
    const cr = creators.find((c) => c.id === id);
    if (cr) {
      setProfileName(cr.name);
      setProfileBio(cr.bio);
      setProfileNeighborhood(cr.neighborhood);
      setProfileAvatar(cr.avatar);
      setProfileBanner(cr.banner);
      setProfileWhatsapp(cr.whatsappNumber);
      setPreviewVideoUrl(cr.previewVideo || '');
      setVideoPaywallSeconds(cr.videoPaywallSeconds || 4.5);
      setCreatorCheckoutUrl(cr.checkoutUrl || '');
      setCreatorTipCheckoutUrl(cr.tipCheckoutUrl || '');
      setPlansState(cr.plans);
    }
  };

  if (!isOpen) return null;

  // PIN Authentication gate: PIN master é 2026
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.trim() === '2026' || adminPin.trim().toLowerCase() === 'admin' || adminPin.trim() === '1234') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Helper to handle local file upload with automatic compression into lightweight Base64
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onComplete: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (file.type.startsWith('image/')) {
        // High quality compression down to ~150-250KB JPEG for lightning fast loading
        const compressed = await compressImageFile(file, 1080, 0.82);
        onComplete(compressed);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          onComplete(result);
          setIsUploading(false);
        };
        reader.onerror = () => {
          alert('Erro ao carregar o vídeo. Tenta outro formato.');
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('File compression error:', err);
      alert('Erro ao processar ficheiro de imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCreator: Creator = {
      ...currentCreator,
      name: profileName,
      bio: profileBio,
      neighborhood: profileNeighborhood,
      avatar: profileAvatar,
      banner: profileBanner,
      whatsappNumber: profileWhatsapp,
    };

    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);
    setSaveSuccessMessage(`Perfil de ${currentCreator.shortName} atualizado com sucesso no Firestore!`);
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Add new Post to Creator
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postMediaUrl && !postText) {
      alert('Por favor adiciona uma imagem/vídeo ou um texto para o post.');
      return;
    }

    const newPost: CreatorPost = {
      id: `post-${Date.now()}`,
      time: 'Agora mesmo',
      text: postText.trim() || 'Novo conteúdo exclusivo!',
      type: postType,
      image: postType === 'photo' ? postMediaUrl : undefined,
      video: postType === 'video' ? postMediaUrl : undefined,
      likes: Math.floor(Math.random() * 50) + 120,
      comments: Math.floor(Math.random() * 20) + 15,
      unlocked: postUnlocked, // true = visible, false = blurred
    };

    const updatedPosts = [newPost, ...currentCreator.posts];

    const updatedCreator: Creator = {
      ...currentCreator,
      posts: updatedPosts,
      postCount: updatedPosts.length,
      stats: {
        ...currentCreator.stats,
        photos: postType === 'photo' ? currentCreator.stats.photos + 1 : currentCreator.stats.photos,
        videos: postType === 'video' ? currentCreator.stats.videos + 1 : currentCreator.stats.videos,
      },
    };

    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);

    setPostMediaUrl('');
    setPostText('');
    setSaveSuccessMessage('Publicação adicionada com sucesso ao feed da criadora!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Toggle blur/unlocked on existing post
  const handleTogglePostBlur = async (postId: string) => {
    const updatedPosts = currentCreator.posts.map((p) =>
      p.id === postId ? { ...p, unlocked: !p.unlocked } : p
    );
    const updatedCreator: Creator = {
      ...currentCreator,
      posts: updatedPosts,
    };
    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);
  };

  // Delete existing post (cleanly removes from state and Firestore)
  const handleDeletePost = async (postId: string) => {
    const updatedPosts = currentCreator.posts.filter((p) => p.id !== postId);
    const updatedCreator: Creator = {
      ...currentCreator,
      posts: updatedPosts,
      postCount: updatedPosts.length,
    };
    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);
    setSaveSuccessMessage('Publicação eliminada com sucesso!');
    setTimeout(() => setSaveSuccessMessage(''), 2500);
  };

  // Add photo to creator gallery
  const handleAddGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryPhotoUrl) {
      alert('Por favor escolhe uma fotografia para a galeria.');
      return;
    }

    const newPhoto: MediaPhoto = {
      id: `photo-${Date.now()}`,
      url: galleryPhotoUrl,
      caption: galleryPhotoCaption.trim() || `Sessão exclusiva de ${currentCreator.shortName}`,
      likes: Math.floor(Math.random() * 50) + 120,
      unlocked: galleryPhotoUnlocked,
    };

    const updatedGallery = [newPhoto, ...currentCreator.galleryPhotos];
    const updatedCreator: Creator = {
      ...currentCreator,
      galleryPhotos: updatedGallery,
      stats: {
        ...currentCreator.stats,
        photos: updatedGallery.length,
      },
    };

    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);

    setGalleryPhotoUrl('');
    setGalleryPhotoCaption('');
    setSaveSuccessMessage('Foto adicionada à galeria exclusiva com sucesso!');
    setTimeout(() => setSaveSuccessMessage(''), 2500);
  };

  // Delete photo from creator gallery
  const handleDeleteGalleryPhoto = async (photoId: string) => {
    const updatedGallery = currentCreator.galleryPhotos.filter((p) => p.id !== photoId);
    const updatedCreator: Creator = {
      ...currentCreator,
      galleryPhotos: updatedGallery,
      stats: {
        ...currentCreator.stats,
        photos: updatedGallery.length,
      },
    };

    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);
    setSaveSuccessMessage('Fotografia eliminada da galeria!');
    setTimeout(() => setSaveSuccessMessage(''), 2500);
  };

  // Save Video Paywall Settings
  const handleSaveVideoPaywall = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCreator: Creator = {
      ...currentCreator,
      previewVideo: previewVideoUrl,
      videoPaywallSeconds: Number(videoPaywallSeconds) || 4.5,
      checkoutUrl: creatorCheckoutUrl.trim() || undefined,
    };

    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);
    setSaveSuccessMessage('Configurações de vídeo e paywall salvas com sucesso!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Add new Story
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyMediaUrl) {
      alert('Por favor carrega uma imagem ou vídeo para o story.');
      return;
    }

    const newStory: StoryHighlight = {
      id: `story-${Date.now()}`,
      title: storyTitle.trim() || 'Novidade VIP',
      caption: storyCaption.trim() || 'Story exclusivo de Luanda',
      coverImage: storyType === 'image' ? storyMediaUrl : currentCreator.avatar,
      mediaUrl: storyMediaUrl,
      type: storyType,
      time: 'Há pouco',
    };

    const updatedHighlights = [newStory, ...currentCreator.highlights];
    const updatedCreator: Creator = {
      ...currentCreator,
      highlights: updatedHighlights,
    };

    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);

    setStoryMediaUrl('');
    setStoryTitle('');
    setStoryCaption('');
    setSaveSuccessMessage('Story adicionado com sucesso aos destaques!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Delete story
  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Eliminar este story?')) return;
    const updatedHighlights = currentCreator.highlights.filter((s) => s.id !== storyId);
    const updatedCreator: Creator = {
      ...currentCreator,
      highlights: updatedHighlights,
    };
    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);
  };

  // Handle plan price change
  const handlePlanPriceChange = (index: number, newPrice: string, newRawPrice: number) => {
    setPlansState((prev) =>
      prev.map((p, idx) =>
        idx === index ? { ...p, price: newPrice, rawPrice: newRawPrice } : p
      )
    );
  };

  // Save prices & external checkout links to Firestore
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCreator: Creator = {
      ...currentCreator,
      plans: plansState,
      checkoutUrl: creatorCheckoutUrl.trim() || undefined,
      tipCheckoutUrl: creatorTipCheckoutUrl.trim() || undefined,
      mimoPrices: mimoPricesState,
      preferInternalCheckout,
    };

    onUpdateCreator(updatedCreator);
    await saveCreatorToFirestore(updatedCreator);

    try {
      const bankRef = doc(db, 'settings', 'bank');
      await setDoc(bankRef, {
        mcxPhone,
        bankIban,
        bankBeneficiary,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Could not save bank settings doc:', e);
    }

    setSaveSuccessMessage('Preços e links de checkout externo guardados com sucesso!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Toggle Facebook Anti-Bot Cloaking
  const handleToggleCloaking = (enabled: boolean) => {
    setFbCloakingEnabled(enabled);
    localStorage.setItem('luanda_prive_fb_cloaking_enabled', enabled ? 'true' : 'false');
    setSaveSuccessMessage(
      enabled
        ? 'Modo Camuflagem Anti-Robô Facebook ATIVADO! Anúncios protegidos pela tela de 2 cliques.'
        : 'Modo Camuflagem Desativado. Visitantes entram diretamente no feed.'
    );
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Save GPO Gateway API settings
  const handleSaveGpo = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('luanda_prive_gpo_api_key', gpoApiKey.trim());
    localStorage.setItem('luanda_prive_gpo_merchant_id', gpoMerchantId.trim());
    localStorage.setItem('luanda_prive_gpo_secret_key', gpoSecretKey.trim());
    localStorage.setItem('luanda_prive_gpo_env', gpoEnvironment);
    setSaveSuccessMessage('Credenciais e chaves do Gateway GPO guardadas com sucesso!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Copy link helper
  const handleCopyLink = (path: string, key: string) => {
    const origin = window.location.origin;
    const fullUrl = `${origin}${path}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[94vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative animate-scaleUp">
        {/* Header */}
        <div className="bg-slate-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00aff0] to-blue-600 flex items-center justify-center text-white shadow-sm font-black text-xs">
              LP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Luanda Privé · Painel Administrativo Secreto
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Agência
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gere fotos, vídeos com paywall, stories, preços e links externos de pagamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Security Gate */}
        {!isAuthenticated ? (
          <div className="p-8 text-center max-w-sm mx-auto my-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00aff0]/10 border border-[#00aff0]/20 text-[#00aff0] flex items-center justify-center mx-auto">
              <Key className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Acesso Restrito ao Gestor</h3>
            <p className="text-xs text-slate-500">
              Digita a palavra-passe ou PIN master da agência para aceder ao painel.
            </p>
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="PIN ou Senha (ex: 2026)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-center font-mono text-sm tracking-widest focus:outline-none focus:border-[#00aff0]"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-600 font-medium">
                  PIN incorreto. O PIN master é <strong className="font-bold">2026</strong>.
                </p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 cursor-pointer"
              >
                Entrar no Painel Secreto
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Selector: Models Grid Bar */}
            <div className="bg-slate-100 p-3 border-b border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Seleciona a Criadora para Gerir:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {creators.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCreator(c.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      c.id === selectedId
                        ? 'bg-white border-[#00aff0] text-[#00aff0] shadow-sm ring-2 ring-[#00aff0]/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <img
                      src={c.avatar}
                      alt={c.shortName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>{c.shortName}</span>
                  </button>
                ))}
              </div>

              {/* Navigation Tabs for Selected Creator */}
              <div className="flex items-center bg-slate-200/90 p-1 rounded-xl gap-1 overflow-x-auto mt-2.5">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-white text-[#00aff0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Perfil & Fotos
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'posts'
                      ? 'bg-white text-[#00aff0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Feed ({currentCreator.posts.length})
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    activeTab === 'gallery'
                      ? 'bg-white text-[#00aff0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Galeria VIP ({currentCreator.galleryPhotos.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('video-paywall')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    activeTab === 'video-paywall'
                      ? 'bg-white text-[#00aff0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  <span>Vídeo com Paywall</span>
                </button>
                <button
                  onClick={() => setActiveTab('stories')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'stories'
                      ? 'bg-white text-[#00aff0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Stories
                </button>
                <button
                  onClick={() => setActiveTab('prices')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    activeTab === 'prices'
                      ? 'bg-white text-[#00aff0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Preços & Links de Checkout</span>
                </button>
                <button
                  onClick={() => setActiveTab('links')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'links'
                      ? 'bg-white text-[#00aff0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Links das Páginas
                </button>
                <button
                  onClick={() => setActiveTab('cloaking')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'cloaking'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50/80 border border-emerald-200/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Robôs Facebook (2 Cliques)</span>
                </button>
              </div>
            </div>

            {/* Notification message */}
            {saveSuccessMessage && (
              <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* TAB 1: PERFIL & FOTOS REAIS */}
            {activeTab === 'profile' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl mx-auto">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Identidade & Fotografias Reais de {currentCreator.shortName}
                    </h4>

                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#00aff0] bg-slate-200 shrink-0">
                        <img
                          src={profileAvatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Foto de Perfil (Avatar Real)
                        </label>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#00aff0] rounded-xl text-xs font-semibold cursor-pointer shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-[#00aff0]" />
                          <span>Subir Nova Foto da Galeria</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileChange(e, (dataUrl) => setProfileAvatar(dataUrl))
                            }
                          />
                        </label>
                      </div>
                    </div>

                    {/* Banner */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Foto de Capa / Banner
                      </label>
                      <div className="w-full h-20 rounded-xl overflow-hidden bg-slate-200 relative mb-2">
                        <img
                          src={profileBanner}
                          alt="Banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#00aff0] rounded-xl text-xs font-semibold cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#00aff0]" />
                        <span>Subir Nova Capa</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileChange(e, (dataUrl) => setProfileBanner(dataUrl))
                          }
                        />
                      </label>
                    </div>

                    {/* Name & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Bairro em Luanda
                        </label>
                        <input
                          type="text"
                          value={profileNeighborhood}
                          onChange={(e) => setProfileNeighborhood(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        WhatsApp de Atendimento da Criadora
                      </label>
                      <input
                        type="text"
                        value={profileWhatsapp}
                        onChange={(e) => setProfileWhatsapp(e.target.value)}
                        placeholder="+244 945 882 109"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Biografia
                      </label>
                      <textarea
                        rows={3}
                        value={profileBio}
                        onChange={(e) => setProfileBio(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    Guardar Perfil de {currentCreator.shortName}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: FOTOS & VÍDEOS (DESFOQUE VS VISÍVEL) */}
            {activeTab === 'posts' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                <form
                  onSubmit={handleCreatePost}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#00aff0]" />
                      <span>Subir Mídia para {currentCreator.shortName}</span>
                    </h4>
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => setPostType('photo')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          postType === 'photo'
                            ? 'bg-[#00aff0] text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostType('video')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          postType === 'video'
                            ? 'bg-[#00aff0] text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Vídeo</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ficheiro ({postType === 'photo' ? 'Imagem JPG/PNG' : 'Vídeo MP4'})
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="border-2 border-dashed border-slate-300 hover:border-[#00aff0] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition-all">
                        <Upload className="w-6 h-6 text-[#00aff0] mb-1" />
                        <span className="text-xs font-bold text-slate-700">
                          {isUploading ? 'A carregar ficheiro...' : 'Subir do Telemóvel / PC'}
                        </span>
                        <span className="text-[10px] text-slate-400">Escolhe da tua galeria</span>
                        <input
                          type="file"
                          accept={postType === 'photo' ? 'image/*' : 'video/*'}
                          className="hidden"
                          onChange={(e) =>
                            handleFileChange(e, (dataUrl) => setPostMediaUrl(dataUrl))
                          }
                        />
                      </label>

                      <div className="flex flex-col justify-center">
                        <input
                          type="text"
                          placeholder="Ou cola o URL do vídeo/imagem"
                          value={postMediaUrl.startsWith('data:') ? 'Ficheiro local carregado com sucesso' : postMediaUrl}
                          onChange={(e) => setPostMediaUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                        />
                        {postMediaUrl && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600 font-bold">
                              ✓ Mídia pronta para publicar
                            </span>
                            <button
                              type="button"
                              onClick={() => setPostMediaUrl('')}
                              className="text-[10px] text-rose-500 underline"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* VISIBILITY TOGGLE (DESFOQUE VS VISIBILIDADE TOTAL) */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Modo de Visibilidade (Tu decides!)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Define se fica bloqueado com desfoque sensual ou totalmente visível como prévia.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPostUnlocked(false)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          !postUnlocked
                            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs ring-1 ring-rose-300'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>🔒 Desfoque (VIP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPostUnlocked(true)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          postUnlocked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs ring-1 ring-emerald-300'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>👁️ Visibilidade Total</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Legenda / Texto do Post
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: O que acharam deste biquíni novo? 🍑🇦🇴"
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-[#00aff0] hover:to-[#009ed9] text-white font-bold text-xs rounded-xl shadow transition-all active:scale-98 cursor-pointer"
                  >
                    Publicar no Feed de {currentCreator.shortName}
                  </button>
                </form>

                {/* List of Posts */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                    <span>Publicações no Feed ({currentCreator.posts.length})</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Clica no ícone para alternar desfoque/visível
                    </span>
                  </h4>

                  <div className="space-y-2.5">
                    {currentCreator.posts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 relative">
                            {post.image ? (
                              <img
                                src={post.image}
                                alt="Post"
                                className={`w-full h-full object-cover ${
                                  !post.unlocked ? 'blur-xs scale-110' : ''
                                }`}
                              />
                            ) : post.video ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                                <Video className="w-5 h-5 text-[#00aff0]" />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-600 text-[10px] font-bold">
                                TXT
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {post.text || 'Sem texto'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>{post.time}</span>
                              <span>·</span>
                              <span
                                className={`font-semibold ${
                                  post.unlocked ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {post.unlocked ? '👁️ Visibilidade Total' : '🔒 Desfoque VIP'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePostBlur(post.id)}
                            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              post.unlocked
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={
                              post.unlocked
                                ? 'Mudar para Desfoque VIP'
                                : 'Mudar para Visibilidade Total'
                            }
                          >
                            {post.unlocked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">
                              {post.unlocked ? 'Desfocar' : 'Tornar Visível'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                            title="Eliminar post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GALERIA VIP (ADICIONAR & ELIMINAR FOTOS) */}
            {activeTab === 'gallery' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                {/* Form to add photo */}
                <form
                  onSubmit={handleAddGalleryPhoto}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#00aff0]" />
                      <span>Adicionar Foto à Galeria de {currentCreator.shortName}</span>
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Fotografia (JPG ou PNG)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="border-2 border-dashed border-slate-300 hover:border-[#00aff0] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition-all">
                        <Upload className="w-6 h-6 text-[#00aff0] mb-1" />
                        <span className="text-xs font-bold text-slate-700">
                          {isUploading ? 'A comprimir imagem...' : 'Subir do Telemóvel / PC'}
                        </span>
                        <span className="text-[10px] text-slate-400">Comprime automaticamente</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileChange(e, (dataUrl) => setGalleryPhotoUrl(dataUrl))
                          }
                        />
                      </label>

                      <div className="flex flex-col justify-center">
                        <input
                          type="text"
                          placeholder="Ou cola o URL da foto"
                          value={galleryPhotoUrl.startsWith('data:') ? 'Foto pronta para envio' : galleryPhotoUrl}
                          onChange={(e) => setGalleryPhotoUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                        />
                        {galleryPhotoUrl && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600 font-bold">
                              ✓ Foto carregada
                            </span>
                            <button
                              type="button"
                              onClick={() => setGalleryPhotoUrl('')}
                              className="text-[10px] text-rose-500 underline"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Legenda da Foto
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Ensaio exclusivo na praia da Ilha..."
                      value={galleryPhotoCaption}
                      onChange={(e) => setGalleryPhotoCaption(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                    />
                  </div>

                  {/* Lock toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGalleryPhotoUnlocked(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        !galleryPhotoUnlocked
                          ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>🔒 Com Desfoque (VIP)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryPhotoUnlocked(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        galleryPhotoUnlocked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>👁️ Aberta / Prévia Total</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-[#00aff0] hover:to-[#009ed9] text-white font-bold text-xs rounded-xl shadow transition-all active:scale-98 cursor-pointer"
                  >
                    Guardar Foto na Galeria
                  </button>
                </form>

                {/* Grid of gallery photos with delete */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                    <span>Fotos na Galeria ({currentCreator.galleryPhotos.length})</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Clica no ícone vermelho para eliminar qualquer foto
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {currentCreator.galleryPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col"
                      >
                        <div className="relative aspect-square bg-slate-100">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className={`w-full h-full object-cover ${
                              !photo.unlocked ? 'blur-xs scale-105' : ''
                            }`}
                          />
                          <span
                            className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              photo.unlocked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-black/70 text-white'
                            }`}
                          >
                            {photo.unlocked ? 'Visível' : 'VIP'}
                          </span>
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <p className="text-[11px] font-semibold text-slate-700 truncate">
                            {photo.caption || 'Sem legenda'}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryPhoto(photo.id)}
                            className="mt-2 w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VÍDEO COM PAYWALL (TEASER QUE PAUSA E COBRA) */}
            {activeTab === 'video-paywall' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form onSubmit={handleSaveVideoPaywall} className="space-y-5 max-w-xl mx-auto">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-[#00aff0]" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Vídeo Teaser com Pausa e Paywall na Tela
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O visitante dá play no vídeo da criadora (no feed ou na página de mensagens), o vídeo toca durante os segundos que definires e depois **pausa automaticamente** apresentando na tela o botão/link para fazer o pagamento!
                    </p>

                    {/* Video File / URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Ficheiro do Vídeo Teaser (MP4)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="border-2 border-dashed border-slate-300 hover:border-[#00aff0] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition-all">
                          <Upload className="w-6 h-6 text-[#00aff0] mb-1" />
                          <span className="text-xs font-bold text-slate-700">
                            {isUploading ? 'A carregar vídeo...' : 'Subir Vídeo da Galeria / PC'}
                          </span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileChange(e, (dataUrl) => setPreviewVideoUrl(dataUrl))
                            }
                          />
                        </label>
                        <div className="flex flex-col justify-center">
                          <input
                            type="text"
                            placeholder="Ou caminho do vídeo (/assets/preview-video.mp4)"
                            value={previewVideoUrl.startsWith('data:') ? 'Vídeo local carregado com sucesso' : previewVideoUrl}
                            onChange={(e) => setPreviewVideoUrl(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seconds before auto-pausing */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#00aff0]" />
                        <span>Quantos segundos o vídeo toca antes de parar e cobrar?</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="30"
                          value={videoPaywallSeconds}
                          onChange={(e) => setVideoPaywallSeconds(parseFloat(e.target.value) || 4.5)}
                          className="w-24 px-3 py-2 text-xs font-bold font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                        />
                        <span className="text-xs font-bold text-slate-600">segundos</span>
                        <span className="text-[11px] text-slate-400">
                          (Recomendado: 3 a 5 segundos para gerar curiosidade máxima)
                        </span>
                      </div>
                    </div>

                    {/* Link de Checkout Externo no Player */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
                        <span>Link de Checkout Externo para o Botão do Vídeo (Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: https://pay.meuskambas.online/checkout/... ou WhatsApp de pagamento"
                        value={creatorCheckoutUrl}
                        onChange={(e) => setCreatorCheckoutUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Se deixares vazio, abre o modal oficial de escolha de planos e pagamento via Multicaixa Express da plataforma.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    Guardar Configurações do Player de Vídeo
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: STORIES */}
            {activeTab === 'stories' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                <form
                  onSubmit={handleCreateStory}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#00aff0]" />
                      <span>Adicionar Story para {currentCreator.shortName}</span>
                    </h4>
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => setStoryType('image')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          storyType === 'image'
                            ? 'bg-[#00aff0] text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryType('video')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          storyType === 'video'
                            ? 'bg-[#00aff0] text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        Vídeo
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ficheiro do Story (Galeria do Telemóvel ou PC)
                    </label>
                    <label className="border-2 border-dashed border-slate-300 hover:border-[#00aff0] rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition-all">
                      <Upload className="w-6 h-6 text-[#00aff0] mb-1" />
                      <span className="text-xs font-bold text-slate-700">
                        {isUploading ? 'A carregar ficheiro...' : 'Subir Story da Galeria'}
                      </span>
                      <input
                        type="file"
                        accept={storyType === 'image' ? 'image/*' : 'video/*'}
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, (dataUrl) => setStoryMediaUrl(dataUrl))
                        }
                      />
                    </label>
                    {storyMediaUrl && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">
                        ✓ Ficheiro carregado com sucesso!
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Título do Destaque
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Noite Luanda, Bikini, Hotel..."
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Legenda no Ecrã
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Quem me convida para sair hoje? 🍾"
                        value={storyCaption}
                        onChange={(e) => setStoryCaption(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs rounded-xl shadow transition-all active:scale-98 cursor-pointer"
                  >
                    Publicar Story de {currentCreator.shortName}
                  </button>
                </form>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                    Stories Atuais ({currentCreator.highlights.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {currentCreator.highlights.map((story) => (
                      <div
                        key={story.id}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-2 relative shadow-xs group"
                      >
                        <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-100 relative mb-2">
                          <img
                            src={story.coverImage || story.mediaUrl}
                            alt={story.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {story.type}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 truncate">
                          {story.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 truncate">
                          {story.caption}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteStory(story.id)}
                          className="mt-2 w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PREÇOS & LINKS DE CHECKOUT EXTERNO */}
            {activeTab === 'prices' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form onSubmit={handleSavePrices} className="space-y-5 max-w-xl mx-auto">
                  {/* External Checkout Links */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                        Links de Checkout Externo de {currentCreator.shortName}
                      </h4>
                    </div>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Configura os links externos para onde os clientes serão redirecionados quando clicarem em pagar ou enviar mimo:
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Link de Checkout dos Planos / Assinatura VIP
                      </label>
                      <input
                        type="text"
                        value={creatorCheckoutUrl}
                        onChange={(e) => setCreatorCheckoutUrl(e.target.value)}
                        placeholder="https://pay.exemplo.com/checkout/sandra-vip"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#00aff0]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Link de Checkout dos Mimos / Gorjetas (Tips)
                      </label>
                      <input
                        type="text"
                        value={creatorTipCheckoutUrl}
                        onChange={(e) => setCreatorTipCheckoutUrl(e.target.value)}
                        placeholder="https://pay.exemplo.com/checkout/mimo-sandra"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#00aff0]"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Quando a pessoa clica para dar um mimo, vai diretamente para este link externo configurado (caso escolha modo externo)!
                      </p>
                    </div>
                  </div>

                  {/* Checkout Mode Preference */}
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-700" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-purple-900">
                        Destino do Pagamento dos Fãs
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreferInternalCheckout(true)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          preferInternalCheckout
                            ? 'bg-purple-900 text-white border-purple-950 shadow-sm ring-2 ring-purple-400'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black block">✓ Checkout Interno Oficial</span>
                        <span className={`text-[10px] block mt-0.5 ${preferInternalCheckout ? 'text-purple-200' : 'text-slate-500'}`}>
                          Multicaixa Express + Referência + 3 Order Bumps integrados na plataforma.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreferInternalCheckout(false)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          !preferInternalCheckout
                            ? 'bg-purple-900 text-white border-purple-950 shadow-sm ring-2 ring-purple-400'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black block">↗ Checkout Externo</span>
                        <span className={`text-[10px] block mt-0.5 ${!preferInternalCheckout ? 'text-purple-200' : 'text-slate-500'}`}>
                          Leva o fã para os links externos configurados acima (ex: MeusKambas, etc).
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Mimo / Tip Prices */}
                  <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-rose-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                        Preços dos Mimos / Gorjetas (Kwanzas)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Personaliza o valor dos 4 botões de mimo que os fãs usam para agradar a criadora:
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      {['Mimo Cafézinho ☕', 'Mimo Especial 💋', 'Mimo Champagne 🍾', 'Mimo VIP Supremo 👑'].map((name, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">{name}</label>
                          <input
                            type="text"
                            value={`${(mimoPricesState[idx] || [2000, 5000, 10000, 20000][idx]).toLocaleString('pt-AO')} Kz`}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                              setMimoPricesState((prev) => {
                                const next = [...prev];
                                next[idx] = raw;
                                return next;
                              });
                            }}
                            className="w-full px-2.5 py-1 text-xs font-bold font-mono border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#00aff0]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan Prices */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#00aff0]" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Preços dos Planos VIP (Kwanzas)
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {plansState.map((plan, idx) => (
                        <div
                          key={plan.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {plan.duration}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {plan.periodLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={plan.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                const raw = parseInt(val.replace(/[^0-9]/g, '')) || 0;
                                handlePlanPriceChange(idx, val, raw);
                              }}
                              className="w-28 px-3 py-1.5 text-xs font-bold font-mono border border-slate-300 rounded-lg text-right focus:outline-none focus:border-[#00aff0]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Multicaixa Express and Bank Details */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Dados Locais de Multicaixa Express (MCX)
                      </h4>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Número de Telefone MCX / Unitel Money
                      </label>
                      <input
                        type="text"
                        value={mcxPhone}
                        onChange={(e) => setMcxPhone(e.target.value)}
                        placeholder="Ex: 945 882 109"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        IBAN para Transferências
                      </label>
                      <input
                        type="text"
                        value={bankIban}
                        onChange={(e) => setBankIban(e.target.value)}
                        placeholder="Ex: AO06 0040 0000 8923 1102 1014 9"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome do Titular / Beneficiário Discreto
                      </label>
                      <input
                        type="text"
                        value={bankBeneficiary}
                        onChange={(e) => setBankBeneficiary(e.target.value)}
                        placeholder="Ex: Serviços Digitais Privé AO"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#00aff0]"
                      />
                    </div>
                  </div>

                  {/* Gateway GPO & API Key Settings */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                        Integração Gateway GPO / Multicaixa Direct API (Opcional)
                      </h4>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Quando receberes a chave API ou credenciais da rede GPO / EMIS / Multicaixa, podes colar aqui para processamento automático interno:
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chave API / Token GPO (API Key)
                      </label>
                      <input
                        type="password"
                        value={gpoApiKey}
                        onChange={(e) => setGpoApiKey(e.target.value)}
                        placeholder="gpo_live_xxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-mono bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Merchant ID / Entidade
                        </label>
                        <input
                          type="text"
                          value={gpoMerchantId}
                          onChange={(e) => setGpoMerchantId(e.target.value)}
                          placeholder="Ex: 10429"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-mono bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Ambiente GPO
                        </label>
                        <select
                          value={gpoEnvironment}
                          onChange={(e: any) => setGpoEnvironment(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                        >
                          <option value="production">Produção (Live Multicaixa)</option>
                          <option value="sandbox">Testes (Sandbox / Homologação)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    Guardar Preços e Links de Checkout
                  </button>
                </form>
              </div>
            )}

            {/* TAB 6: LINKS DAS PÁGINAS */}
            {activeTab === 'links' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                    <Link className="w-4 h-4 text-[#00aff0]" />
                    <span>Links Específicos das Páginas da Luanda Privé</span>
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Nenhum cliente vê barras de teste nem botões de admin. Cada página tem o seu link exclusivo para partilhares nas redes sociais:
                  </p>

                  <div className="space-y-3">
                    {/* Link 1: Login Primeiro */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-600">
                          Página 1: Principal com Opção de Login
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                          Rota: /
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Navegação livre pelo feed, prévias abertas e opção de entrar com Google ou como Anónimo.
                      </p>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-700">
                        <span className="truncate">/ (ou /login-first)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('/login-first', 'link1')}
                          className="ml-2 px-2.5 py-1 bg-[#00aff0] text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLink === 'link1' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'link1' ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Link 2: Direto sem Login */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-600">
                          Página 2: Checkout Direto sem Login
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          Rota: /perfil-3
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Zero atrito: clica em qualquer foto bloqueada e abre direto o pagamento sem pedir cadastro.
                      </p>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-700">
                        <span className="truncate">/perfil-3 (ou ?mode=direct-pay)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('/perfil-3', 'link2')}
                          className="ml-2 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLink === 'link2' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'link2' ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Link 3: Teaser Promo 50% OFF */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-rose-600">
                          Página 3: Teaser VIP + 50% OFF (Alta Conversão)
                        </span>
                        <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                          Rota: /promo-3
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Cronómetro de urgência de 15 minutos e oferta especial de boas-vindas com desconto em Kwanzas.
                      </p>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-700">
                        <span className="truncate">/promo-3 (ou ?mode=teaser-promo)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('/promo-3', 'link3')}
                          className="ml-2 px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLink === 'link3' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'link3' ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Link 4: Mensagens Dedicadas com Vídeo Teaser que pausa */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-purple-600">
                          Página 4: Mensagens Dedicadas (Vídeo Teaser que Pausa)
                        </span>
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                          Rota: /mensagens
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Abre direto a conversa da criadora com o vídeo que pausa após alguns segundos pedindo pagamento VIP.
                      </p>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-700">
                        <span className="truncate">/mensagens (ou /chat)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('/mensagens', 'link4')}
                          className="ml-2 px-2.5 py-1 bg-purple-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLink === 'link4' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'link4' ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Link 5: Checkout Interno Oficial com MCX e Referência */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-600">
                          Página 5: Checkout Interno Oficial (MCX + Referência + Order Bumps)
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          Rota: /checkout
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Página de pagamento de alta conversão sem sair da plataforma, com suporte direto a Multicaixa Express e referência ATM.
                      </p>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-700">
                        <span className="truncate">/checkout (ou ?view=checkout)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('/checkout', 'linkCheckout')}
                          className="ml-2 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLink === 'linkCheckout' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'linkCheckout' ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Link 6: Comentários Dedicados estilo OnlyFans / Instagram */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-cyan-600">
                          Página 6: Comentários Dedicados (Estilo Insta/OnlyFans)
                        </span>
                        <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-bold">
                          Rota: /comentarios
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Página dedicada para os fãs interagirem, lerem comentários de outros membros e adicionarem os seus comentários.
                      </p>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-700">
                        <span className="truncate">/comentarios (ou ?view=comments)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('/comentarios', 'linkComments')}
                          className="ml-2 px-2.5 py-1 bg-cyan-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLink === 'linkComments' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'linkComments' ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Link 5: Admin Secreto */}
                    <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-400">
                          Link Secreto do Admin (PIN: 2026)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2">
                        Acede diretamente ao painel administrativo a partir de qualquer dispositivo.
                      </p>
                      <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg text-xs font-mono text-slate-300">
                        <span className="truncate">/admin-loanda-prive (ou ?admin=true)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('/admin-loanda-prive', 'linkAdmin')}
                          className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLink === 'linkAdmin' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'linkAdmin' ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: PROTEÇÃO FACEBOOK & CLOAKING (2 CLIQUES) */}
            {activeTab === 'cloaking' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                {/* Hero / Switch Box */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 rounded-2xl border border-emerald-500/30 text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">
                          Modo Camuflagem Anti-Robô Facebook (2 Cliques)
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          Protege a conta de anúncios da Meta contra bloqueios e rejeições
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleCloaking(!fbCloakingEnabled)}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        fbCloakingEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          fbCloakingEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 leading-relaxed">
                    Status Atual:{' '}
                    <span
                      className={`font-black ${
                        fbCloakingEnabled ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {fbCloakingEnabled
                        ? 'ATIVADO · Os visitantes vindos de anúncios passarão pela prévia dos 2 cliques'
                        : 'DESATIVADO · Visitantes entram diretamente no feed'}
                    </span>
                  </div>
                </div>

                {/* Safe Ad Link to Paste in Facebook Ads Manager */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-emerald-600" />
                      <span>Link Seguro para Colocar nos Anúncios do Facebook</span>
                    </h5>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      100% Aprovável pela Meta
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Usa este link como <strong>URL do Site (Destino)</strong> quando crias a campanha no Gestor de Anúncios da Meta / Facebook Ads:
                  </p>

                  <div className="flex items-center justify-between bg-white border border-slate-300 p-2.5 rounded-xl font-mono text-xs text-slate-800">
                    <span className="truncate">{window.location.origin}/?safe=1</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink('/?safe=1', 'linkSafe')}
                      className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      {copiedLink === 'linkSafe' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink === 'linkSafe' ? 'Copiado!' : 'Copiar Link Seguro'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Também podes usar: <code className="text-slate-800 font-bold">/seguro</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`${window.location.origin}/?safe=1`, '_blank');
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Abrir Teste dos 2 Cliques</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Technical Explanation Guide */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#00aff0]" />
                    <span>Como Funciona a Protecção Técnica Contra os Robôs da Meta</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">1</span>
                        <span>Robô Rastreador</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        O bot da Meta (facebookexternalhit) analisa o link imediatamente. Ele vê a tela segura de estilo de vida, agência e moda, sem palavras adultas, e <strong>aprova o anúncio</strong>.
                      </p>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">2</span>
                        <span>Os 2 Cliques Reais</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        O utilizador real clica no anúncio, faz o 1º clique para ver as criadoras e o 2º clique de confirmação de discrição, entrando direto no feed Luanda Privé.
                      </p>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[11px]">3</span>
                        <span>Zero Bloqueios</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        A conta de anúncios fica 100% blindada, com termos de serviço, privacidade e discrição total em Kwanzas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
