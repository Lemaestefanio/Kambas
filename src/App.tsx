import React, { lazy, Suspense, useState } from 'react';
import { AgeVerificationModal } from './components/AgeVerificationModal';
import { hasAgeConsent } from './utils/ageConsent';

export type PageMode = 'login-first' | 'direct-pay' | 'teaser-promo';
export type ActiveView = 'feed' | 'messages' | 'comments' | 'checkout';

// Do not load the catalogue, player modules or Firebase listeners before consent.
const PlatformApp = lazy(() => import('./PlatformApp'));

export default function App() {
  const [ageVerified, setAgeVerified] = useState(hasAgeConsent);

  if (!ageVerified) {
    return <AgeVerificationModal onVerified={() => setAgeVerified(true)} />;
  }

  return (
    <Suspense fallback={
      <main className="min-h-screen grid place-items-center bg-slate-950 px-6 text-white" aria-busy="true">
        <p className="text-sm text-slate-300" role="status">A abrir a plataforma…</p>
      </main>
    }>
      <PlatformApp />
    </Suspense>
  );
}

