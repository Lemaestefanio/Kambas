import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react';

export interface EditorField {
  label: string;
  kind?: 'text' | 'long' | 'number' | 'boolean' | 'object' | 'array' | 'select';
  fields?: Record<string, EditorField>;
  item?: EditorField;
  template?: () => unknown;
  options?: Array<{ value: string; label: string }>;
  media?: string;
  hint?: string;
  min?: number;
  defaultValue?: string | number | boolean;
}

const inputClass = 'w-full rounded-lg border border-white/15 bg-[#11131d] px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400 disabled:opacity-50';
const actionClass = 'rounded-md border border-white/15 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-30';

interface EditorProps {
  field: EditorField;
  value: any;
  onChange: (value: any) => void;
  onUpload: (file: File, accept: (url: string) => void) => Promise<void>;
  path: string;
}

export function StructuredField({ field, value, onChange, onUpload, path }: EditorProps) {
  value = value ?? field.defaultValue;
  const id = `cms-${path.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  if (field.kind === 'object') return <fieldset className="space-y-4 rounded-xl border border-white/10 p-4"><legend className="px-2 text-sm font-semibold text-pink-200">{field.label}</legend><StructuredFields fields={field.fields || {}} value={value || {}} onChange={onChange} onUpload={onUpload} path={path} /></fieldset>;
  if (field.kind === 'array') {
    const items: any[] = Array.isArray(value) ? value : [];
    const move = (from: number, to: number) => { const next = [...items]; [next[from], next[to]] = [next[to], next[from]]; onChange(next); };
    return <section className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-pink-200">{field.label} ({items.length})</h3><button type="button" className="inline-flex items-center gap-2 rounded-lg border border-pink-400/30 px-3 py-2 text-xs text-pink-200 hover:bg-pink-400/10" onClick={() => onChange([...items, field.template ? field.template() : ''])}><Plus size={15} /> Adicionar</button></div>
      {field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}
      {items.length === 0 && <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-500">Nenhum item. Usa “Adicionar” para criar o primeiro.</p>}
      {items.map((item, index) => <div key={item && typeof item === 'object' && item.id ? item.id : index} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-xs font-medium text-slate-400">{index + 1}. {typeof item === 'object' && item ? item.title || item.duration || item.question || item.caption || 'Item' : 'Item'}</span><div className="flex shrink-0 gap-1">
          <button type="button" aria-label={`Mover item ${index + 1} para cima`} className={actionClass} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={14} /></button>
          <button type="button" aria-label={`Mover item ${index + 1} para baixo`} className={actionClass} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={14} /></button>
          <button type="button" aria-label={`Remover item ${index + 1}`} className={`${actionClass} text-rose-300`} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
        </div></div>
        <StructuredField field={field.item || { label: 'Texto' }} value={item} onChange={(next) => onChange(items.map((existing, i) => i === index ? next : existing))} onUpload={onUpload} path={`${path}-${index}`} />
      </div>)}
    </section>;
  }
  if (field.kind === 'boolean') return <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-slate-200"><input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-pink-500" /><span>{field.label}{field.hint && <span className="mt-1 block text-xs text-slate-400">{field.hint}</span>}</span></label>;
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium text-slate-200">{field.label}</label>
    {field.kind === 'long' ? <textarea id={id} className={inputClass} rows={4} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
      : field.kind === 'select' ? <select id={id} className={inputClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>{!field.options?.some((option) => option.value === (value ?? '')) && <option value="">Sem seleção</option>}{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : <input id={id} className={inputClass} type={field.kind === 'number' ? 'number' : 'text'} min={field.min} step={field.kind === 'number' ? 'any' : undefined} value={value ?? ''} onChange={(event) => onChange(field.kind === 'number' ? (event.target.value === '' ? 0 : Number(event.target.value)) : event.target.value)} />}
    {field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}
    {field.media && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Upload size={14} /> Enviar ficheiro<input aria-label={`Enviar ficheiro: ${field.label}`} type="file" accept={field.media} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void onUpload(file, onChange); }} /></label>}
  </div>;
}

export function StructuredFields({ fields, value, onChange, onUpload, path }: Omit<EditorProps, 'field'> & { fields: Record<string, EditorField> }) {
  return <div className="space-y-4">{Object.entries(fields).map(([key, field]) => <StructuredField key={key} field={field} value={value?.[key]} onChange={(next) => onChange({ ...value, [key]: next })} onUpload={onUpload} path={`${path}-${key}`} />)}</div>;
}

export const itemId = () => crypto.randomUUID();
const text = (label: string, extra: Partial<EditorField> = {}): EditorField => ({ label, ...extra });
const number = (label: string, min = 0): EditorField => ({ label, kind: 'number', min });
const bool = (label: string): EditorField => ({ label, kind: 'boolean' });
const image = (label: string): EditorField => ({ label, media: 'image/*' });
const video = (label: string): EditorField => ({ label, media: 'video/*' });
const object = (label: string, fields: Record<string, EditorField>): EditorField => ({ label, kind: 'object', fields });
const array = (label: string, item: EditorField, template: () => unknown): EditorField => ({ label, kind: 'array', item, template });

export const PROFILE_SECTIONS: Record<string, { label: string; fields: Record<string, EditorField> }> = {
  profile: { label: 'Perfil e apresentação', fields: {
    name: text('Nome completo'), shortName: text('Nome curto'), handle: text('Nome de utilizador (@)'), age: number('Idade', 18), city: text('Cidade'), neighborhood: text('Bairro'), bio: text('Biografia', { kind: 'long' }),
    avatar: image('Fotografia de perfil'), banner: image('Imagem de capa'), bannerVideo: video('Vídeo de capa'), verified: bool('Mostrar selo de verificação'), isOnline: bool('Mostrar estado online'),
    stats: object('Números apresentados no perfil', { photos: number('Fotografias'), videos: number('Vídeos'), likes: text('Gostos (texto apresentado)') }), postCount: number('Contagem de publicações'), mediaCount: number('Contagem de média'),
  } },
  messages: { label: 'Mensagens e pagamentos', fields: {
    incomingMessage: text('Mensagem que aparece ao visitante', { kind: 'long' }), whatsappNumber: text('Número de WhatsApp'), previewVideo: video('Vídeo de apresentação'), videoPaywallSeconds: { ...number('Duração da prévia de vídeo (segundos)'), defaultValue: 4.5 },
    checkoutUrl: text('Link de pagamento principal'), tipCheckoutUrl: text('Link para enviar gorjeta'), customPaymentButtonText: text('Texto personalizado do botão de pagamento'), preferInternalCheckout: { ...bool('Usar a página interna de pagamento'), defaultValue: true },
    mimoPrices: array('Valores dos mimos', number('Valor'), () => 0), mimoCheckoutUrls: array('Links de pagamento dos mimos', text('Link de pagamento'), () => ''),
  } },
  plans: { label: 'Planos e preços', fields: {
    plans: array('Planos', object('Detalhes do plano', {
      duration: text('Nome / duração'), price: text('Preço apresentado'), rawPrice: number('Preço numérico'), periodLabel: text('Período apresentado'), savings: text('Texto da poupança'), badge: text('Texto do destaque'),
      badgeType: { label: 'Estilo do destaque', kind: 'select', options: [{ value: '', label: 'Sem destaque' }, { value: 'primary', label: 'Principal' }, { value: 'accent', label: 'Alternativo' }, { value: 'popular', label: 'Popular' }] },
      isPopular: bool('Marcar como popular'), checkoutUrl: text('Link de pagamento'), features: array('Benefícios', text('Benefício'), () => ''),
    }), () => ({ id: itemId(), duration: 'Novo plano', price: '0 Kz', rawPrice: 0, periodLabel: '', checkoutUrl: '', features: [], isPopular: false })),
  } },
  posts: { label: 'Publicações', fields: {
    posts: array('Publicações', object('Detalhes da publicação', {
      time: text('Data / texto do tempo'), text: text('Texto da publicação', { kind: 'long' }), type: { label: 'Tipo', kind: 'select', options: [{ value: 'photo', label: 'Fotografia' }, { value: 'video', label: 'Vídeo' }] },
      image: image('Fotografia / imagem de apresentação'), video: video('Vídeo'), duration: text('Duração apresentada'), likes: number('Gostos apresentados'), comments: number('Comentários apresentados'), unlocked: bool('Mostrar como prévia aberta'),
    }), () => ({ id: itemId(), time: 'Agora', text: '', type: 'photo', image: '', likes: 0, comments: 0, unlocked: false })),
  } },
  gallery: { label: 'Galeria', fields: {
    galleryPhotos: array('Fotografias da galeria', object('Fotografia', { url: image('Imagem'), caption: text('Legenda'), likes: number('Gostos apresentados'), unlocked: bool('Mostrar como prévia aberta') }), () => ({ id: itemId(), url: '', caption: '', likes: 0, unlocked: false })),
  } },
  highlights: { label: 'Destaques / stories', fields: {
    highlights: array('Destaques', object('Destaque', {
      title: text('Título'), coverImage: image('Imagem de capa'), mediaUrl: text('Ficheiro do destaque', { media: 'image/*,video/*' }), type: { label: 'Tipo', kind: 'select', options: [{ value: 'image', label: 'Fotografia' }, { value: 'video', label: 'Vídeo' }] }, caption: text('Legenda', { kind: 'long' }), time: text('Data / texto do tempo'),
    }), () => ({ id: itemId(), title: 'Novo destaque', coverImage: '', mediaUrl: '', type: 'image', caption: '', time: '' })),
  } },
  voice: { label: 'Áudios', fields: {
    voiceNotes: array('Notas de voz', object('Nota de voz', { title: text('Título'), duration: text('Duração apresentada'), date: text('Data'), url: text('Ficheiro de áudio', { media: 'audio/*' }), unlocked: bool('Mostrar como prévia aberta') }), () => ({ id: itemId(), title: 'Novo áudio', duration: '', date: '', url: '', unlocked: false })),
  } },
};

export const FAQ_FIELD: EditorField = array('Perguntas frequentes', object('Pergunta e resposta', { question: text('Pergunta'), answer: text('Resposta', { kind: 'long' }) }), () => ({ question: '', answer: '' }));

export const BANK_FIELDS: Record<string, EditorField> = {
  bankName: text('Banco'), beneficiary: text('Beneficiário'), iban: text('IBAN'), accountNumber: text('Número de conta'), unitelMoney: text('Unitel Money / telefone'), multicaixaEntity: text('Entidade Multicaixa'),
};
