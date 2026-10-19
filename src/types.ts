export interface Plan {
  id: string;
  duration: string;
  price: string;
  rawPrice: number;
  periodLabel: string;
  savings?: string;
  badge?: string;
  badgeType?: 'primary' | 'accent' | 'popular';
  isPopular?: boolean;
  checkoutUrl: string;
  features: string[];
}

/** Public preview controls. Blur is a presentation effect, not access control. */
export interface MediaPreviewSettings {
  visibility?: 'public' | 'blurred';
  blurAmount?: number;
  previewAudio?: boolean;
  /** A separate, prepared public teaser; keep private originals outside public data. */
  previewUrl?: string;
  posterUrl?: string;
  unlocked?: boolean;
}

export interface CreatorPost extends MediaPreviewSettings {
  id: string;
  time: string;
  text: string;
  type: 'video' | 'photo';
  video?: string;
  image?: string;
  duration?: string;
  likes: number;
  comments: number;
  unlocked?: boolean;
}

export interface StoryHighlight extends MediaPreviewSettings {
  id: string;
  title: string;
  coverImage: string;
  mediaUrl: string;
  type: 'image' | 'video';
  caption: string;
  time: string;
}

export interface MediaPhoto extends MediaPreviewSettings {
  id: string;
  url: string;
  caption: string;
  likes: number;
  unlocked?: boolean;
}

export interface VoiceNote {
  url?: string;
  id: string;
  title: string;
  duration: string;
  date: string;
  unlocked?: boolean;
}

export interface ManagedComment {
  id: string;
  name: string;
  text: string;
  time: string;
  kind: 'demonstration' | 'real';
  postId?: string;
}

export interface PageVariant {
  label: string;
  checkoutMode: 'guest' | 'account';
  bio?: string;
  customPaymentButtonText?: string;
  checkoutUrl?: string;
  avatar?: string;
  banner?: string;
}

export interface Creator {
  id: string;
  name: string;
  shortName: string;
  handle: string;
  age: number;
  city: string;
  neighborhood: string;
  verified: boolean;
  isOnline: boolean;
  avatar: string;
  banner: string;
  stats: {
    photos: number;
    videos: number;
    likes: string;
  };
  bio: string;
  postCount: number;
  mediaCount: number;
  previewVideo?: string;
  highlights: StoryHighlight[];
  galleryPhotos: MediaPhoto[];
  voiceNotes: VoiceNote[];
  posts: CreatorPost[];
  incomingMessage: string;
  whatsappNumber: string;
  plans: Plan[];
  checkoutUrl?: string;
  tipCheckoutUrl?: string;
  mimoCheckoutUrls?: string[];
  customPaymentButtonText?: string;
  bannerVideo?: string;
  videoPaywallSeconds?: number;
  mimoPrices?: number[];
  preferInternalCheckout?: boolean;
  actionLinks?: Partial<Record<'subscribe' | 'message' | 'tip' | 'signup' | 'login' | 'explore' | 'notifications', string>>;
  managedComments?: ManagedComment[];
  commentsAccess?: 'public' | 'premium';
  pageVariants?: { a?: PageVariant; b?: PageVariant };
  cover?: {
    type: 'image' | 'video';
    positionX: number;
    positionY: number;
    visibility: 'public' | 'blurred';
    blurAmount: number;
    previewAudio: boolean;
    presentation: 'video' | 'premiere';
    startsAt?: string;
    endsAt?: string;
    viewerCount?: number;
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface AppUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  isAnonymous?: boolean;
}

