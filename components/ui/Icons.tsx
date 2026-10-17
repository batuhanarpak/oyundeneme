import React from 'react';

/**
 * Hand-built icon set. Inline SVG keeps the bundle free of an icon
 * dependency and lets every glyph inherit `currentColor`.
 */

type P = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconGhost = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2a7 7 0 0 0-7 7v11l2.5-2 2 2 2.5-2 2.5 2 2-2L19 20V9a7 7 0 0 0-7-7Z" />
    <circle cx="9.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconEye = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconGrid = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconBolt = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
);

export const IconBrain = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 3 3 3 3 0 0 0 4 2.8V3.5A3 3 0 0 0 9 3Z" />
    <path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-3 3 3 3 0 0 1-4 2.8" />
  </svg>
);

export const IconTower = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M8 21V7l4-4 4 4v14" />
    <path d="M5 21h14M10 9h4M10 13h4M10 17h4" />
  </svg>
);

export const IconShield = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2 4 5.5V11c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5.5L12 2Z" />
  </svg>
);

export const IconChat = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.6A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8Z" />
  </svg>
);

export const IconSend = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
  </svg>
);

export const IconTarget = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLock = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconUnlock = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 7.5-2" />
  </svg>
);

export const IconChevron = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconArrowLeft = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const IconUsers = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16.5 5.3a3.2 3.2 0 0 1 0 5.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
  </svg>
);

export const IconSignature = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 17c3 0 4-9 7-9s2 6 4 6 2-3 3-3 1.5 1.5 4 1.5" />
    <path d="M3 21h18" opacity="0.4" />
  </svg>
);

export const IconSkull = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2a8 8 0 0 0-8 8v3l2 2v3h2v2h8v-2h2v-3l2-2v-3a8 8 0 0 0-8-8Z" />
    <circle cx="9" cy="11" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTerminal = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="2.5" y="4" width="19" height="16" rx="2" />
    <path d="m7 9 3 3-3 3M13 15h4" />
  </svg>
);

export const IconVolume = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const IconWave = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 12h3l2-7 3 14 3-11 2 7 2-3h5" />
  </svg>
);
