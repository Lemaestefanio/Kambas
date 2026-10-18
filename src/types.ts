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

export interface CreatorPost {
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

export interface StoryHighlight {
  id: string;
  title: string;
  coverImage: string;
  mediaUrl: string;
  type: 'image' | 'video';
  caption: string;
  time: string;
}

export interface MediaPhoto {
  id: string;
  url: string;
  caption: string;
  likes: number;
  unlocked?: boolean;
}

export interface VoiceNote {
  id: string;
  title: string;
  duration: string;
  date: string;
  unlocked?: boolean;
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
}

export interface FAQItem {
  question: string;
  answer: string;
}
