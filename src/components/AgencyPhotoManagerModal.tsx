import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Cloud,
  Database,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Creator } from '../types';
import { compressImageFile } from '../utils/imageCompressor';

interface AgencyPhotoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  creators: Creator[];
  onUpdateAvatar: (creatorId: string, dataUrl: string) => Promise<void> | void;
  onBatchUpdateAvatars: (avatarsMap: Record<string, string>) => Promise<void> | void;
  onResetAvatars: () => void;
  initialSelectedCreatorId?: string;
  isCloudSyncing?: boolean;
}

export const AgencyPhotoManagerModal: React.FC<AgencyPhotoManagerModalProps> = ({
  isOpen,
  onClose,
  creators,
  onUpdateAvatar,
  onBatchUpdateAvatars,
  onResetAvatars,
  initialSelectedCreatorId,
  isCloudSyncing = false,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'info'>('upload');
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Handle single model photo change
  const handleSinglePhotoChange = async (
    creatorId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      // High-quality lightweight compression for Firestore
      const compressedDataUrl = await compressImageFile(file, 1200, 0.85);
      await onUpdateAvatar(creatorId, compressedDataUrl);
      const creator = creators.find((c) => c.id === creatorId);
      showToast(`✓ Foto de ${creator?.shortName || 'modelo'} salva no Banco de Dados Firebase com sucesso!`);
    } catch (err) {
      console.error('Erro ao carregar e salvar foto:', err);
      alert('Erro ao carregar a imagem. Tente novamente com um arquivo JPG ou PNG.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Handle batch upload of multiple photos (up to 11 photos)
  const handleBatchPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsProcessing(true);
      const fileList = Array.from(files);
      const newAvatars: Record<string, string> = {};

      for (let i = 0; i < fileList.length && i < creators.length; i++) {
        const creator = creators[i];
        const compressedDataUrl = await compressImageFile(fileList[i], 1200, 0.85);
        newAvatars[creator.id] = compressedDataUrl;
      }

      await onBatchUpdateAvatars(newAvatars);
      showToast(
        `✓ Sucesso! ${Object.keys(newAvatars).length} fotografias reais foram salvas no Banco de Dados Firebase!`
      );
    } catch (err) {
      console.error('Erro ao carregar fotos em lote:', err);
      alert('Ocorreu um erro ao processar as fotografias.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Tem a certeza que deseja restaurar as fotos padrão da agência no banco de dados?')) {
      onResetAvatars();
      showToast('Fotos padrão restauradas no banco de dados.');
    }
  };

  const isCustomAvatar = (avatarUrl: string) => {
    return avatarUrl.startsWith('data:') || avatarUrl.includes('firebasestorage') || avatarUrl.startsWith('https://');
  };

  const customCount = creators.filter((c) => isCustomAvatar(c.avatar)).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00aff0] flex items-center justify-center text-white shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">Fotos Reais no Banco de Dados</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Cloud className="w-2.5 h-2.5" /> Firebase Firestore Ativo
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Gerencie e guarde as fotografias das 11 modelos com sincronização na nuvem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Database Status Banner */}
        <div className="bg-slate-800 border-b border-slate-700/80 px-4 py-2 flex items-center justify-between text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium">
              Firestore: <b>{creators.length} perfis sincronizados</b>
            </span>
          </div>
          {isCloudSyncing ? (
            <span className="text-[11px] text-amber-300 flex items-center gap-1 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin" /> A guardar na nuvem...
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Persistência Permanente
            </span>
          )}
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[#1c1e21]">
          {/* Status Box */}
          <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-3 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#00aff0] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {customCount > 0
                  ? `${customCount} de ${creators.length} modelos com fotos reais ativas no banco de dados!`
                  : 'Carregue as fotografias reais das modelos para o banco de dados!'}
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Todas as fotos carregadas ficam salvas na coleção <code>creators</code> do Firestore e
                aparecem automaticamente para todos os visitantes do site em tempo real.
              </p>
            </div>
          </div>

          {/* Option A: Bulk Upload Button (All 11 at once) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#00aff0]" />
                <span className="font-bold text-xs">Carregar e Salvar Todas as Fotos no Firebase</span>
              </div>
              <span className="text-[10px] bg-[#00aff0]/20 text-sky-300 px-2 py-0.5 rounded-full font-medium">
                1-Clique em Lote
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mb-3">
              Selecione as fotos no seu computador ou telemóvel. O sistema otimiza as imagens e grava
              diretamente no Firestore para cada modelo da agência por ordem.
            </p>

            <input
              ref={batchFileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleBatchPhotoChange}
            />

            <button
              onClick={() => batchFileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-[#00aff0] hover:bg-[#009ed9] active:scale-[0.98] transition-all rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>A processar e salvar no Firebase...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Fotos e Salvar no Banco de Dados</span>
                </>
              )}
            </button>
          </div>

          {/* Option B: Individual Model List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>Modelos da Agência ({creators.length})</span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">
                  (clique para trocar a foto)
                </span>
              </h4>
              {customCount > 0 && (
                <button
                  onClick={handleResetAll}
                  className="text-[10px] text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restaurar Padrão</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {creators.map((creator, index) => {
                const isCustom = isCustomAvatar(creator.avatar);
                const isInitial = creator.id === initialSelectedCreatorId;

                return (
                  <div
                    key={creator.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isInitial
                        ? 'bg-sky-50/70 border-[#00aff0] ring-1 ring-[#00aff0]/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Left: Avatar & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                        <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        {isCustom && (
                          <span
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow"
                            title="Foto real sincronizada no Firebase"
                          >
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {creator.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({creator.age} anos)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {creator.handle} · {creator.neighborhood}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="inline-block text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                            {isCustom ? '✓ Foto Real no Banco de Dados' : 'Foto Padrão da Agência'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Upload Button */}
                    <div className="shrink-0 ml-2">
                      <input
                        ref={(el) => {
                          singleFileInputRefs.current[creator.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSinglePhotoChange(creator.id, e)}
                      />
                      <button
                        onClick={() => singleFileInputRefs.current[creator.id]?.click()}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#00aff0]" />
                        <span>{isCustom ? 'Substituir' : 'Escolher Foto'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sincronizado via Firebase Firestore</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span>Ver Resultado no Perfil</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
