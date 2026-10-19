import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react';

export interface EditorField {
  label: string;
  kind?: 'text' | 'long' | 'number' | 'range' | 'boolean' | 'object' | 'array' | 'select' | 'visibility';
  fields?: Record<string, EditorField>;
  item?: EditorField;
  template?: () => unknown;
  options?: Array<{ value: string; label: string }>;
  media?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  videoOnly?: boolean;
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
  if (field.kind === 'visibility') return <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-slate-200">{field.label}</legend><div className="grid gap-2 sm:grid-cols-2">{[{ value: 'public', label: 'Conteúdo aberto' }, { value: 'blurred', label: 'Prévia com desfoque' }].map((option) => <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${value === option.value ? 'border-pink-400/60 bg-pink-500/10 text-pink-100' : 'border-white/10 text-slate-300'}`}><input type="radio" name={id} checked={value === option.value} onChange={() => onChange(option.value)} className="accent-pink-500" />{option.label}</label>)}</div>{field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}</fieldset>;
  if (field.kind === 'boolean') return <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-slate-200"><input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-pink-500" /><span>{field.label}{field.hint && <span className="mt-1 block text-xs text-slate-400">{field.hint}</span>}</span></label>;
  if (field.kind === 'range') {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const current = typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : Number(field.defaultValue ?? min);
    return <div className="space-y-2 rounded-xl border border-white/10 p-4"><div className="flex items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-medium text-slate-200">{field.label}</label><output htmlFor={id} className="rounded-full bg-pink-500/15 px-2.5 py-1 text-xs font-semibold text-pink-200">{current} px</output></div><input id={id} type="range" min={min} max={max} step={field.step ?? 1} value={current} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-pink-500" /><div className="flex justify-between text-[10px] text-slate-500"><span>Leve</span><span>Mais intenso</span></div>{field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}</div>;
  }
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium text-slate-200">{field.label}</label>
    {field.kind === 'long' ? <textarea id={id} className={inputClass} rows={4} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
      : field.kind === 'select' ? <select id={id} className={inputClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>{!field.options?.some((option) => option.value === (value ?? '')) && <option value="">Sem seleção</option>}{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : <input id={id} className={inputClass} type={field.kind === 'number' ? 'number' : 'text'} min={field.min} step={field.kind === 'number' ? 'any' : undefined} value={value ?? ''} onChange={(event) => onChange(field.kind === 'number' ? (event.target.value === '' ? 0 : Number(event.target.value)) : event.target.value)} />}
    {field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}
    {field.media && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Upload size={14} /> Enviar ficheiro<input aria-label={`Enviar ficheiro: ${field.label}`} type="file" accept={field.media} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void onUpload(file, onChange); }} /></label>}
  </div>;
}

export function StructuredFields({ fields, value, onChange, onUpload, path }: Omit<EditorProps, 'field'> & { fields: Record<string, EditorField> }) {
  // Existing documents retain their unlocked setting until the owner edits it.
  const currentVisibility = value?.visibility === 'public' || value?.visibility === 'blurred' ? value.visibility
    : typeof value?.unlocked === 'boolean' ? value.unlocked ? 'public' : 'blurred' : fields.visibility?.defaultValue ?? 'blurred';
  return <div className="space-y-4">{Object.entries(fields).filter(([, field]) => !field.videoOnly || value?.type === 'video').map(([key, field]) => {
    const current = key === 'visibility' && field.kind === 'visibility' ? currentVisibility
      : key === 'previewAudio' ? value?.[key] ?? (currentVisibility === 'public') : value?.[key];
    const renderedField = key === 'previewUrl' && field.media && value?.type
      ? { ...field, media: value.type === 'video' ? 'video/*' : 'image/*' } : field;
    return <StructuredField key={key} field={renderedField} value={current} onChange={(next) => onChange(key === 'visibility' && field.kind === 'visibility'
      ? { ...value, visibility: next, unlocked: next === 'public' } : { ...value, [key]: next })} onUpload={onUpload} path={`${path}-${key}`} />;
  })}</div>;
}

export const itemId = () => crypto.randomUUID();
const text = (label: string, extra: Partial<EditorField> = {}): EditorField => ({ label, ...extra });
const number = (label: string, min = 0): EditorField => ({ label, kind: 'number', min });
const bool = (label: string): EditorField => ({ label, kind: 'boolean' });
const image = (label: string): EditorField => ({ label, media: 'image/*' });
const video = (label: string): EditorField => ({ label, media: 'video/*' });
const object = (label: string, fields: Record<string, EditorField>): EditorField => ({ label, kind: 'object', fields });
const array = (label: string, item: EditorField, template: () => unknown): EditorField => ({ label, kind: 'array', item, template });

const previewFields = (defaultPublic = false, imageOnly = false): Record<string, EditorField> => ({
  visibility: { label: 'Visibilidade do conteúdo', kind: 'visibility', defaultValue: defaultPublic ? 'public' : 'blurred', hint: 'O botão para desbloquear aparece abaixo da prévia.' },
  blurAmount: { label: 'Intensidade do desfoque', kind: 'range', min: 2, max: 12, step: 1, defaultValue: 4, hint: 'O nível 4 mantém contornos e movimento visíveis. Aplica-se apenas às prévias com desfoque.' },
  ...(!imageOnly ? { previewAudio: { label: 'Permitir som na prévia', kind: 'boolean' as const, videoOnly: true, hint: 'O visitante toca no botão de som para ouvir. Desliga para apresentar a prévia em silêncio.' } } : {}),
  previewUrl: text('Ficheiro de prévia separado (opcional)', { media: imageOnly ? 'image/*' : 'image/*,video/*', hint: 'Usado nas prévias com desfoque. Envia um ficheiro preparado para acesso público; se deixares vazio, será usado o ficheiro acima.' }),
  ...(!imageOnly ? { posterUrl: { ...image('Capa leve do vídeo (opcional)'), videoOnly: true, hint: 'Imagem mostrada antes de o visitante reproduzir o vídeo.' } } : {}),
});

export const PROFILE_SECTIONS: Record<string, { label: string; hint?: string; fields: Record<string, EditorField> }> = {
  profile: { label: 'Perfil & Fotos', fields: {
    name: text('Nome completo'), shortName: text('Nome curto'), handle: text('Nome de utilizador (@)'), age: number('Idade', 18), city: text('Cidade'), neighborhood: text('Bairro'), bio: text('Biografia', { kind: 'long' }),
    avatar: image('Fotografia de perfil (avatar)'), banner: image('Imagem de capa / banner'), bannerVideo: video('Vídeo de capa'), whatsappNumber: text('Número de WhatsApp'), incomingMessage: text('Mensagem que aparece ao visitante', { kind: 'long' }), verified: bool('Mostrar selo de verificação'), isOnline: bool('Mostrar estado online'),
    stats: object('Números apresentados no perfil', { photos: number('Fotografias'), videos: number('Vídeos'), likes: text('Gostos (texto apresentado)') }), postCount: number('Contagem de publicações'), mediaCount: number('Contagem de média'),
  } },
  feed: { label: 'Fotos & Vídeos do Feed', hint: 'Publica apenas ficheiros que possam ser vistos pelo público. O desfoque é visual; mantém os originais protegidos fora desta página e usa prévias separadas.', fields: {
    posts: array('Fotos e vídeos do feed', object('Detalhes da publicação', {
      time: text('Data / texto do tempo'), text: text('Texto da publicação', { kind: 'long' }), type: { label: 'Tipo', kind: 'select', options: [{ value: 'photo', label: 'Fotografia' }, { value: 'video', label: 'Vídeo' }] },
      image: image('Fotografia / imagem de apresentação'), video: video('Vídeo público'), duration: text('Duração apresentada'), likes: number('Gostos apresentados'), comments: number('Comentários apresentados'), ...previewFields(),
    }), () => ({ id: itemId(), time: 'Agora', text: '', type: 'photo', image: '', likes: 0, comments: 0, unlocked: false })),
    galleryPhotos: array('Fotografias da galeria', object('Fotografia', { url: image('Imagem pública'), caption: text('Legenda'), likes: number('Gostos apresentados'), ...previewFields(false, true) }), () => ({ id: itemId(), url: '', caption: '', likes: 0, unlocked: false })),
    voiceNotes: array('Notas de voz', object('Nota de voz', { title: text('Título'), duration: text('Duração apresentada'), date: text('Data'), url: text('Ficheiro de áudio', { media: 'audio/*' }), unlocked: bool('Mostrar como prévia aberta') }), () => ({ id: itemId(), title: 'Novo áudio', duration: '', date: '', url: '', unlocked: false })),
  } },
  paywall: { label: 'Vídeo com Paywall', hint: 'Configura o teaser e o momento em que aparece o pedido de pagamento.', fields: {
    previewVideo: video('Vídeo teaser / apresentação'), videoPaywallSeconds: { ...number('Segundos antes de pausar o vídeo'), defaultValue: 4.5, hint: 'Por exemplo: 3 ou 4.5 segundos.' },
    checkoutUrl: text('Link de pagamento principal'), customPaymentButtonText: text('Texto personalizado do botão de pagamento'), preferInternalCheckout: { ...bool('Usar a página interna de pagamento'), defaultValue: true },
  } },
  stories: { label: 'Stories', hint: 'Envia apenas ficheiros de acesso público. Usa uma prévia separada quando o original tiver de ficar protegido.', fields: {
    highlights: array('Stories e destaques', object('Destaque', {
      title: text('Título'), coverImage: image('Capa do destaque'), mediaUrl: text('Fotografia ou vídeo público do story', { media: 'image/*,video/*' }), type: { label: 'Tipo', kind: 'select', options: [{ value: 'image', label: 'Fotografia' }, { value: 'video', label: 'Vídeo' }] }, caption: text('Legenda', { kind: 'long' }), time: text('Data / texto do tempo'), ...previewFields(true),
    }), () => ({ id: itemId(), title: 'Novo destaque', coverImage: '', mediaUrl: '', type: 'image', caption: '', time: '' })),
  } },
  plans: { label: 'Preços & Links de Checkout', fields: {
    plans: array('Planos em Kwanzas', object('Detalhes do plano', {
      duration: text('Nome / duração'), price: text('Preço apresentado (Kz)'), rawPrice: number('Preço numérico em Kwanzas'), periodLabel: text('Período apresentado'), savings: text('Texto da poupança'), badge: text('Texto do destaque'),
      badgeType: { label: 'Estilo do destaque', kind: 'select', options: [{ value: '', label: 'Sem destaque' }, { value: 'primary', label: 'Principal' }, { value: 'accent', label: 'Alternativo' }, { value: 'popular', label: 'Popular' }] },
      isPopular: bool('Marcar como popular'), checkoutUrl: text('Link de checkout externo'), features: array('Benefícios', text('Benefício'), () => ''),
    }), () => ({ id: itemId(), duration: 'Novo plano', price: '0 Kz', rawPrice: 0, periodLabel: '', checkoutUrl: '', features: [], isPopular: false })),
    checkoutUrl: text('Link de pagamento principal'), tipCheckoutUrl: text('Link para enviar gorjeta'), preferInternalCheckout: { ...bool('Usar a página interna de pagamento'), defaultValue: true },
    mimoPrices: { ...array('Valores dos mimos em Kwanzas', number('Valor em Kz'), () => 0), hint: 'Mantém a mesma ordem dos links abaixo: o primeiro valor corresponde ao primeiro link.' },
    mimoCheckoutUrls: array('Links de checkout dos mimos', text('Link de pagamento'), () => ''),
  } },
  links: { label: 'Páginas & Botões', hint: 'Os links abaixo definem o destino dos botões deste perfil. Deixa vazio para manter a ação padrão. Usa um endereço https:// ou um caminho interno iniciado por /.', fields: {
    actionLinks: object('Destino dos botões', {
      subscribe: text('Assinar / desbloquear conteúdo'), message: text('Enviar mensagem'), tip: text('Enviar mimo / gorjeta'), signup: text('Criar conta'), login: text('Entrar'), explore: text('Explorar perfis'), notifications: text('Notificações'),
    }),
  } },
  comments: { label: 'Comentários', hint: 'Gere os comentários apresentados no perfil e nas publicações.', fields: {} },
};

export const FAQ_FIELD: EditorField = array('Perguntas frequentes', object('Pergunta e resposta', { question: text('Pergunta'), answer: text('Resposta', { kind: 'long' }) }), () => ({ question: '', answer: '' }));

export const BANK_FIELDS: Record<string, EditorField> = {
  bankName: text('Banco'), beneficiary: text('Beneficiário'), iban: text('IBAN'), accountNumber: text('Número de conta'), unitelMoney: text('Unitel Money / telefone'), multicaixaEntity: text('Entidade Multicaixa'),
};

