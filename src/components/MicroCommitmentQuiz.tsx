import { useSiteContent } from '../cms/SiteContent';
import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { Creator } from '../types';

interface MicroCommitmentQuizProps {
  creator: Creator;
  onUnlockClick: () => void;
}

export const MicroCommitmentQuiz: React.FC<MicroCommitmentQuizProps> = ({
  creator,
  onUnlockClick,
}) => {
  const { copy } = useSiteContent();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const options = [
    { id: 1, label: copy('home.quiz.optionVideoCall'), emoji: copy('home.quiz.videoCallEmoji') },
    { id: 2, label: copy('home.quiz.optionMedia'), emoji: copy('home.quiz.mediaEmoji') },
    { id: 3, label: copy('home.quiz.optionVoice'), emoji: copy('home.quiz.voiceEmoji') },
  ];

  return (
    <div className="mx-4 my-3 p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-[#00aff0]" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          {copy('home.quiz.question', { name: creator.shortName })}
        </h3>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                isSelected
                  ? 'border-[#00aff0] bg-[#00aff0]/5 text-slate-900 shadow-sm'
                  : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{opt.emoji}</span>
                <span>{opt.label}</span>
              </div>

              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'border-[#00aff0] bg-[#00aff0] text-white'
                    : 'border-slate-300'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>

      {selectedOption && (
        <div className="pt-2 border-t border-slate-100 animate-fade-in flex flex-col gap-2">
          <p className="text-[11px] text-[#15803d] font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-center">
            {copy('home.quiz.selected', { name: creator.shortName, option: options.find((o) => o.id === selectedOption)?.label.toLowerCase() || '' })}
          </p>
          <button
            onClick={onUnlockClick}
            className="w-full py-2.5 rounded-full bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs uppercase tracking-wide transition-all shadow-md shadow-[#00aff0]/25 flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{copy('home.quiz.continue')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
