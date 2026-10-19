import type { FAQItem } from '../types';

export interface CopyField {
  label: string;
  section: string;
  value: string;
}

/** Public content only. Credentials and private subscriber data never belong here. */
export interface SiteSettings {
  version: 1;
  copy: Record<string, string>;
  faqs: FAQItem[];
  bankDetails: {
    bankName: string;
    beneficiary: string;
    iban: string;
    accountNumber: string;
    unitelMoney: string;
    multicaixaEntity: string;
  };
}
