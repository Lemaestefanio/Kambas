import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Play,
  Pause,
  Sparkles,
  Send,
  CheckCheck,
  Flame,
  Volume2,
  RefreshCw,
  PhoneCall,
  Crown,
} from 'lucide-react';
import { Creator, Plan } from '../types';

interface DedicatedMessagesPageProps {
  creator: Creator;
  onBack: () => void;
  onUnlockClick: () => void;
  onOpenPlans: () => void;
}

export const DedicatedMessagesPage: React.FC<DedicatedMessagesPageProps> = ({
  creator,
  onBack,
  onUnlockClick,
  onOpenPlans,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLocked, setIsVideoLocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [userMessages, setUserMessages] = useState<
    { id: string; sender: 'user' | 'creator'; text: string; time: string }[]
  >([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showAutoReply, setShowAutoReply] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const PREVIEW_LIMIT_SECONDS = creator.videoPaywallSeconds || 4.5; // Stops after configured seconds

  // Handle Video Time Update to trigger paywall
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);

      if (current >= PREVIEW_LIMIT_SECONDS) {
        videoRef.current.pause();
        setIsPlaying(false);
        setIsVideoLocked(true);
      }
    }
  };

  const handlePlayVideo = () => {
    if (isVideoLocked) {
      onUnlockClick();
      return;
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error(err);
        });
      }
    }
  };

  const handleReplaySample = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsVideoLocked(false);
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user' as const,
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setUserMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Trigger seductive creator response
    setTimeout(() => {
      setShowAutoReply(true);
      const reply = {
        id: `cr-${Date.now()}`,
        sender: 'creator' as const,
        text: `Adorei a tua mensagem amor... 🙈 No meu WhatsApp VIP respondo a tudo em tempo real e mando áudios a chamar teu nome! Desbloqueia o VIP para conversarmos lá agora.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setUserMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0e1217] text-white flex flex-col max-w-[600px] mx-auto shadow-2xl relative">
      {/* Header Estilo OnlyFans Chat */}
      <header className="sticky top-0 z-30 bg-[#161b22]/95 backdrop-blur-md border-b border-slate-800 p-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Voltar ao perfil"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#00aff0]"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#161b22]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white truncate max-w-[170px] sm:max-w-[220px]">
                {creator.name}
              </h2>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span>● Online agora no chat privado</span>
            </p>
          </div>
        </div>

        {/* WhatsApp VIP / Botão de Desbloqueio */}
        <button
          onClick={onOpenPlans}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Ativar VIP</span>
        </button>
      </header>

      {/* Security & Discretion Top Bar */}
      <div className="bg-slate-900/90 py-1.5 px-4 text-center border-b border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Chat Privado Encriptado de Ponta a Ponta · Pagamentos MCX sem registo bancário</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4">
        {/* Timestamp */}
        <div className="text-center my-2">
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full uppercase tracking-wider">
            Hoje
          </span>
        </div>

        {/* Welcome Message from Creator */}
        <div className="flex items-start gap-2 max-w-[85%]">
          <img
            src={creator.avatar}
            alt={creator.shortName}
            className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
          />
          <div className="bg-[#1f2633] text-slate-200 p-3.5 rounded-2xl rounded-tl-none border border-slate-700/60 shadow-md space-y-2">
            <p className="text-xs leading-relaxed">
              Olá meu amor... 💦 Estava mesmo à tua espera. Gravei este vídeo aqui no quarto para te mostrar o que te espera. Dá play e vê...
            </p>
            <span className="text-[9px] text-slate-400 block text-right">14:20</span>
          </div>
        </div>

        {/* INTERACTIVE VIDEO TEASER MESSAGE (STOPS AFTER A FEW SECONDS) */}
        <div className="flex items-start gap-2 max-w-[92%] sm:max-w-[85%]">
          <img
            src={creator.avatar}
            alt={creator.shortName}
            className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
          />
          <div className="bg-[#1f2633] p-2 sm:p-3 rounded-2xl rounded-tl-none border border-slate-700/70 shadow-xl w-full">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/5] sm:aspect-square flex items-center justify-center group">
              <video
                ref={videoRef}
                src={creator.previewVideo || '/assets/preview-video.mp4'}
                className={`w-full h-full object-cover transition-all duration-500 ${
                  isVideoLocked ? 'blur-md scale-105 brightness-50' : ''
                }`}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onClick={handlePlayVideo}
              />

              {/* Play / Pause button overlay when active */}
              {!isPlaying && !isVideoLocked && (
                <button
                  onClick={handlePlayVideo}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-[#00aff0]/90 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all">
                    <Play className="w-7 h-7 fill-white ml-1" />
                  </div>
                </button>
              )}

              {/* Progress timer badge */}
              {!isVideoLocked && (
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Prévia: {currentTime.toFixed(1)}s / 4.5s</span>
                </div>
              )}

              {/* PAYWALL OVERLAY WHEN VIDEO AUTOMATICALLY PAUSES */}
              {isVideoLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/75 backdrop-blur-sm animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center mb-2 animate-bounce">
                    <Lock className="w-6 h-6" />
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Prévia Concluída
                  </span>

                  <h3 className="text-base sm:text-lg font-black text-white mb-1">
                    Gostaste do que viste?
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed">
                    Para continuares a ver os <strong>restantes 4 minutos</strong> deste vídeo e desbloqueares todos os vídeos íntimos no WhatsApp pessoal de {creator.shortName}, ativa o teu plano VIP.
                  </p>

                  <button
                    onClick={() => {
                      if (creator.checkoutUrl && creator.checkoutUrl.startsWith('http')) {
                        window.location.href = creator.checkoutUrl;
                        return;
                      }
                      onOpenPlans();
                    }}
                    className="w-full max-w-xs py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold text-xs shadow-lg shadow-rose-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 mb-2 cursor-pointer"
                  >
                    <Flame className="w-4 h-4 fill-white" />
                    <span>Desbloquear Vídeo Completo (MCX)</span>
                  </button>

                  <button
                    onClick={handleReplaySample}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Rever os 4 segundos grátis</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-2 pt-2.5 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px] font-medium text-slate-300">
                {creator.incomingMessage || 'Vídeo gravado em Luanda exclusivamente para membros'}
              </span>
              <span className="text-[9px] text-slate-500 shrink-0 ml-2">14:22</span>
            </div>
          </div>
        </div>

        {/* Audio Note Message */}
        <div className="flex items-start gap-2 max-w-[85%]">
          <img
            src={creator.avatar}
            alt={creator.shortName}
            className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
          />
          <div
            onClick={onOpenPlans}
            className="bg-[#1f2633] text-slate-200 p-3 rounded-2xl rounded-tl-none border border-slate-700/60 shadow-md cursor-pointer hover:border-[#00aff0]/60 transition-colors w-full sm:w-72"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#00aff0] text-white flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 h-4">
                  {[3, 7, 12, 16, 9, 14, 8, 11, 15, 6, 10, 4, 12, 15, 8, 5].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-[#00aff0]/70 rounded-full"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Áudio íntimo (0:48)</span>
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> VIP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User sent messages */}
        {userMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'creator' && (
              <img
                src={creator.avatar}
                alt={creator.shortName}
                className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
              />
            )}
            <div
              className={`p-3 rounded-2xl max-w-[80%] text-xs shadow-md ${
                msg.sender === 'user'
                  ? 'bg-[#00aff0] text-white rounded-tr-none'
                  : 'bg-[#1f2633] text-slate-200 rounded-tl-none border border-slate-700'
              }`}
            >
              <p className="leading-relaxed">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 text-[9px] opacity-75 mt-1">
                <span>{msg.time}</span>
                {msg.sender === 'user' && <CheckCheck className="w-3 h-3" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating CTA Banner inside chat */}
      <div className="p-2.5 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border-t border-rose-900/40 text-center flex items-center justify-between px-4">
        <div className="text-left">
          <p className="text-xs font-bold text-white">Queres falar no WhatsApp dela?</p>
          <p className="text-[10px] text-rose-300">Planos a partir de 5.000 Kz com Multicaixa Express</p>
        </div>
        <button
          onClick={onOpenPlans}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
        >
          Desbloquear VIP
        </button>
      </div>

      {/* Bottom Message Input Bar */}
      <footer className="p-3 bg-[#161b22] border-t border-slate-800 safe-bottom">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Escreve uma mensagem para ${creator.shortName}...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-slate-800/90 border border-slate-700 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00aff0]"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="w-10 h-10 rounded-full bg-[#00aff0] hover:bg-[#009ed9] text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
            aria-label="Enviar mensagem"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </footer>
    </div>
  );
};
