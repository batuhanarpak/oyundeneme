'use client';

import React, { useEffect, useState } from 'react';
import { useGame, sanitizeName, NAME_MAX } from '@/store/useGameStore';
import { PLAYER_COLORS } from '@/lib/net';
import { Btn, Chip } from '@/components/ui/Panel';
import { sfx } from '@/lib/sfx';
import { IconUsers, IconSignature, IconTarget } from '@/components/ui/Icons';

/**
 * Entry screen. The player picks their own callsign and colour before
 * touching the hub — identity is the first thing the game asks of you.
 */
export const JoinGate: React.FC = () => {
  const join = useGame((s) => s.join);
  const playerId = useGame((s) => s.playerId);
  const peers = useGame((s) => s.peers);

  const [name, setNameLocal] = useState('');
  const [color, setColor] = useState(PLAYER_COLORS[0]);

  /* Colour is random per tab until the player overrides it. */
  useEffect(() => {
    setColor(PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]);
  }, []);

  const clean = sanitizeName(name);
  const valid = clean.length >= 2;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      sfx.deny();
      return;
    }
    sfx.confirm();
    join(clean, color);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="panel anim-rise overflow-hidden">
          {/* Header */}
          <div className="border-b border-[var(--line)] px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--neon-cyan)] anim-pulse" />
              <span className="label">kimlik kaydı</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
              OPERATÖR KAYDI
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-mid)]">
              Sistemde görünecek çağrı adını seç. Bu isim diğer operatörlerin ekranında ve
              kanalda görünür.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6 p-6">
            {/* Name */}
            <div>
              <label className="label mb-2 block">çağrı adı</label>
              <div className="flex items-center gap-3">
                <IconSignature size={18} className="shrink-0 text-[var(--text-lo)]" />
                <input
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.length <= NAME_MAX) {
                      setNameLocal(v);
                      if (v.length > name.length) sfx.key();
                    }
                  }}
                  autoFocus
                  maxLength={NAME_MAX}
                  placeholder="ör. VIPER"
                  className="inset-well min-w-0 flex-1 px-4 py-3 text-base font-bold uppercase tracking-[0.14em] text-[var(--text-hi)] outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--text-lo)] focus:border-[var(--neon-cyan)]/50"
                  style={{ color }}
                />
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-lo)]">
                  en az 2 karakter
                </span>
                <span className="stat text-[9px] text-[var(--text-lo)]">
                  {name.length}/{NAME_MAX}
                </span>
              </div>
            </div>

            {/* Colour */}
            <div>
              <label className="label mb-2 block">sinyal rengi</label>
              <div className="flex gap-2.5">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      sfx.click();
                    }}
                    className="h-9 flex-1 rounded-lg border transition-all"
                    style={{
                      borderColor: color === c ? c : 'var(--line-strong)',
                      background: color === c ? `${c}2e` : 'rgba(255,255,255,0.02)',
                      boxShadow: color === c ? `0 0 20px ${c}55` : 'none',
                    }}
                    aria-label={`renk ${c}`}
                  >
                    <span
                      className="mx-auto block h-2.5 w-2.5 rounded-full"
                      style={{ background: c, boxShadow: color === c ? `0 0 10px ${c}` : 'none' }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="inset-well flex items-center gap-3 p-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-black"
                style={{ borderColor: color, color, background: `${color}14` }}
              >
                {(clean || '??').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="label">önizleme</p>
                <p className="truncate text-sm font-black uppercase tracking-[0.14em]" style={{ color }}>
                  {clean || 'İSİM BEKLENİYOR'}
                </p>
              </div>
              <span className="stat ml-auto shrink-0 text-[9px] text-[var(--text-lo)]">
                {playerId || '...'}
              </span>
            </div>

            <Btn tone="cyan" size="lg" type="submit" disabled={!valid} className="w-full">
              SİSTEME BAĞLAN
            </Btn>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] bg-white/[0.02] px-6 py-3">
            <Chip color={peers.length > 0 ? 'var(--neon-green)' : 'var(--text-lo)'}>
              <IconUsers size={10} /> {peers.length + 1} operatör çevrimiçi
            </Chip>
            <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-[var(--text-lo)]">
              <IconTarget size={10} /> sekme başına bir oyuncu
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-[var(--text-lo)]">
          Çok oyunculu oynamak için bu adresi başka sekmelerde de aç.
          <br />
          Her sekme ayrı bir operatör olur ve ismini kendi seçer.
        </p>
      </div>
    </div>
  );
};
