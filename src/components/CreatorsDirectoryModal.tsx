import React, { useState } from 'react';
import { X, Search, CheckCircle2, Flame, MapPin, ArrowRight } from 'lucide-react';
import { Creator } from '../types';

interface CreatorsDirectoryModalProps {
  creators: Creator[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCreator: (creator: Creator) => void;
}

export const CreatorsDirectoryModal: React.FC<CreatorsDirectoryModalProps> = ({
  creators,
  isOpen,
  onClose,
  onSelectCreator,
}) => {
  if (!isOpen) return null;

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filtered = creators.filter((c) => {
    const matchesFilter =
      activeFilter === 'all' ||
      c.neighborhood.toLowerCase().includes(activeFilter.toLowerCase());
    const matchesQuery =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.city.toLowerCase().includes(query.toLowerCase()) ||
      c.neighborhood.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-[10004] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#f97316] fill-[#f97316]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Explorar Criadoras de Angola 🇦🇴
              </h2>
              <p className="text-[11px] text-slate-500">
                Seleciona uma criadora para entrar no perfil e ver conteúdos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter pills */}
        <div className="p-3 border-b border-slate-100 space-y-2 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar criadoras por nome ou bairro..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00aff0]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'centro', label: 'Luanda Centro' },
              { id: 'talatona', label: 'Talatona' },
              { id: 'miramar', label: 'Miramar' },
              { id: 'alvalade', label: 'Alvalade' },
              { id: 'ilha', label: 'Ilha do Cabo' },
              { id: 'maculusso', label: 'Maculusso' },
              { id: 'kilamba', label: 'Kilamba' },
              { id: 'maianga', label: 'Maianga' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-[#00aff0] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">
              {creators.length} criadoras disponíveis em Luanda
            </span>
          </div>
        </div>

        {/* Creators Cards Grid */}
        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onSelectCreator(c);
                onClose();
              }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-[#00aff0]/60 transition-all cursor-pointer group"
            >
              {/* Mini Banner */}
              <div className="relative h-20 w-full overflow-hidden">
                <img
                  src={c.banner}
                  alt={c.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-2 right-2 text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded-full font-mono">
                  {c.stats.photos} fotos · {c.stats.videos} vídeos
                </span>
              </div>

              {/* Creator details */}
              <div className="p-3 relative pt-0">
                <div className="flex items-end justify-between -mt-6 mb-2">
                  <div className="relative">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-md"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white" />
                  </div>

                  <button className="flex items-center gap-1 px-3 py-1 bg-[#00aff0] text-white text-xs font-bold rounded-full group-hover:bg-[#009ed9] transition-colors shadow-sm">
                    <span>Entrar no Perfil</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 mb-0.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {c.name}
                  </h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white fill-[#00aff0] shrink-0" />
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{c.city}</span>
                  <span>·</span>
                  <span>{c.age} anos</span>
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {c.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
