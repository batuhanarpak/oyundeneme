import type { Role } from '@/store/useGameStore';

/* ============================================================
   Modes
   ============================================================ */

export interface ModeDef {
  id: 'breach' | 'clash' | 'tower';
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
    players: '3 OYUNCU',
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
      'Gökten kelimeler yağar. Her doğru kelime bir asker doğurur ve rakip kuleye yürür. Kulesi ayakta kalan son operatör kazanır.',
    accent: 'var(--neon-amber)',
    players: '2-3 OYUNCU',
    duration: '8-12 DK',
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
   Cerebral Clash — question bank
   ============================================================ */

export interface Question {
  q: string;
  a: string[];
  correct: number;
}

export const QUESTIONS: Question[] = [
  { q: 'TCP hangi katmanda çalışır?', a: ['Uygulama', 'Taşıma', 'Ağ', 'Veri Bağı'], correct: 1 },
  { q: 'Bir IPv4 adresi kaç bittir?', a: ['16', '32', '64', '128'], correct: 1 },
  { q: 'HTTP durum kodu 404 ne anlama gelir?', a: ['Sunucu hatası', 'Bulunamadı', 'Yetkisiz', 'Yönlendirme'], correct: 1 },
  { q: 'AES varsayılan olarak hangi şifreleme türüdür?', a: ['Asimetrik', 'Simetrik', 'Hash', 'Kuantum'], correct: 1 },
  { q: 'SHA-256 kaç bitlik özet üretir?', a: ['128', '192', '256', '512'], correct: 2 },
  { q: 'DNS neyi çözer?', a: ['Şifreleri', 'Alan adlarını IP adresine', 'Paketleri', 'Sertifikaları'], correct: 1 },
  { q: 'Hangi port HTTPS için varsayılandır?', a: ['80', '443', '22', '8080'], correct: 1 },
  { q: 'RSA hangi matematiksel probleme dayanır?', a: ['Logaritma', 'Asal çarpanlara ayırma', 'Matris', 'Graf'], correct: 1 },
  { q: 'SQL Injection nasıl önlenir?', a: ['Daha uzun şifre', 'Parametreli sorgu', 'Daha çok CPU', 'Yedekleme'], correct: 1 },
  { q: 'JWT içindeki üçüncü bölüm nedir?', a: ['Header', 'Payload', 'Signature', 'Salt'], correct: 2 },
  { q: 'Hangi algoritma asimetriktir?', a: ['AES', 'ChaCha20', 'ECDSA', 'Blowfish'], correct: 2 },
  { q: 'Bir /24 ağında kaç kullanılabilir host vardır?', a: ['254', '256', '255', '512'], correct: 0 },
  { q: 'MITM saldırısında saldırgan ne yapar?', a: ['Disk doldurur', 'Ortada dinler', 'Sadece DDoS', 'Fiziksel çalar'], correct: 1 },
  { q: 'TLS el sıkışmasında ilk adım nedir?', a: ['ClientHello', 'ServerHello', 'FIN', 'SYN-ACK'], correct: 0 },
  { q: 'RAM nedir?', a: ['Kalıcı depolama', 'Geçici bellek', 'İşlemci', 'Veri yolu'], correct: 1 },
  { q: 'XSS hangi dilde çalışır?', a: ['SQL', 'JavaScript', 'Python', 'C'], correct: 1 },
  { q: 'Kaç bit 1 bayt eder?', a: ['4', '8', '16', '32'], correct: 1 },
  { q: 'Linux’ta dosya izni 755 neyi ifade eder?', a: ['Herkes yazar', 'Sahip tam, diğerleri oku/çalıştır', 'Sadece okuma', 'Sadece root'], correct: 1 },
  { q: 'Honeypot nedir?', a: ['Antivirüs', 'Tuzak sistem', 'VPN', 'Firewall kuralı'], correct: 1 },
  { q: 'Git’te yeni dal oluşturma komutu?', a: ['git new', 'git branch', 'git fork', 'git clone'], correct: 1 },
  { q: 'Hangi hash algoritması kırılmış sayılır?', a: ['SHA-3', 'Bcrypt', 'MD5', 'Argon2'], correct: 2 },
  { q: 'Docker imajı katmanlardan oluşur, en üstte ne var?', a: ['Base', 'Writable layer', 'Kernel', 'Registry'], correct: 1 },
  { q: 'Zero-day nedir?', a: ['Yamalanmış açık', 'Bilinmeyen açık', 'Sıfır gecikme', 'Günlük yedek'], correct: 1 },
  { q: 'Asimetrik şifrelemede açık anahtar ne yapar?', a: ['Çözer', 'Şifreler', 'Hash üretir', 'İmzalar'], correct: 1 },
  { q: 'Bir rainbow table neyi kırar?', a: ['AES', 'Hash', 'TLS', 'SSH'], correct: 1 },
  { q: 'CX3 hangi alanın terimidir?', a: ['Donanım', 'Yok — uydurma', 'Ağ', 'Bulut'], correct: 1 },
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
