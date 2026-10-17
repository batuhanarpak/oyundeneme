'use client';

import React, { useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { getPartyHost, setPartyHost, shareUrl, net } from '@/lib/net';
import { sfx } from '@/lib/sfx';
import { Btn, Chip } from '@/components/ui/Panel';
import { IconUsers, IconBolt, IconTarget } from '@/components/ui/Icons';

/**
 * Connection panel.
 *
 * Shows whether play is local-only (same-browser tabs) or relayed through
 * PartyKit so friends on other machines can join. When no relay is set, it
 * takes a one-line host and stores it — no env files or rebuilds.
 */
export const NetStatus: React.FC = () => {
  const peers = useGame((s) => s.peers);
  const playerId = useGame((s) => s.playerId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const host = getPartyHost();
  const online = host.length > 0;

  const copyLink = async () => {
    const url = shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      sfx.confirm();
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard needs a secure context; fall back to a prompt */
      window.prompt('Bağlantıyı kopyala:', url);
    }
  };

  return (
    <>
      {/* Status pill in the command bar */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          sfx.click();
        }}
        title={online ? 'çevrimiçi — arkadaşınla oynayabilirsin' : 'yerel mod — sadece bu tarayıcı'}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors"
        style={{
          borderColor: online ? 'var(--neon-green)' : 'var(--line-strong)',
          color: online ? 'var(--neon-green)' : 'var(--text-lo)',
          background: online ? 'rgba(74,222,128,0.1)' : 'transparent',
        }}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${online ? 'anim-pulse' : ''}`}
          style={{ background: online ? 'var(--neon-green)' : 'var(--text-lo)' }}
        />
        <IconUsers size={11} />
        <span className="stat">{peers.length + (playerId ? 1 : 0)}</span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[9990] flex items-start justify-center bg-black/70 p-4 pt-20 backdrop-blur-sm">
          <div className="panel anim-rise w-full max-w-lg">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--neon-cyan)]">
                  bağlantı
                </h2>
                <p className="text-[10px] text-[var(--text-lo)]">
                  {online ? 'sunucu üzerinden — internet arkadaşları katılabilir' : 'yerel — sadece bu tarayıcı'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[10px] uppercase tracking-widest text-[var(--text-lo)] hover:text-white"
              >
                kapat
              </button>
            </div>

            <div className="space-y-5 p-5">
              {online ? (
                <>
                  <div className="inset-well flex items-center gap-3 p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--neon-green)] anim-pulse" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-[var(--text-lo)]">sunucu</p>
                      <p className="truncate font-mono text-[11px] text-[var(--neon-green)]">{host}</p>
                    </div>
                  </div>

                  <div>
                    <p className="label mb-2">arkadaşını davet et</p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={shareUrl()}
                        onFocus={(e) => e.currentTarget.select()}
                        className="inset-well min-w-0 flex-1 px-3 py-2 font-mono text-[10px] text-[var(--text-mid)] outline-none"
                      />
                      <Btn tone={copied ? 'green' : 'cyan'} onClick={copyLink}>
                        {copied ? '✓ kopyalandı' : 'kopyala'}
                      </Btn>
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-lo)]">
                      Bu bağlantıyı gönderdiğin kişi hiçbir şey ayarlamadan doğrudan aynı odada
                      başlar. Oyunu açtığında birbirini otomatik görürsünüz.
                    </p>
                  </div>

                  {/* Live roster */}
                  <div>
                    <p className="label mb-2">çevrimiçi — {peers.length + 1}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: useGame.getState().color }} />
                        <span className="text-[11px] font-bold text-white">
                          {useGame.getState().name} (SEN)
                        </span>
                      </div>
                      {peers.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                          <span className="text-[11px] font-bold" style={{ color: p.color }}>
                            {p.name}
                          </span>
                        </div>
                      ))}
                      {peers.length === 0 && (
                        <p className="text-[10px] text-[var(--text-lo)]">
                          Henüz kimse yok. Bağlantıyı paylaş.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPartyHost('');
                      sfx.click();
                      window.location.reload();
                    }}
                    className="text-[10px] uppercase tracking-widest text-[var(--text-lo)] hover:text-white"
                  >
                    sunucuyu unut (yerel moda dön)
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-lg border border-[var(--neon-amber)]/35 bg-[rgba(251,191,36,0.08)] p-3">
                    <IconTarget size={16} className="mt-0.5 shrink-0 text-[var(--neon-amber)]" />
                    <div>
                      <p className="text-[11px] font-bold text-[var(--neon-amber)]">
                        Şu an sadece bu tarayıcıda oynayabilirsin
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-mid)]">
                        Aynı makinede birden fazla sekme açarsan hepsi birbirini görür. Arkadaşınla
                        internet üzerinden oynamak için bir sunucu adresi gir.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="label mb-2">sunucu adresi</p>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="neon-breach.kullaniciadi.partykit.dev"
                      className="inset-well w-full px-3 py-2.5 font-mono text-xs text-[var(--text-hi)] outline-none placeholder:text-[var(--text-lo)] focus:border-[var(--neon-cyan)]/50"
                    />
                    <Btn
                      tone="cyan"
                      className="mt-2 w-full"
                      disabled={!draft.trim()}
                      onClick={() => {
                        setPartyHost(draft);
                        sfx.confirm();
                        window.location.reload();
                      }}
                    >
                      <IconBolt size={13} /> bağlan
                    </Btn>
                  </div>

                  <div className="border-t border-[var(--line)] pt-4">
                    <p className="label mb-2">sunucu nasıl kurulur</p>
                    <ol className="space-y-2">
                      {[
                        ['Terminali aç', 'Proje klasöründe şunu çalıştır: npx partykit deploy'],
                        ['Çıkan adresi kopyala', 'Şuna benzer: neon-breach.senin-adin.partykit.dev'],
                        ['Yukarıya yapıştır', 'Bağlan dediğin an çevrimiçi olursun'],
                      ].map(([t, d], i) => (
                        <li key={t} className="flex gap-2.5">
                          <span className="stat flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--neon-cyan)]/40 text-[9px] font-black text-[var(--neon-cyan)]">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white">{t}</p>
                            <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-[var(--text-mid)]">{d}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 border-t border-[var(--line)] pt-3">
                <Chip color={online ? 'var(--neon-green)' : 'var(--text-lo)'}>
                  {online ? 'ÇEVRİMİÇİ' : 'YEREL'}
                </Chip>
                <span className="text-[9px] uppercase tracking-widest text-[var(--text-lo)]">
                  {online ? 'partykit relay' : 'tarayıcı sekmeleri'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
