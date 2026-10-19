'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { sfx } from '@/lib/sfx';
import { IconAlert } from '@/components/ui/Icons';

const LABEL: Record<string, string> = {
  glitch: 'GLITCH ENJEKSİYONU',
  blur: 'GÖRÜNTÜ BOZULMASI',
  flip: 'EKSEN DEVRİLMESİ',
  freeze: 'SİSTEM DONDURMA',
  burst: 'VERİ PATLAMASI',
};

/**
 * Applies incoming attacks to the whole viewport and renders the alerts.
 * Reading the store here keeps attack visuals out of every individual screen.
 */
export const AttackLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const attacks = useGame((s) => s.attacks);
  const [cls, setCls] = useState('');
  /* Attacks are pruned twice a second by `tick`, so the array identity changes
   * when one merely EXPIRES. Keying the effect on the latest id — rather than
   * the array — stops an old attack from re-playing its glitch and its sound. */
  const playedRef = useRef<string | null>(null);

  useEffect(() => {
    const latest = attacks[attacks.length - 1];
    if (!latest || latest.id === playedRef.current) return;

    playedRef.current = latest.id;
    sfx.attack();
    setCls(`fx-${latest.kind}`);

    const t = setTimeout(() => setCls(''), 2800);
    return () => clearTimeout(t);
  }, [attacks]);

  return (
    <>
      <div className={`transition-all duration-300 ${cls}`}>{children}</div>

      <div className="pointer-events-none fixed left-1/2 top-20 z-[9996] flex -translate-x-1/2 flex-col items-center gap-2">
        {attacks.map((a) => (
          <div
            key={a.id}
            className="anim-rise flex items-center gap-3 rounded-lg border px-5 py-3 backdrop-blur-xl"
            style={{
              borderColor: 'var(--neon-rose)',
              background: 'rgba(244,63,94,0.16)',
              boxShadow: '0 0 32px rgba(244,63,94,0.4)',
            }}
          >
            <IconAlert size={20} className="shrink-0 text-[var(--neon-rose)]" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--neon-rose)]">
                {LABEL[a.kind] ?? 'SALDIRI'}
              </p>
              <p className="text-[10px] text-[var(--text-mid)]">
                Kaynak: <span className="font-bold text-white">{a.fromName}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
