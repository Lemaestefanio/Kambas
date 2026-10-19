import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Lock, Heart, Send } from 'lucide-react';
import { StoryHighlight, Creator } from '../types';

interface StoryViewerModalProps {
  creator: Creator;
  initialStoryIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onUnlockClick: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  creator,
  initialStoryIndex,
  isOpen,
  onClose,
  onUnlockClick,
}) => {
  const { copy } = useSiteContent();

  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [reactionSent, setReactionSent] = useState<string | null>(null);

  const currentStory: StoryHighlight = creator.highlights[currentIndex] || creator.highlights[0];

  useEffect(() => {
    if (!isOpen) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          // Advance to next story if available, or close
          if (currentIndex < creator.highlights.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return p + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, creator.highlights.length, onClose, isOpen]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < creator.highlights.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleReaction = (emoji: string) => {
    setReactionSent(emoji);
    setTimeout(() => setReactionSent(null), 2000);
  };

  if (!isOpen || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/95 backdrop-blur-md flex items-center justify-center animate-fade-in select-none">
      <div className="relative w-full max-w-sm h-full max-h-[92vh] bg-[#12141c] sm:rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10">
        {/* Top Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 p-2.5 flex items-center gap-1.5 bg-gradient-to-b from-black/80 to-transparent">
          {creator.highlights.map((h, idx) => (
            <div key={h.id} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 rounded-full"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Creator Info Bar */}
        <div className="absolute top-4 left-0 right-0 z-30 px-3.5 pt-2 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00aff0]"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight">{creator.shortName}</span>
              <span className="text-[10px] text-white/70 font-mono">{currentStory.time}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full bg-black/50 text-white/80 hover:text-white transition-colors"
            aria-label={copy("overlay.story-viewer-modal.001")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Container with Left/Right Tap zones */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {currentStory.type === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt={currentStory.title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Left / Right Click Areas */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-24 w-1/3 z-20 opacity-0 hover:opacity-20 bg-white/20 flex items-center justify-start pl-2 transition-opacity"
            aria-label={copy("overlay.story-viewer-modal.002")}
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-24 w-1/3 z-20 opacity-0 hover:opacity-20 bg-white/20 flex items-center justify-end pr-2 transition-opacity"
            aria-label={copy("overlay.story-viewer-modal.003")}
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          {/* Floating Reaction Feedback */}
          {reactionSent && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-bounce">
              <span className="text-6xl drop-shadow-2xl">{reactionSent}</span>
            </div>
          )}
        </div>

        {/* Caption & Bottom Controls */}
        <div className="relative z-30 p-3.5 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2.5">
          <p className="text-xs text-white/90 leading-snug drop-shadow-md">
            {currentStory.caption}
          </p>

          {/* Quick Reaction Emojis */}
          <div className="flex items-center justify-around py-1 border-t border-white/10">
            {['🔥', '❤️', '😍', '🍑', '💋'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-xl hover:scale-125 active:scale-95 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Bottom Action */}
          <button
            onClick={() => {
              onClose();
              onUnlockClick();
            }}
            className="w-full py-2.5 rounded-full bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#00aff0]/30 active:scale-[0.98]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{copy("overlay.story-viewer-modal.004", { name: creator.shortName })}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
