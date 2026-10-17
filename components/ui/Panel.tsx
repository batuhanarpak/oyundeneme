'use client';

import React from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  accent?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
  bare?: boolean;
}

/**
 * The one surface every screen is built from. A hairline top sheen plus a
 * translucent body reads as glass; the accent only tints the header rule.
 */
export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  accent = 'var(--neon-cyan)',
  right,
  children,
  className = '',
  bodyClass = 'p-5',
  bare = false,
}) => (
  <section className={`panel ${className}`}>
    {title && (
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
        <div className="min-w-0">
          <h2
            className="truncate text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-[10px] tracking-wide text-[var(--text-lo)]">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <span className="h-1.5 w-1.5 rounded-full anim-pulse" style={{ background: accent }} />
        </div>
      </header>
    )}
    <div className={bare ? bodyClass : bodyClass}>{children}</div>
  </section>
);

/* ------------------------------------------------------------------ */

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'cyan' | 'rose' | 'green' | 'violet' | 'ghost' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

const TONES: Record<string, { c: string; bg: string }> = {
  cyan: { c: 'var(--neon-cyan)', bg: 'rgba(34,211,238,0.12)' },
  rose: { c: 'var(--neon-rose)', bg: 'rgba(244,63,94,0.12)' },
  green: { c: 'var(--neon-green)', bg: 'rgba(74,222,128,0.12)' },
  violet: { c: 'var(--neon-violet)', bg: 'rgba(167,139,250,0.12)' },
  amber: { c: 'var(--neon-amber)', bg: 'rgba(251,191,36,0.12)' },
  ghost: { c: 'var(--text-mid)', bg: 'rgba(255,255,255,0.04)' },
};

export const Btn: React.FC<BtnProps> = ({
  tone = 'cyan',
  size = 'md',
  active,
  className = '',
  children,
  ...rest
}) => {
  const t = TONES[tone];
  const pad =
    size === 'sm' ? 'px-3 py-1.5 text-[10px]' : size === 'lg' ? 'px-7 py-3.5 text-sm' : 'px-4 py-2.5 text-xs';

  return (
    <button
      {...rest}
      className={`group relative overflow-hidden rounded-lg border font-bold uppercase tracking-[0.16em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-35 ${pad} ${className}`}
      style={{
        borderColor: active ? t.c : `${t.c}55`,
        background: active ? t.bg : 'rgba(255,255,255,0.025)',
        color: t.c,
        boxShadow: active ? `0 0 20px ${t.c}44, inset 0 0 20px ${t.c}18` : 'none',
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      {/* Light sweep on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.c}22, transparent)`,
          animation: 'nb-sweep 0.85s ease',
        }}
      />
    </button>
  );
};

/* ------------------------------------------------------------------ */

export const Meter: React.FC<{
  value: number;
  max?: number;
  color?: string;
  height?: number;
  label?: string;
}> = ({ value, max = 100, color = 'var(--neon-cyan)', height = 6, label }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between">
          <span className="label">{label}</span>
          <span className="stat text-[10px] font-bold" style={{ color }}>
            {Math.round(pct)}%
          </span>
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full"
        style={{ height, background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const Chip: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = 'var(--text-mid)',
}) => (
  <span
    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
    style={{ borderColor: `${color}44`, color, background: `${color}12` }}
  >
    {children}
  </span>
);
