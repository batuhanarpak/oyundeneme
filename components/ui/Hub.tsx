'use client';

import React, { useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { Panel, Btn, Chip } from '@/components/ui/Panel';
import { CommsPanel } from '@/components/ui/CommsPanel';
import { MODES } from '@/config/game';
import { CATEGORIES } from '@/config/questions';
import { PortraitGhost, PortraitOracle, PortraitArchitect } from '@/components/ui/Portraits';
import { TowerArt } from '@/components/ui/Schematics';
import { sfx } from '@/lib/sfx';
import {
  IconGhost, IconBrain, IconTower, IconUsers, IconChevron, IconTerminal, IconTarget,
} from '@/components/ui/Icons';
import type { Mode } from '@/store/useGameStore';

/** Space mode gets its own inline mark — a ship silhouette. */
const IconShip: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className={className}>
    <path d="M12 2 19 20l-7-4-7 4Z" />
    <path d="M12 7v9" opacity="0.5" />
  </svg>
);

const MODE_ICONS = { breach: IconGhost, clash: IconBrain, tower: IconTower, space: IconShip } as const;

/**
 * Each mode card opens with its own artwork: the Breach shows the three
 * operator portraits, Clash shows category swatches, Tower shows the keep.
 */
const ModeArtwork: React.FC<{ id: Mode }> = ({ id }) => {
  if (id === 'breach') {
    return (
      <div className="flex gap-1.5">
        {[PortraitGhost, PortraitOracle, PortraitArchitect].map((P, i) => (
          <P key={i} size={undefined} className="!h-24 flex-1 !rounded-lg" live={false} />
        ))}
      </div>
    );
  }

  if (id === 'clash') {
    return (
      <div className="grid grid-cols-5 gap-1.5">
        {CATEGORIES.slice(0, 5).map((c) => (
          <div
            key={c.id}
            className="flex h-24 items-end overflow-hidden rounded-lg border p-1.5"
            style={{ background: c.backdrop, borderColor: `${c.accent}44` }}
          >
            <span
              className="w-full text-center text-[7px] font-black uppercase leading-tight tracking-wider"
              style={{ color: c.accent }}
            >
              {c.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (id === 'space') {
    return (
      <div
        className="flex h-24 items-center justify-center gap-3 rounded-lg border border-[var(--neon-violet)]/25"
        style={{ background: 'radial-gradient(ellipse at center, rgba(167,139,250,0.2), #04060c 72%)' }}
      >
        {['#22d3ee', '#f43f5e', '#a78bfa'].map((c, i) => (
          <svg key={c} viewBox="-30 -30 60 60" className="h-16 w-16" style={{ opacity: 1 - i * 0.22 }}>
            <g style={{ filter: `drop-shadow(0 0 7px ${c})` }}>
              <path d="M0 -24 L16 13 L7 8 L0 18 L-7 8 L-16 13 Z" fill="#0b1220" stroke={c} strokeWidth="2.2" />
              <ellipse cx="0" cy="-6" rx="4.5" ry="8" fill={c} fillOpacity="0.85" />
            </g>
          </svg>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-24 items-end justify-center gap-2 rounded-lg border border-[var(--neon-amber)]/25 bg-[#0a0d14] p-1.5">
      {[100, 62, 34].map((h, i) => (
        <div key={i} className="w-12 opacity-90">
          <TowerArt hp={h} max={100} accent="var(--neon-amber)" />
        </div>
      ))}
    </div>
  );
};

export const Hub: React.FC = () => {
  const setMode = useGame((s) => s.setMode);
  const setRole = useGame((s) => s.setRole);
  const name = useGame((s) => s.name);
  const color = useGame((s) => s.color);
  const playerId = useGame((s) => s.playerId);
  const peers = useGame((s) => s.peers);
  const [hover, setHover] = useState<string | null>(null);

  const enter = (m: Mode) => {
    sfx.confirm();
    if (m !== 'breach') setRole('spectator');
    setMode(m);
  };

  return (
    <div className="space-y-8">
      {/* Masthead */}
      <header className="anim-rise text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--neon-cyan)]" />
          <Chip color="var(--neon-cyan)">
            <span className="h-1 w-1 rounded-full bg-[var(--neon-cyan)] anim-pulse" /> sistem çevrimiçi
          </Chip>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--neon-cyan)]" />
        </div>

        <h1 className="text-5xl font-black leading-none tracking-tighter text-white sm:text-6xl">
          NEON<span className="text-[var(--neon-cyan)] text-glow">BREACH</span>
        </h1>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.5em] text-[var(--text-lo)]">
          multiverse
        </p>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[var(--text-mid)]">
          Üç ayrı savaş alanı. Tek bir komuta merkezi. Operatörünü seç, modu belirle ve sistemi ele
          geçir.
        </p>
      </header>

      {/* Operator card */}
      <div className="anim-rise mx-auto flex max-w-lg items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-white/[0.03] px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-black"
            style={{ borderColor: color, color, background: `${color}14` }}
          >
            {name.slice(0, 2)}
          </span>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-lo)]">operatör</p>
            <p className="text-xs font-black tracking-wider" style={{ color }}>
              {name || 'bağlanıyor...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip color={peers.length > 0 ? 'var(--neon-green)' : 'var(--text-lo)'}>
            <IconUsers size={10} /> {peers.length + 1} bağlı
          </Chip>
          <span className="stat hidden text-[9px] text-[var(--text-lo)] sm:block">{playerId}</span>
        </div>
      </div>

      {/* Mode grid */}
      <div className="stagger grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {MODES.map((m) => {
          const Icon = MODE_ICONS[m.id];
          const on = hover === m.id;
          return (
            <button
              key={m.id}
              onMouseEnter={() => {
                setHover(m.id);
                sfx.hover();
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => enter(m.id)}
              className="panel group relative overflow-hidden p-6 text-left transition-all duration-300"
              style={{
                borderColor: on ? m.accent : undefined,
                boxShadow: on ? `0 0 44px ${m.accent}2e` : undefined,
                transform: on ? 'translateY(-6px)' : undefined,
              }}
            >
              {/* Corner wash */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: m.accent }}
              />

              <div className="relative">
                <div className="mb-4">
                  <ModeArtwork id={m.id} />
                </div>

                <div
                  className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border transition-all"
                  style={{ borderColor: `${m.accent}55`, background: `${m.accent}12`, color: m.accent }}
                >
                  <Icon size={22} />
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <Chip color={m.accent}>{m.tag}</Chip>
                </div>

                <h2 className="text-lg font-black uppercase tracking-tight" style={{ color: m.accent }}>
                  {m.name}
                </h2>
                <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-mid)]">{m.blurb}</p>

                <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-3">
                  <div className="flex gap-3 text-[9px] uppercase tracking-[0.16em] text-[var(--text-lo)]">
                    <span>{m.players}</span>
                    <span>·</span>
                    <span>{m.duration}</span>
                  </div>
                  <span
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: m.accent }}
                  >
                    <IconChevron size={16} />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title="KANAL"
          subtitle="Operatörler arası iletişim"
          accent="var(--neon-cyan)"
          right={<Chip color="var(--neon-green)"><IconTerminal size={10} /> açık</Chip>}
          bodyClass="p-4"
        >
          <CommsPanel />
        </Panel>

        <Panel title="NASIL OYNANIR" accent="var(--neon-violet)" bodyClass="p-5">
          <ol className="space-y-3.5">
            {[
              ['Sekmeleri çoğalt', 'Her oyuncu için ayrı bir tarayıcı sekmesi aç. Hepsi otomatik olarak birbirini görür.'],
              ['Modu seç', 'Üç moddan birine gir. Aynı moda giren herkes aynı arenada buluşur.'],
              ['Rolünü al', 'The Breach modunda herkes farklı bir katmanı görür — konuşmadan geçemezsiniz.'],
              ['Müdahale et', 'Kanal üzerinden mesaj at veya rakip ekranına glitch, bulanıklık, ters çevirme fırlat.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span
                  className="stat flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--neon-violet)]/40 text-[10px] font-black text-[var(--neon-violet)]"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white">{t}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-mid)]">{d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-[var(--neon-amber)]/30 bg-[rgba(251,191,36,0.07)] p-3">
            <IconTarget size={14} className="mt-0.5 shrink-0 text-[var(--neon-amber)]" />
            <p className="text-[10px] leading-relaxed text-[var(--text-mid)]">
              <span className="font-bold text-[var(--neon-amber)]">Çok oyunculu test:</span> Bu oyun
              tarayıcı sekmeleri arasında anlık senkron çalışır. Sunucu ya da hesap gerekmez.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
};
