import React, { useState } from 'react';
import { Play, Pause, Lock, Mic } from 'lucide-react';
import { Creator, VoiceNote } from '../types';
import { audioService } from '../utils/audio';

interface VoiceNotesListProps {
  creator: Creator;
  onUnlockClick: () => void;
}

export const VoiceNotesList: React.FC<VoiceNotesListProps> = ({
  creator,
  onUnlockClick,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleToggle = (vn: VoiceNote) => {
    if (!vn.unlocked) {
      onUnlockClick();
      return;
    }

    if (playingId === vn.id) {
      audioService.stopVoicePreview();
      setPlayingId(null);
    } else {
      audioService.startVoicePreview(() => setPlayingId(null));
      setPlayingId(vn.id);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Mensagens de Voz & Áudios Privados
          </h3>
          <p className="text-xs text-slate-500">
            Áudios exclusivos gravados pela {creator.shortName}
          </p>
        </div>

        <button
          onClick={onUnlockClick}
          className="text-xs font-bold text-[#00aff0] hover:underline"
        >
          Desbloquear Todos
        </button>
      </div>

      <div className="space-y-2.5">
        {creator.voiceNotes.map((vn) => {
          const isPlaying = playingId === vn.id;

          return (
            <div
              key={vn.id}
              onClick={() => handleToggle(vn)}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-[#00aff0]/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 ${
                    vn.unlocked
                      ? 'bg-[#00aff0] text-white hover:bg-[#009ed9]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {vn.unlocked ? (
                    isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </button>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {vn.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                    <span>{vn.duration}</span>
                    <span>·</span>
                    <span>{vn.date}</span>
                  </div>
                </div>
              </div>

              {vn.unlocked ? (
                <div className="flex items-center gap-0.5 h-6 px-2 bg-slate-100 rounded-md">
                  {[40, 75, 30, 90, 60, 100, 45, 80].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#00aff0] rounded-full transition-all duration-300"
                      style={{
                        height: isPlaying ? `${Math.max(25, (h * (i + 1)) % 100)}%` : `${h * 0.4}%`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  Bloqueado
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
