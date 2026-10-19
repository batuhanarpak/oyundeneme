'use client';

import React from 'react';
import { Panel, Btn } from '@/components/ui/Panel';
import { IconSkull, IconGrid, IconCheck, IconArrowLeft } from '@/components/ui/Icons';
import { alpha } from '@/lib/color';

/**
 * The screen every mode ends on.
 *
 * Modes differ in how they are won and lost, but the closing beat should read
 * the same everywhere: a verdict, the record that produced it, and a way out.
 * Keeping that in one component is what stops each mode inventing its own
 * end state — and stops any of them stalling on the last frame.
 */

export interface TerminalStat {
  label: string;
  value: React.ReactNode;
  color?: string;
}

interface TerminalScreenProps {
  /** Verdict, in the mode's own vocabulary. */
  title: string;
  /** One line of context under the verdict. */
  subtitle?: string;
  outcome?: 'win' | 'loss';
  stats?: TerminalStat[];
  /** A ranked table, when the mode has opponents. */
  ranking?: { id: string; name: string; score: number; color: string; you?: boolean }[];
  /** Restarts the mode. Omit to hide the button. */
  onRetry?: () => void;
  onExit: () => void;
  retryLabel?: string;
}

export const TerminalScreen: React.FC<TerminalScreenProps> = ({
  title,
  subtitle,
  outcome = 'loss',
  stats = [],
  ranking,
  onRetry,
  onExit,
  retryLabel = 'tekrar dene',
}) => {
  const win = outcome === 'win';
  const accent = win ? 'var(--neon-green)' : 'var(--neon-rose)';
  const Icon = win ? IconCheck : IconSkull;

  return (
    <div className="mx-auto max-w-lg">
      <Panel accent={accent} bodyClass="p-8">
        <div className="anim-rise text-center">
          <span
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2"
            style={{ borderColor: accent, background: alpha(accent, 0.1), color: accent }}
          >
            <Icon size={30} />
          </span>

          <h2
            className="text-2xl font-black uppercase tracking-tight sm:text-3xl"
            style={{ color: accent }}
          >
            {title}
          </h2>
          {subtitle && <p className="mt-3 text-sm leading-relaxed text-[var(--text-mid)]">{subtitle}</p>}

          {stats.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="inset-well p-3 text-center">
                  <p className="label">{s.label}</p>
                  <p
                    className="stat mt-0.5 text-xl font-black"
                    style={{ color: s.color ?? 'var(--text-hi)' }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {ranking && ranking.length > 0 && (
            <div className="mt-6 space-y-2 text-left">
              <p className="label">sıralama</p>
              {[...ranking]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-2"
                    style={{ borderColor: p.you ? alpha(p.color, 0.4) : 'var(--line)' }}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs font-bold" style={{ color: p.color }}>
                      <span className="stat text-[var(--text-lo)]">#{i + 1}</span>
                      <span className="truncate">{p.name}</span>
                      {p.you && <span className="shrink-0 text-[9px] text-[var(--text-lo)]">SEN</span>}
                    </span>
                    <span className="stat shrink-0 text-sm font-black text-white">{p.score}</span>
                  </div>
                ))}
            </div>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {onRetry && (
              <Btn tone={win ? 'green' : 'rose'} onClick={onRetry}>
                {retryLabel}
              </Btn>
            )}
            <Btn tone="ghost" onClick={onExit}>
              <IconArrowLeft size={12} /> merkez
            </Btn>
          </div>
        </div>
      </Panel>

      <p className="mt-4 text-center text-[9px] uppercase tracking-[0.24em] text-[var(--text-lo)]">
        <IconGrid size={10} className="mr-1 inline" />
        oturum kaydı kapatıldı
      </p>
    </div>
  );
};
