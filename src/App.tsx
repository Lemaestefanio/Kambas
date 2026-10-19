import React, { lazy, Suspense, useState } from 'react';
import { AgeVerificationModal } from './components/AgeVerificationModal';
import { hasAgeConsent } from './utils/ageConsent';
import { PlatformSkeleton } from './components/PlatformSkeleton';

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
    <Suspense fallback={<PlatformSkeleton />}>
      <PlatformApp />
    </Suspense>
  );
}

