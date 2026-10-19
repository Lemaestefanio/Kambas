import React, { useState } from 'react';
import { ArrowUpRight, Check, Copy, FlaskConical, RotateCcw, UserRound, UserRoundCheck } from 'lucide-react';
import type { Creator, PageVariant } from '../types';
import { safeActionUrl } from '../utils/actionLinks';
import { DEFAULT_PAGE_VARIANTS, getPageVariant, pageVariantHref, safeVariantMediaUrl, type PageVariantKey } from '../utils/pageVariants';

interface VariantsEditorProps {
  creator: Creator;
  onChange: (creator: Creator) => void;
  disabled?: boolean;
}

const inputClass = 'w-full rounded-lg border border-white/15 bg-[#11131d] px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400 disabled:opacity-50';

export function VariantsEditor({ creator, onChange, disabled = false }: VariantsEditorProps) {
  const [active, setActive] = useState<PageVariantKey>('a');
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const configuration = getPageVariant(creator, active);
  const link = pageVariantHref(creator.id, active);
  const prefix = `page-variant-${creator.id}-${active}`;
  const update = (patch: Partial<PageVariant>) => onChange({
    ...creator,
    pageVariants: { ...creator.pageVariants, [active]: { ...configuration, ...patch } },
  });
  const copyLink = async () => {
    setCopyError(false);
    setCopied(null);
    try {
      await navigator.clipboard.writeText(new URL(link, window.location.origin).href);
      setCopied(link);
    } catch {
      setCopyError(true);
    }
  };

  return <div className="space-y-6">
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold"><FlaskConical size={19} /> Duas versões para testar</h3>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">Cria duas apresentações deste perfil e partilha o link de cada uma. Escolhe como a pessoa segue para o pagamento em cada versão.</p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Versão do perfil">
      {(['a', 'b'] as const).map((key) => {
        const item = getPageVariant(creator, key);
        return <button key={key} type="button" role="tab" id={`variant-tab-${creator.id}-${key}`} tabIndex={active === key ? 0 : -1} aria-selected={active === key} aria-controls={`variant-panel-${creator.id}-${key}`} onClick={() => { setActive(key); setCopyError(false); }} onKeyDown={(event) => {
          const next = event.key === 'Home' ? 'a' : event.key === 'End' ? 'b' : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? (key === 'a' ? 'b' : 'a') : null;
          if (!next) return;
          event.preventDefault();
          setActive(next);
          setCopyError(false);
          document.getElementById(`variant-tab-${creator.id}-${next}`)?.focus();
        }} className={`rounded-xl border p-4 text-left transition-colors ${active === key ? 'border-pink-400/60 bg-pink-500/10' : 'border-white/10 bg-white/[0.025] hover:bg-white/5'}`}>
          <span className="flex items-center justify-between gap-2"><span className={`text-xs font-semibold uppercase tracking-wider ${active === key ? 'text-pink-200' : 'text-slate-400'}`}>Versão {key.toUpperCase()}</span>{key === 'a' && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">Principal</span>}</span>
          <span className="mt-2 block text-base font-semibold text-white">{item.label.trim() || DEFAULT_PAGE_VARIANTS[key].label}</span>
          <span className="mt-2 flex items-center gap-2 text-xs text-slate-400">{item.checkoutMode === 'guest' ? <UserRound size={14} /> : <UserRoundCheck size={14} />}{item.checkoutMode === 'guest' ? 'Pagamento sem conta obrigatória' : 'Pedir conta antes do pagamento'}</span>
        </button>;
      })}
    </div>

    <section id={`variant-panel-${creator.id}-${active}`} role="tabpanel" aria-labelledby={`variant-tab-${creator.id}-${active}`} className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${prefix}-label`} className="space-y-1.5 text-sm text-slate-200"><span className="block">Nome para identificar o teste</span><input id={`${prefix}-label`} className={inputClass} value={configuration.label} maxLength={80} onChange={(event) => update({ label: event.target.value })} placeholder={DEFAULT_PAGE_VARIANTS[active].label} /></label>
          <label htmlFor={`${prefix}-flow`} className="space-y-1.5 text-sm text-slate-200"><span className="block">Antes de pagar</span><select id={`${prefix}-flow`} className={inputClass} value={configuration.checkoutMode} onChange={(event) => update({ checkoutMode: event.target.value as PageVariant['checkoutMode'] })}><option value="guest">Continuar sem criar conta</option><option value="account">Pedir para entrar ou criar conta</option></select></label>
        </div>

        <div className="border-t border-white/10 pt-5"><h4 className="text-sm font-semibold text-white">O que muda nesta versão</h4><p className="mt-1 text-xs leading-relaxed text-slate-400">Deixa um campo vazio para usar o que já está configurado no perfil. Publicações, planos, comentários e textos gerais continuam partilhados.</p></div>

        <label htmlFor={`${prefix}-button`} className="block space-y-1.5 text-sm text-slate-200"><span className="block">Texto do botão de compra</span><input id={`${prefix}-button`} className={inputClass} value={configuration.customPaymentButtonText || ''} maxLength={120} placeholder={creator.customPaymentButtonText || 'Usar o texto do perfil'} onChange={(event) => update({ customPaymentButtonText: event.target.value })} /></label>
        <label htmlFor={`${prefix}-bio`} className="block space-y-1.5 text-sm text-slate-200"><span className="block">Apresentação do perfil</span><textarea id={`${prefix}-bio`} className={inputClass} value={configuration.bio || ''} maxLength={4000} rows={4} placeholder="Usar a apresentação actual do perfil" onChange={(event) => update({ bio: event.target.value })} /></label>

        <div className="grid gap-4 sm:grid-cols-2">
          {([['avatar', 'Fotografia de perfil'], ['banner', 'Imagem de capa']] as const).map(([field, label]) => {
            const invalid = !!configuration[field]?.trim() && !safeVariantMediaUrl(configuration[field]);
            return <label key={field} htmlFor={`${prefix}-${field}`} className="space-y-1.5 text-sm text-slate-200"><span className="block">{label}</span><input id={`${prefix}-${field}`} type="text" inputMode="url" autoCapitalize="none" spellCheck={false} aria-invalid={invalid || undefined} aria-describedby={`${prefix}-${field}-hint`} className={inputClass} value={configuration[field] || ''} maxLength={4096} placeholder="https://… (opcional)" onChange={(event) => update({ [field]: event.target.value })} onBlur={(event) => update({ [field]: safeVariantMediaUrl(event.target.value) || event.target.value.trim() })} /><span id={`${prefix}-${field}-hint`} className={`block text-xs ${invalid ? 'text-rose-300' : 'text-slate-500'}`}>{invalid ? 'Usa um endereço HTTPS ou um caminho que começa por /assets/.' : 'Endereço da imagem que queres testar.'}</span></label>;
          })}
        </div>

        <label htmlFor={`${prefix}-checkout`} className="block space-y-1.5 text-sm text-slate-200"><span className="block">Link de pagamento desta versão</span><input id={`${prefix}-checkout`} type="text" inputMode="url" autoCapitalize="none" spellCheck={false} className={inputClass} value={configuration.checkoutUrl || ''} maxLength={4096} aria-invalid={!!configuration.checkoutUrl?.trim() && !safeActionUrl(configuration.checkoutUrl) || undefined} aria-describedby={`${prefix}-checkout-hint`} placeholder="https://… (opcional)" onChange={(event) => update({ checkoutUrl: event.target.value })} onBlur={(event) => update({ checkoutUrl: safeActionUrl(event.target.value) || event.target.value.trim() })} /><span id={`${prefix}-checkout-hint`} className={`block text-xs leading-relaxed ${configuration.checkoutUrl?.trim() && !safeActionUrl(configuration.checkoutUrl) ? 'text-rose-300' : 'text-slate-400'}`}>{configuration.checkoutUrl?.trim() && !safeActionUrl(configuration.checkoutUrl) ? 'Usa um endereço HTTPS ou um caminho que começa por /.' : 'Se preenchido, este link será usado para a compra em qualquer plano desta versão. Usa um link distinto por versão para comparar as vendas no teu provedor de pagamentos.'}</span></label>

        <button type="button" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white disabled:opacity-40" onClick={() => onChange({ ...creator, pageVariants: { ...creator.pageVariants, [active]: { ...DEFAULT_PAGE_VARIANTS[active] } } })}><RotateCcw size={13} /> Repor os campos desta versão</button>
      </fieldset>

      <div className="space-y-3 border-t border-white/10 pt-5">
        <div><h4 className="text-sm font-semibold">Link da versão {active.toUpperCase()}</h4><p className="mt-1 text-xs text-slate-400">Guarda o perfil antes de abrir ou partilhar. O link mostra a última versão guardada.</p></div>
        <div className="flex flex-wrap items-center gap-2"><a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-3 py-2 text-sm font-medium text-white hover:bg-pink-400">Abrir versão {active.toUpperCase()}<ArrowUpRight size={16} /></a><button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">{copied === link ? <Check size={15} /> : <Copy size={15} />}{copied === link ? 'Link copiado' : 'Copiar link'}</button></div>
        <p className="break-all text-xs text-slate-500">{link}</p>
        {copyError && <p role="alert" className="text-xs text-amber-200">Não foi possível copiar automaticamente. Abre a versão e copia o endereço do navegador.</p>}
      </div>
    </section>

    <p className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs leading-relaxed text-slate-400">A versão A é a principal. A versão B abre pelo seu link próprio. A plataforma não distribui visitantes automaticamente nem confirma vendas: compara os pagamentos concluídos no teu provedor, usando os dois links de pagamento.</p>
  </div>;
}
