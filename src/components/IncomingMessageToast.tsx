import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Creator } from '../types';
import { audioService } from '../utils/audio';

interface IncomingMessageToastProps {
  creator: Creator;
  onUnlockClick: () => void;
}

export const IncomingMessageToast: React.FC<IncomingMessageToastProps> = ({
  creator,
  onUnlockClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeAgo, setTimeAgo] = useState('agora');
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      audioService.playChime();
    }, 4500);

    const minuteTimer = setTimeout(() => {
      setTimeAgo('há 1 min');
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearTimeout(minuteTimer);
    };
  }, [creator.id]);

  if (!isVisible) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyText('');
    setIsVisible(false);
    onUnlockClick();
  };

  return (
    <div className="fixed bottom-24 left-3 right-3 z-[9998] max-w-[420px] mx-auto animate-slide-up">
      <div className="relative bg-[#1c1c1e]/95 backdrop-blur-2xl rounded-[18px] p-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] border border-white/[0.08]">
        {/* Top bar */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-5 h-5 rounded-[5px] overflow-hidden flex-shrink-0">
            <img src={creator.avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex-1">
            Mensagens
          </span>
          <span className="text-[11px] text-white/30 mr-1 font-mono">{timeAgo}</span>
          <button
            onClick={() => setIsVisible(false)}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-3 w-3 text-white/50" />
          </button>
        </div>

        {/* Message row */}
        <div className="flex gap-2.5">
          <div className="flex-shrink-0 relative">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#34c759] border-2 border-[#1c1c1e]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white leading-tight">
              {creator.shortName} 💋
            </p>
            <p className="text-[13px] text-white/75 mt-0.5 leading-snug line-clamp-3">
              {creator.incomingMessage}
            </p>
          </div>
        </div>

        {/* Reply input */}
        <form onSubmit={handleSend} className="mt-2.5 flex items-center gap-2">
          <input
            type="text"
            placeholder={`Responder à ${creator.shortName}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 bg-white/[0.08] border border-white/10 rounded-full px-3.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00aff0]"
          />
          <button
            type="submit"
            className="w-7 h-7 rounded-full bg-[#00aff0] hover:bg-[#009ed9] text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
