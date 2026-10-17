'use client';

import React from 'react';
import type { SkillId } from '@/config/space';

/**
 * Skill glyphs, drawn as vectors so they stay legible at HUD size and pick up
 * the skill's accent colour through `currentColor`.
 */

type P = { size?: number; className?: string };

const svg = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  className,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/* ---------------- control ---------------- */

const IconStun = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" opacity="0.5" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

const IconSleep = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    <path d="M16 4h4l-4 4h4" opacity="0.6" strokeWidth="1.4" />
  </svg>
);

const IconSlow = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l-3 2" />
    <path d="M3.5 5.5v3h3" opacity="0.6" />
  </svg>
);

/* ---------------- projectiles ---------------- */

/** Fireball — a molten core with a trailing tail. */
const IconFireball = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <circle cx="10" cy="12" r="5.2" />
    <path d="M15 8c2 .6 3.4 2 4.2 3.6M15 16c2-.6 3.4-2 4.2-3.6" opacity="0.65" />
    <path d="M10 6.8c1.6 1.6 1.6 8.8 0 10.4" opacity="0.4" />
  </svg>
);

/** Ice ball — a faceted crystal. */
const IconIceball = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M12 3.5 18 9l-2.4 8.2H8.4L6 9Z" />
    <path d="M12 3.5V17M6 9h12M8.4 17.2 12 9l3.6 8.2" opacity="0.5" />
  </svg>
);

/** Energy orb — a ringed sphere. */
const IconEnergyball = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <circle cx="12" cy="12" r="5" />
    <ellipse cx="12" cy="12" rx="9.5" ry="3.6" opacity="0.6" />
    <ellipse cx="12" cy="12" rx="3.6" ry="9.5" opacity="0.35" />
  </svg>
);

/** Cluster bomb — a shell breaking into fragments. */
const IconCluster = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <circle cx="12" cy="8" r="4" />
    <circle cx="6.5" cy="16.5" r="2.2" opacity="0.8" />
    <circle cx="12" cy="17.5" r="2.2" opacity="0.8" />
    <circle cx="17.5" cy="16.5" r="2.2" opacity="0.8" />
  </svg>
);

/* ---------------- defence ---------------- */

const IconHeal = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M12 3 4.5 6.5v6c0 4.4 3.2 7.6 7.5 8.5 4.3-.9 7.5-4.1 7.5-8.5v-6L12 3Z" />
    <path d="M12 9v6M9 12h6" />
  </svg>
);

const IconShield = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M12 3 4.5 6.5v6c0 4.4 3.2 7.6 7.5 8.5 4.3-.9 7.5-4.1 7.5-8.5v-6L12 3Z" />
    <path d="M8.5 12h7" opacity="0.6" />
  </svg>
);

const IconFortify = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M12 3 4.5 6.5v6c0 4.4 3.2 7.6 7.5 8.5 4.3-.9 7.5-4.1 7.5-8.5v-6L12 3Z" />
    <path d="M12 8v8M9 11h6" opacity="0.5" />
    <path d="M4.5 6.5 12 10l7.5-3.5" opacity="0.4" strokeWidth="1.3" />
  </svg>
);

/* ---------------- mobility ---------------- */

const IconBlink = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M5 19 12 5" opacity="0.35" strokeDasharray="2 3" />
    <path d="M17 5l3 3-3 3M20 8h-7" />
    <circle cx="5" cy="19" r="2" />
  </svg>
);

const IconOverdrive = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" />
  </svg>
);

const IconCloak = ({ size = 20, className }: P) => (
  <svg {...svg(size, className)}>
    <path d="M12 4 19 20l-7-4-7 4Z" opacity="0.45" strokeDasharray="3 3" />
    <circle cx="12" cy="11" r="2" />
  </svg>
);

export const SKILL_ICONS: Record<SkillId, React.FC<P>> = {
  stun: IconStun,
  sleep: IconSleep,
  slow: IconSlow,
  fireball: IconFireball,
  iceball: IconIceball,
  energyball: IconEnergyball,
  cluster: IconCluster,
  heal: IconHeal,
  shield: IconShield,
  fortify: IconFortify,
  blink: IconBlink,
  overdrive: IconOverdrive,
  cloak: IconCloak,
};
