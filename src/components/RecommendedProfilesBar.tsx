import React from 'react';
import { Flame, CheckCircle2, ChevronRight } from 'lucide-react';
import { Creator } from '../types';

interface RecommendedProfilesBarProps {
  creators: Creator[];
  activeCreatorId: string;
  onSelectCreator: (creator: Creator) => void;
  onOpenDirectory?: () => void;
}

export const RecommendedProfilesBar: React.FC<RecommendedProfilesBarProps> = ({
  creators,
  activeCreatorId,
  onSelectCreator,
  onOpenDirectory,
}) => {
  return (
    <section className="w-full bg-white border-b border-slate-200/80 pt-3 pb-3">
      {/* Header with Title and Online Status */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-900 tracking-tight">
            Perfis em Destaque em Luanda
          </span>
          <span className="text-[10px] bg-sky-50 text-[#00aff0] font-bold px-2 py-0.5 rounded-full border border-sky-100">
            {creators.length} Criadoras
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>

          {onOpenDirectory && (
            <button
              onClick={onOpenDirectory}
              className="text-[11px] font-bold text-[#00aff0] hover:underline flex items-center gap-0.5"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Profiles Carousel */}
      <div className="flex items-start gap-4 px-4 overflow-x-auto no-scrollbar scroll-smooth select-none py-1">
        {creators.map((c) => {
          const isActive = c.id === activeCreatorId;

          return (
            <button
              key={c.id}
              onClick={() => onSelectCreator(c)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none transition-transform active:scale-95"
            >
              {/* Avatar with Story Ring */}
              <div
                className={`relative rounded-full p-[2.5px] transition-all duration-200 ${
                  isActive
                    ? 'ring-2 ring-[#00aff0] shadow-md shadow-[#00aff0]/20 scale-105'
                    : 'bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] to-[#00aff0] opacity-90 group-hover:opacity-100'
                }`}
              >
                <div className="w-[56px] h-[56px] rounded-full border-2 border-white overflow-hidden bg-white">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                </div>

                {/* Live Online Dot */}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
              </div>

              {/* Name & Neighborhood info */}
              <div className="flex flex-col items-center max-w-[70px]">
                <div className="flex items-center justify-center gap-0.5 w-full">
                  <span
                    className={`text-[11px] font-bold leading-tight truncate ${
                      isActive ? 'text-[#00aff0]' : 'text-slate-800'
                    }`}
                  >
                    {c.shortName}
                  </span>
                  {isActive && (
                    <CheckCircle2 className="w-2.5 h-2.5 text-white fill-[#00aff0] shrink-0" />
                  )}
                </div>
                <span className="text-[9px] text-slate-400 font-medium leading-none mt-0.5 truncate w-full text-center">
                  {c.neighborhood.replace('Luanda ', '')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
