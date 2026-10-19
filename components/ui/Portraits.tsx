'use client';

import React, { useId } from 'react';
import { alpha } from '@/lib/color';

/**
 * Hand-drawn SVG artwork for the operator portraits.
 *
 * These are real illustrations — layered silhouettes, visors, scanlines and
 * rim lighting — not gradient placeholders. Vector keeps them razor-sharp at
 * any size and immune to the broken-image icon.
 *
 * Every portrait is drawn on a 120×140 grid so they compose identically.
 */

interface PortraitProps {
  size?: number;
  className?: string;
  /** Draws the animated scan sweep. Off for tiny thumbnails. */
  live?: boolean;
}

const Frame: React.FC<{ children: React.ReactNode; color: string; live?: boolean; size?: number; className?: string }> = ({
  children,
  color,
  live = true,
  size,
  className,
}) => {
  /* Unique per instance: the same portrait can render twice on one page
     (role cards plus the sidebar), and duplicate SVG ids would make every
     `url(#…)` resolve to whichever node the document parsed first. */
  const key = useId().replace(/[^a-z0-9]/gi, '');
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl border ${className ?? ''}`}
      style={{
        width: size,
        height: size ? size * 1.166 : undefined,
        borderColor: `${alpha(color, 0.27)}`,
        background: `radial-gradient(ellipse at 50% 18%, ${alpha(color, 0.13)}, transparent 68%), #05080f`,
      }}
    >
      <svg viewBox="0 0 120 140" className="h-full w-full">
        {/* Backdrop grid */}
        <defs>
          <pattern id={`g-${key}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M12 0H0V12" fill="none" stroke={color} strokeOpacity="0.13" strokeWidth="0.6" />
          </pattern>
          <linearGradient id={`fade-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#05080f" stopOpacity="0" />
            <stop offset="1" stopColor="#05080f" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="120" height="140" fill={`url(#g-${key})`} />
        {children}
        {/* Bottom fade so the portrait seats into the card */}
        <rect x="0" y="112" width="120" height="28" fill={`url(#fade-${key})`} />
      </svg>

      {live && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-8 opacity-40"
          style={{
            background: `linear-gradient(180deg, transparent, ${alpha(color, 0.33)}, transparent)`,
            animation: 'nb-portrait-scan 3.6s linear infinite',
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */

/** THE GHOST — hooded figure, night-vision goggles, rim light. */
export const PortraitGhost: React.FC<PortraitProps> = ({ size, className, live }) => {
  const c = '#fbbf24';
  return (
    <Frame color={c} size={size} className={className} live={live}>
      {/* Shoulders */}
      <path d="M18 140C18 112 34 98 60 98C86 98 102 112 102 140Z" fill="#0d1219" />
      <path d="M18 140C18 112 34 98 60 98C86 98 102 112 102 140Z" fill="none" stroke={c} strokeOpacity="0.4" strokeWidth="1.2" />
      {/* Hood */}
      <path d="M60 18C40 18 30 34 30 56C30 76 38 90 60 90C82 90 90 76 90 56C90 34 80 18 60 18Z" fill="#131a24" />
      <path d="M60 18C40 18 30 34 30 56C30 76 38 90 60 90C82 90 90 76 90 56C90 34 80 18 60 18Z" fill="none" stroke={c} strokeOpacity="0.55" strokeWidth="1.4" />
      {/* Face shadow */}
      <ellipse cx="60" cy="60" rx="21" ry="24" fill="#070a10" />
      {/* Goggles */}
      <rect x="41" y="50" width="17" height="13" rx="6.5" fill="#0a0e15" stroke={c} strokeWidth="1.5" />
      <rect x="62" y="50" width="17" height="13" rx="6.5" fill="#0a0e15" stroke={c} strokeWidth="1.5" />
      <rect x="57" y="54" width="6" height="5" rx="2" fill={c} fillOpacity="0.6" />
      {/* Lens glow */}
      <circle cx="49.5" cy="56.5" r="3.2" fill={c} fillOpacity="0.85" />
      <circle cx="70.5" cy="56.5" r="3.2" fill={c} fillOpacity="0.85" />
      <circle cx="48.4" cy="55.4" r="1.1" fill="#fff" fillOpacity="0.9" />
      <circle cx="69.4" cy="55.4" r="1.1" fill="#fff" fillOpacity="0.9" />
      {/* Mouth guard */}
      <path d="M48 72h24v6a12 12 0 0 1-24 0Z" fill="#1a222e" stroke={c} strokeOpacity="0.4" strokeWidth="1" />
      {[52, 57, 62, 67].map((x) => (
        <line key={x} x1={x} y1="73" x2={x} y2="79" stroke="#05080f" strokeWidth="1.2" />
      ))}
      {/* Rim light down the right edge */}
      <path d="M88 30C94 40 95 56 90 72" fill="none" stroke={c} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </Frame>
  );
};

/** THE ORACLE — visor, headset, data reflections. */
export const PortraitOracle: React.FC<PortraitProps> = ({ size, className, live }) => {
  const c = '#a78bfa';
  return (
    <Frame color={c} size={size} className={className} live={live}>
      {/* Shoulders + collar */}
      <path d="M16 140C16 110 33 96 60 96C87 96 104 110 104 140Z" fill="#100d1c" />
      <path d="M16 140C16 110 33 96 60 96C87 96 104 110 104 140Z" fill="none" stroke={c} strokeOpacity="0.4" strokeWidth="1.2" />
      {/* Neck */}
      <rect x="52" y="82" width="16" height="18" rx="4" fill="#181330" />
      {/* Head */}
      <ellipse cx="60" cy="54" rx="26" ry="31" fill="#1a1533" stroke={c} strokeOpacity="0.5" strokeWidth="1.4" />
      {/* Visor band */}
      <path d="M34 46C34 40 44 36 60 36C76 36 86 40 86 46V56C86 62 76 66 60 66C44 66 34 62 34 56Z" fill="#0a0716" stroke={c} strokeWidth="1.6" />
      {/* Scrolling data lines inside the visor */}
      {[42, 47, 52, 57].map((y, i) => (
        <line
          key={y}
          x1={40 + i * 2}
          y1={y}
          x2={80 - i * 2}
          y2={y}
          stroke={c}
          strokeOpacity={0.8 - i * 0.12}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
      {/* Bright scan dot */}
      <circle cx="66" cy="47" r="2" fill="#fff" fillOpacity="0.95" />
      {/* Headset cups */}
      <rect x="26" y="48" width="9" height="17" rx="4" fill="#241d45" stroke={c} strokeOpacity="0.7" strokeWidth="1.2" />
      <rect x="85" y="48" width="9" height="17" rx="4" fill="#241d45" stroke={c} strokeOpacity="0.7" strokeWidth="1.2" />
      {/* Mic boom */}
      <path d="M31 64C31 76 40 82 50 82" fill="none" stroke={c} strokeOpacity="0.75" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="50" cy="82" r="3" fill={c} fillOpacity="0.8" />
      {/* Jaw line */}
      <path d="M50 70C54 74 66 74 70 70" fill="none" stroke={c} strokeOpacity="0.35" strokeWidth="1.2" />
    </Frame>
  );
};

/** THE ARCHITECT — hard hat silhouette, circuit traces, power core. */
export const PortraitArchitect: React.FC<PortraitProps> = ({ size, className, live }) => {
  const c = '#4ade80';
  return (
    <Frame color={c} size={size} className={className} live={live}>
      {/* Shoulders */}
      <path d="M14 140C14 109 32 95 60 95C88 95 106 109 106 140Z" fill="#0a1610" />
      <path d="M14 140C14 109 32 95 60 95C88 95 106 109 106 140Z" fill="none" stroke={c} strokeOpacity="0.4" strokeWidth="1.2" />
      {/* Circuit traces on the shoulders */}
      {[26, 94].map((x, i) => (
        <g key={x} stroke={c} strokeOpacity="0.55" strokeWidth="1.1" fill="none">
          <path d={`M${x} 140V${124 + i * 4}H${x + (i ? -8 : 8)}V110`} />
          <circle cx={x + (i ? -8 : 8)} cy="108" r="2.2" fill={c} fillOpacity="0.7" stroke="none" />
        </g>
      ))}
      {/* Head */}
      <rect x="38" y="34" width="44" height="52" rx="14" fill="#0f1c15" stroke={c} strokeOpacity="0.55" strokeWidth="1.4" />
      {/* Helmet / hard hat */}
      <path d="M32 38C32 24 44 16 60 16C76 16 88 24 88 38Z" fill="#16281d" stroke={c} strokeWidth="1.6" />
      <rect x="30" y="36" width="60" height="5" rx="2.5" fill={c} fillOpacity="0.35" />
      {/* Eye slit */}
      <rect x="45" y="50" width="30" height="8" rx="4" fill="#040806" stroke={c} strokeOpacity="0.6" strokeWidth="1" />
      <circle cx="52" cy="54" r="2.2" fill={c} />
      <circle cx="68" cy="54" r="2.2" fill={c} />
      {/* Vent grille over the mouth */}
      {[66, 70, 74].map((y) => (
        <line key={y} x1="50" y1={y} x2="70" y2={y} stroke={c} strokeOpacity="0.45" strokeWidth="1.3" strokeLinecap="round" />
      ))}
      {/* Power core on the chest */}
      <circle cx="60" cy="112" r="7" fill="#04100a" stroke={c} strokeWidth="1.4" />
      <circle cx="60" cy="112" r="3" fill={c} fillOpacity="0.9" />
      <circle cx="60" cy="112" r="11" fill="none" stroke={c} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" />
    </Frame>
  );
};

export const PORTRAITS = {
  ghost: PortraitGhost,
  oracle: PortraitOracle,
  architect: PortraitArchitect,
} as const;
