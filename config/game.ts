import type { Role } from '@/store/useGameStore';

/* ============================================================
   Modes
   ============================================================ */

export interface ModeDef {
  id: 'breach' | 'clash' | 'tower' | 'space';
  name: string;
  tag: string;
  blurb: string;
  accent: string;
  players: string;
  duration: string;
}

export const MODES: ModeDef[] = [
  {
    id: 'breach',
    name: 'THE BREACH',
    tag: 'KOOPERATİF',
    blurb:
      'Üç operatör, tek bir sunucuyu içeriden çökertir. Kimse tek başına göremez — sistemin tamamı ancak üç bakış açısı birleşince anlaşılır.',
    accent: 'var(--neon-cyan)',
    players: '2-3 OYUNCU',
    duration: '15-25 DK',
  },
  {
    id: 'clash',
    name: 'CEREBRAL CLASH',
    tag: 'REKABET',
    blurb:
      'Hız ve bilginin çarpışması. Doğru cevap rakibin kalkanını eritir; hızlı cevap iki kat yıkar. Ekranına müdahale etmek serbest.',
    accent: 'var(--neon-rose)',
    players: '2-3 OYUNCU',
    duration: '10-15 DK',
  },
  {
    id: 'tower',
    name: 'TOWER TYPING',
    tag: 'KLAVYE SAVAŞI',
    blurb:
      'Gökten kelimeler yağar. Doğru yazdığın kelime garnizonuna birlik ekler; sürükleyip karakol kurar, düşman kulesine yürürsün.',
    accent: 'var(--neon-amber)',
    players: '2-3 OYUNCU',
    duration: '8-12 DK',
  },
  {
    id: 'space',
    name: 'VOID LANCE',
    tag: 'UZAY SAVAŞI',
    blurb:
      'Beş gemi sınıfı, otuz yetenek, üç fazlı bir kovan kraliçesi. Pilotlar birleşip tek bir dev gemi olabilir — ya da ayrı ayrı avlanır.',
    accent: 'var(--neon-violet)',
    players: '1-5 PİLOT',
    duration: '10-20 DK',
  },
];

/* ============================================================
   Roles — The Breach
   ============================================================ */

export interface RoleDef {
  id: Role;
  name: string;
  codename: string;
  color: string;
  desc: string;
  canSee: string[];
  cannotSee: string[];
}

export const ROLES: RoleDef[] = [
  {
    id: 'ghost',
    name: 'THE GHOST',
    codename: 'SIZMA OPERATÖRÜ',
    color: 'var(--neon-amber)',
    desc: 'Fiziksel katman. Koridorlarda hareket eder, kapıları zorlar, kameraları kör eder.',
    canSee: ['Oda yerleşimi', 'Kamera açıları', 'Fiziksel engeller'],
    cannotSee: ['Şifreli veri', 'Enerji hatları'],
  },
  {
    id: 'oracle',
    name: 'THE ORACLE',
    codename: 'VERİ ANALİSTİ',
    color: 'var(--neon-violet)',
    desc: 'Bilişsel katman. Şifreleri kırar, veri akışını okur, ekibi yönlendirir.',
    canSee: ['Şifreli metinler', 'Sinyal dalgaları', 'Anahtar dizileri'],
    cannotSee: ['Oda yerleşimi', 'Enerji hatları'],
  },
  {
    id: 'architect',
    name: 'THE ARCHITECT',
    codename: 'SİSTEM MİMARI',
    color: 'var(--neon-green)',
    desc: 'Altyapı katmanı. Gücü yönetir, güvenlik duvarlarını açar, sistemi ayakta tutar.',
    canSee: ['Enerji hatları', 'Güvenlik duvarları', 'Devre şeması'],
    cannotSee: ['Şifreli veri', 'Oda yerleşimi'],
  },
];

/* ============================================================
   Tower Typing — word bank, bucketed by length
   ============================================================ */

export interface WordTier {
  tier: 1 | 2 | 3;
  power: number;
  color: string;
  words: string[];
}

export const WORD_TIERS: WordTier[] = [
  {
    tier: 1,
    power: 1,
    color: 'var(--neon-cyan)',
    words: [
      'kod', 'ağ', 'veri', 'root', 'ping', 'port', 'hash', 'byte', 'link', 'node',
      'dosya', 'paket', 'sunucu', 'düğüm', 'bayt', 'kablo', 'şifre', 'sanal', 'yerel',
    ],
  },
  {
    tier: 2,
    power: 2,
    color: 'var(--neon-violet)',
    words: [
      'protokol', 'şifreleme', 'güvenlik', 'algoritma', 'anahtar', 'sızıntı', 'tarayıcı',
      'değişken', 'fonksiyon', 'yazılım', 'donanım', 'bağlantı', 'kullanıcı', 'sunucular',
      'sinyal', 'modül', 'işlemci', 'bellek', 'depolama', 'güvenlik duvarı',
    ],
  },
  {
    tier: 3,
    power: 3,
    color: 'var(--neon-rose)',
    words: [
      'yetkilendirme', 'kimlik doğrulama', 'şifreleme anahtarı', 'güvenlik açığı',
      'paket yönlendirme', 'kriptografi', 'sızma testi', 'ağ güvenliği',
      'veri tabanı yönetimi', 'yapay zeka modeli', 'bulut bilişim', 'kaynak kodu',
    ],
  },
];

/* ============================================================
   Breach — the multi-layer puzzle chain
   ============================================================ */

export interface BreachStage {
  stage: number;
  /** What the Oracle must decode and shout across. */
  oracle: { cipher: string; answer: string; prompt: string };
  /** What the Architect must route power to. */
  architect: { grid: number[]; solution: number[]; prompt: string };
  /** What the Ghost must physically do with the decoded intel. */
  ghost: { prompt: string; options: string[]; correct: number };
}

export const BREACH_STAGES: BreachStage[] = [
  {
    stage: 1,
    oracle: {
      cipher: '01001000 01000001 01010100',
      answer: 'HAT',
      prompt: 'Üç baytı çöz. Kelime, giriş kapısının kod adıdır.',
    },
    architect: {
      grid: [1, 0, 1, 1, 0],
      solution: [1, 2, 4],
      prompt: 'Toplam yük 3 birimi aşmasın. Hangi üç hattı açık tutarsın?',
    },
    ghost: {
      prompt: 'Kod adı HAT. Hangi kapıdan geçersin?',
      options: ['Servis Koridoru', 'Havalandırma Bacası', 'Ana Giriş', 'Yük Asansörü'],
      correct: 1,
    },
  },
  {
    stage: 2,
    oracle: {
      cipher: 'ROT13: PNEERF',
      answer: 'ACCESS',
      prompt: 'Sezar kaydırması 13. Çözülen kelime erişim anahtarıdır.',
    },
    architect: {
      grid: [2, 2, 0, 3, 1],
      solution: [0, 3, 4],
      prompt: 'Sunucu odasına giden hatları besle. Toplam 5 birim sınırı var.',
    },
    ghost: {
      prompt: 'Anahtar ACCESS. Kamera kaydını hangi saniyeye sararsın?',
      options: ['00:12:04', '00:44:31', '01:02:19', '02:30:55'],
      correct: 1,
    },
  },
  {
    stage: 3,
    oracle: {
      cipher: 'BASE64: Q0VSRUJFUlVT',
      answer: 'CERBERUS',
      prompt: 'Base64 katmanını çöz. Çıkan ad, çekirdek koruma sürecidir.',
    },
    architect: {
      grid: [3, 1, 2, 2, 0],
      solution: [1, 2, 3],
      prompt: 'Üç başlı korumayı uyut. Dengeyi bozma.',
    },
    ghost: {
      prompt: 'Süreç adı CERBERUS. Hangi düğümü fiziksel olarak çekersin?',
      options: ['Düğüm 07', 'Düğüm 13', 'Düğüm 21', 'Düğüm 34'],
      correct: 2,
    },
  },
];

export const BREACH_LOBBY_LINES = [
  'Bağlantı kuruldu. Üç operatör senkronize.',
  'Uyarı: sistem aktif savunmaya geçti.',
  'Veri akışı kararsız. Dikkatli olun.',
  'Çekirdek erişimi bekleniyor...',
];
