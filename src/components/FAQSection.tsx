import { useSiteContent } from '../cms/SiteContent';
import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const { copy, settings } = useSiteContent();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="px-4 pt-6 pb-8">
      {/* Title */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-[#00aff0]" />
        <h2 className="text-base font-bold text-slate-900">{copy('home.faq.title')}</h2>
      </div>

      {/* Accordion */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        {settings.faqs.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="px-4 border-b border-slate-200/60 last:border-b-0">
              <button
                onClick={() => toggle(idx)}
                className="w-full text-left flex items-center justify-between text-[13px] font-semibold text-slate-900 py-4 transition-colors hover:text-[#00aff0]"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#00aff0]' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="text-[13px] text-slate-600 pb-4 leading-relaxed animate-fade-in">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
