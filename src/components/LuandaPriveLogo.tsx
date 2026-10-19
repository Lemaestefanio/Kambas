import React from 'react';

interface LuandaPriveLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light' | 'blue';
}

/** Use the supplied artwork, without recreating its lettering or monogram. */
export const LuandaPriveLogo: React.FC<LuandaPriveLogoProps> = ({ className = '', size = 'md' }) => {
  const widths = { sm: 'w-[114px]', md: 'w-[156px] sm:w-[180px]', lg: 'w-[216px]', xl: 'w-[276px]' };
  return <span className={`inline-flex shrink-0 items-center overflow-hidden rounded-md bg-black ${widths[size]} ${className}`}>
    <img src="/assets/platform-logo.png" alt="Luanda Privé" width="900" height="300" decoding="async" className="block h-auto w-full object-contain" />
  </span>;
};

