import { useSiteContent } from '../cms/SiteContent';
import React from 'react';
import { Image, Video, Mic, FileText } from 'lucide-react';
import { Creator } from '../types';

export type ContentTab = 'posts' | 'photos' | 'videos' | 'audio';

interface TeaserSectionProps {
  creator: Creator;
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  onUnlockClick: () => void;
}

export const TeaserSection: React.FC<TeaserSectionProps> = ({
  creator,
  activeTab,
  onTabChange,
  onUnlockClick,
}) => {
  const { copy } = useSiteContent();
  return (
    <div className="bg-white border-y border-slate-200/80 sticky top-[53px] z-30 shadow-xs">
      {/* 4 Clean Tabs */}
      <div className="flex items-center justify-around overflow-x-auto no-scrollbar">
        <button
          onClick={() => onTabChange('posts')}
          className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider text-center relative transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'posts' ? 'text-[#00aff0]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{copy('home.tabs.posts', { count: creator.postCount })}</span>
          {activeTab === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00aff0] rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('photos')}
          className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider text-center relative transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'photos' ? 'text-[#00aff0]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>{copy('home.tabs.photos', { count: creator.stats.photos })}</span>
          {activeTab === 'photos' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00aff0] rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('videos')}
          className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider text-center relative transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'videos' ? 'text-[#00aff0]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>{copy('home.tabs.videos', { count: creator.stats.videos })}</span>
          {activeTab === 'videos' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00aff0] rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('audio')}
          className={`flex-1 py-3 px-2 text-xs font-bold uppercase tracking-wider text-center relative transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'audio' ? 'text-[#00aff0]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{copy('home.tabs.voice', { count: creator.voiceNotes.length })}</span>
          {activeTab === 'audio' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00aff0] rounded-t-full" />
          )}
        </button>
      </div>
    </div>
  );
};
