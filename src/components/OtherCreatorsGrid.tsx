import { useSiteContent } from '../cms/SiteContent';
import React from 'react';
import { CheckCircle2, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { Creator } from '../types';

interface OtherCreatorsGridProps {
  creators: Creator[];
  currentCreatorId: string;
  onSelectCreator: (creator: Creator) => void;
  onOpenDirectory: () => void;
}

export const OtherCreatorsGrid: React.FC<OtherCreatorsGridProps> = ({
  creators,
  currentCreatorId,
  onSelectCreator,
  onOpenDirectory,
}) => {
  const { copy } = useSiteContent();
  const [showAll, setShowAll] = React.useState(false);
  const otherCreators = creators.filter((c) => c.id !== currentCreatorId);
  const displayedCreators = showAll ? otherCreators : otherCreators.slice(0, 4);

  return (
    <section className="mx-3 sm:mx-4 my-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#00aff0]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              {copy('home.others.title')}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {copy('home.others.count', { count: creators.length })}
          </p>
        </div>

        <button
          onClick={onOpenDirectory}
          className="text-xs font-bold text-[#00aff0] hover:underline shrink-0"
        >
          {copy('home.others.directory')}
        </button>
      </div>

      {/* Grid of Other Creators */}
      <div className="grid grid-cols-2 gap-2.5">
        {displayedCreators.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelectCreator(c)}
            className="group border border-slate-200 rounded-xl overflow-hidden hover:border-[#00aff0] transition-all cursor-pointer bg-slate-50/50 flex flex-col justify-between"
          >
            {/* Banner preview */}
            <div className="relative h-20 w-full overflow-hidden bg-slate-200">
              <img
                src={c.banner}
                alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-full font-mono">
                {copy('home.others.photos', { count: c.stats.photos })}
              </span>
            </div>

            {/* Profile Info */}
            <div className="p-2.5 relative pt-0">
              {/* Avatar overlapping */}
              <div className="relative -mt-6 mb-1.5">
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
                />
                <span className="absolute bottom-0 left-7 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div className="flex items-center gap-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {c.name}
                </h4>
                <CheckCircle2 className="w-3 h-3 text-white fill-[#00aff0] shrink-0" />
              </div>

              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2 truncate">
                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span className="truncate">{c.neighborhood}</span>
              </div>

              <button className="w-full py-1.5 px-2 bg-white hover:bg-[#00aff0] text-slate-800 hover:text-white border border-slate-200 hover:border-[#00aff0] rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs">
                <span>{copy('home.others.viewProfile')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {otherCreators.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <span>{showAll ? copy('home.others.less') : copy('home.others.more', { count: otherCreators.length - 4 })}</span>
        </button>
      )}
    </section>
  );
};
