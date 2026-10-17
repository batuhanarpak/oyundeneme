'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { sfx } from '@/lib/sfx';
import { IconSend, IconBolt, IconTarget } from './Icons';
import type { AttackKind } from '@/lib/net';

const ATTACKS: { kind: AttackKind; label: string; hint: string }[] = [
  { kind: 'glitch', label: 'Glitch', hint: 'Ekranı titret' },
  { kind: 'blur', label: 'Bulanık', hint: 'Görüşü boz' },
  { kind: 'flip', label: 'Ters Çevir', hint: 'Eksenleri devir' },
  { kind: 'freeze', label: 'Dondur', hint: 'Renkleri öldür' },
];

/**
 * Team comms. Carries both the text channel and the "throw something at
 * a teammate" attacks, because in practice they're the same conversation.
 */
export const CommsPanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const chat = useGame((s) => s.chat);
  const peers = useGame((s) => s.peers);
  const name = useGame((s) => s.name);
  const color = useGame((s) => s.color);
  const playerId = useGame((s) => s.playerId);
  const sendChat = useGame((s) => s.sendChat);
  const sendAttack = useGame((s) => s.sendAttack);

  const [text, setText] = useState('');
  const [arm, setArm] = useState<AttackKind | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text);
    sfx.chat();
    setText('');
  };

  const fire = (to: string) => {
    if (!arm) return;
    sendAttack(arm, to || 'all');
    sfx.attack();
    setArm(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className={`flex-1 space-y-2 overflow-y-auto pr-1 ${compact ? 'min-h-[120px]' : 'min-h-[180px]'}`}>
        {chat.length === 0 && (
          <p className="py-6 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
            kanal sessiz
          </p>
        )}
        {chat.map((line) => (
          <div key={line.id} className="anim-slide">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-black tracking-wider" style={{ color: line.color }}>
                {line.name}
              </span>
              <span className="stat text-[9px] text-[var(--text-lo)]">
                {new Date(line.at).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="break-words text-xs leading-relaxed text-[var(--text-mid)]">{line.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Targeting row — appears only while an attack is armed. */}
      {arm && (
        <div className="anim-rise mt-2 rounded-lg border border-[var(--neon-rose)]/40 bg-[rgba(244,63,94,0.08)] p-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--neon-rose)]">
            <IconTarget size={11} /> Hedef seç
          </p>
          <div className="flex flex-wrap gap-1.5">
            {peers.length === 0 && (
              <span className="text-[9px] text-[var(--text-lo)]">hedef yok — başka bir sekme aç</span>
            )}
            {peers.map((p) => (
              <button
                key={p.id}
                onClick={() => fire(p.id)}
                className="rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors hover:bg-white/10"
                style={{ borderColor: `${p.color}66`, color: p.color }}
              >
                {p.name}
              </button>
            ))}
            <button
              onClick={() => fire('all')}
              className="rounded border border-white/25 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/10"
            >
              HERKES
            </button>
          </div>
        </div>
      )}

      {/* Attacks */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ATTACKS.map((a) => (
          <button
            key={a.kind}
            title={a.hint}
            onClick={() => {
              setArm(arm === a.kind ? null : a.kind);
              sfx.click();
            }}
            className="flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-all"
            style={{
              borderColor: arm === a.kind ? 'var(--neon-rose)' : 'rgba(244,63,94,0.3)',
              color: 'var(--neon-rose)',
              background: arm === a.kind ? 'rgba(244,63,94,0.18)' : 'transparent',
            }}
          >
            <IconBolt size={10} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="mt-2 flex gap-1.5">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.length > text.length) sfx.key();
          }}
          placeholder="Mesaj gönder..."
          maxLength={200}
          className="inset-well min-w-0 flex-1 px-3 py-2 text-xs text-[var(--text-hi)] outline-none placeholder:text-[var(--text-lo)] focus:border-[var(--neon-cyan)]/50"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg border border-[var(--neon-cyan)]/45 px-3 text-[var(--neon-cyan)] transition-colors hover:bg-[var(--neon-cyan)]/12 disabled:opacity-30"
        >
          <IconSend size={14} />
        </button>
      </form>

      <p className="mt-1.5 text-right text-[9px] text-[var(--text-lo)]">
        sen: <span style={{ color }}>{name || '...'}</span>
      </p>
    </div>
  );
};
