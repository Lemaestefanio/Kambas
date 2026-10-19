import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Creator } from '../types';

interface Message {
  id: string;
  sender: 'creator' | 'user';
  text: string;
  time: string;
}

interface CreatorChatDrawerProps {
  creator: Creator;
  isOpen: boolean;
  onClose: () => void;
  onUnlockClick: () => void;
}

export const CreatorChatDrawer: React.FC<CreatorChatDrawerProps> = ({
  creator,
  isOpen,
  onClose,
  onUnlockClick,
}) => {
  const { copy } = useSiteContent();

  const initialMessages: Message[] = [
    {
      id: 'm1',
      sender: 'creator',
      text: copy("overlay.creator-chat-drawer.007", { name: creator.shortName }),
      time: copy("overlay.creator-chat-drawer.003"),
    },
    {
      id: 'm2',
      sender: 'creator',
      text: copy("overlay.creator-chat-drawer.004"),
      time: copy("overlay.creator-chat-drawer.005"),
    },
  ];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const displayedMessages = messages.map((entry) => {
    const original = initialMessages.find((item) => item.id === entry.id);
    return original ? { ...entry, ...original } : entry;
  });
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: userText, time: nowTime },
    ]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          sender: 'creator',
          text: copy("overlay.creator-chat-drawer.006"),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1400);
  };

  if (!isOpen) return null;

  return (
    <div className="mobile-overlay fixed inset-0 z-[10003] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="mobile-dialog-panel relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] border border-slate-200">
        {/* Header */}
        <div className="shrink-0 gap-2 p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative shrink-0">
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00aff0]/30"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-bold text-slate-900 leading-tight">
                  {creator.name}
                </span>
              </div>
              <span className="text-[11px] text-[#22c55e] font-semibold">
                {copy("overlay.creator-chat-drawer.009", { city: creator.city })}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="mobile-scroll flex-1 p-4 space-y-2.5 bg-slate-50/50">
          {displayedMessages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-[#00aff0] text-white rounded-tr-sm'
                      : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200/80'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 px-1 font-mono">
                  {m.time}
                </span>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl rounded-tl-sm border border-slate-200 w-fit">
              <span className="text-[11px] text-slate-400">{copy("overlay.creator-chat-drawer.010", { name: creator.shortName })}</span>
              <span className="w-1 h-1 rounded-full bg-[#00aff0] animate-bounce" />
              <span className="w-1 h-1 rounded-full bg-[#00aff0] animate-bounce delay-100" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* VIP Prompt Bar */}
        <div className="shrink-0 gap-2 px-3.5 py-2 bg-[#00aff0]/10 border-t border-[#00aff0]/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#00aff0]" />
            <span>{copy("overlay.creator-chat-drawer.001")}</span>
          </div>
          <button
            onClick={() => {
              onClose();
              onUnlockClick();
            }}
            className="min-h-11 shrink-0 text-[11px] font-bold text-white bg-[#00aff0] hover:bg-[#009ed9] px-2.5 py-1 rounded-full shadow-sm"
          >{copy("overlay.creator-chat-drawer.002")}</button>
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="mobile-composer p-2.5 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            placeholder={copy("overlay.creator-chat-drawer.008", { name: creator.shortName })}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-w-0 flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00aff0]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-full bg-[#00aff0] hover:bg-[#009ed9] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
