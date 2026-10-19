import React from 'react';

interface LuandaPriveLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light' | 'blue';
}

export const LuandaPriveLogo: React.FC<LuandaPriveLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  theme = 'dark',
}) => {
  // Height configurations
  const heights = {
    sm: 'h-6',
    md: 'h-8 sm:h-9',
    lg: 'h-11 sm:h-12',
    xl: 'h-14 sm:h-16',
  };

  const textSizes = {
    sm: 'text-sm sm:text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  };

  const monogramSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  // Color configurations based on theme
  const brandBlue = '#0099ff'; // Exact official electric blue from uploaded logo
  const textColor = theme === 'dark' ? 'text-white' : 'text-[#0099ff]';
  const priveColor = theme === 'dark' ? 'text-[#0099ff]' : 'text-[#0099ff]';

  // SVG representation of the official intertwined LP Monogram
  const MonogramSvg = ({ className: svgClass = '' }: { className?: string }) => (
    <svg
      viewBox="0 0 100 100"
      className={`${svgClass}`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Serif 'L' with classical brackets & sweeping calligraphic tail */}
      <path
        d="M26,18 C23,15 17,14 10,16 C5,17 2,22 2,27 C2,31 4,34 8,34 C12,34 14,31 14,27 C14,23 11,20 8,20 C12,18 18,17 21,19 C23,20 24,23 24,28 L24,78 C24,86 21,91 14,94 C8,97 2,96 -2,93 C3,90 8,85 11,78 L12,74 L14,74 C16,74 18,80 18,84 C18,91 26,96 36,96 C48,96 58,88 65,78 C73,67 79,54 84,40 C85,35 82,32 77,32 C71,32 67,36 64,43 C61,50 56,58 50,64 L50,27 C50,22 52,20 58,18 Z"
        fill="#0099ff"
      />
      {/* Intertwined 'P' with high bowl and serif terminal */}
      <path
        d="M44,22 L44,98 C44,103 40,105 34,105 L30,105 L30,107 L60,107 L60,105 C54,105 50,103 50,98 L50,66 C58,66 67,65 75,60 C83,55 89,47 89,38 C89,28 83,21 75,18 C67,15 57,15 48,16 Z M50,23 C56,22 63,22 69,25 C75,28 80,33 80,41 C80,49 75,56 68,60 C62,63 56,64 50,64 Z"
        fill="#0099ff"
      />
      {/* Interlacing decorative loop */}
      <path
        d="M32,94 C44,94 60,88 74,74 C84,65 91,54 95,42 C97,37 94,35 89,36 C84,37 78,45 73,54 C66,67 54,78 42,85 C34,89 28,91 24,91 C26,92 29,94 32,94 Z"
        fill="#0099ff"
        opacity="0.95"
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
        <MonogramSvg className={monogramSizes[size]} />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 sm:gap-2.5 select-none ${heights[size]} ${className}`}
      style={{ fontFamily: "'Playfair Display', Didot, 'Cormorant Garamond', Georgia, serif" }}
    >
      {/* Official Intertwined LP Monogram */}
      <div className="shrink-0 flex items-center justify-center">
        <MonogramSvg className={monogramSizes[size]} />
      </div>

      {/* Official Wordmark: Luanda Privé */}
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className={`font-bold tracking-tight ${textColor} ${textSizes[size]}`}>
          Luanda
        </span>
        <span className={`font-bold tracking-tight ${priveColor} ${textSizes[size]}`}>
          Privé
        </span>

        {/* Subtle VIP tag */}
        {variant === 'full' && (
          <span className="ml-1 text-[8px] sm:text-[9px] font-sans font-black uppercase tracking-wider text-amber-400 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.2 rounded">
            VIP
          </span>
        )}
      </div>
    </div>
  );
};
