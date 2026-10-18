import React from 'react';
import { Creator, StoryHighlight } from '../types';

interface StoryHighlightsBarProps {
  creator: Creator;
  onOpenStory: (index: number) => void;
}

export const StoryHighlightsBar: React.FC<StoryHighlightsBarProps> = ({
  creator,
  onOpenStory,
}) => {
  if (!creator.highlights || creator.highlights.length === 0) return null;

  return (
    <div className="w-full pt-3 pb-2 border-t border-slate-100 mt-2">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        {creator.highlights.map((highlight, idx) => (
          <button
            key={highlight.id}
            onClick={() => onOpenStory(idx)}
            className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
          >
            <div className="w-14 h-14 rounded-full p-[2px] border-2 border-slate-300 group-hover:border-[#00aff0] transition-colors overflow-hidden bg-slate-100">
              <img
                src={highlight.coverImage}
                alt={highlight.title}
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <span className="text-[11px] font-medium text-slate-700 group-hover:text-[#00aff0] transition-colors truncate max-w-[64px]">
              {highlight.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
