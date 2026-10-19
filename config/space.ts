/**
 * Drone Network Defence — drone classes, skills and the intrusion table.
 *
 * Five drone platforms. Each has its OWN five-skill loadout: no two drones
 * share the same set, so picking a platform is picking a playstyle rather than
 * a stat line.
 *
 * Skills that fire projectiles (`projectile`) swap your cannon for a special
 * round for their duration — fireball, ice ball, energy orb or cluster shell —
 * each with its own drawing and behaviour.
 */

export type ProjectileKind = 'fireball' | 'iceball' | 'energyball' | 'cluster';

export type SkillId =
  | 'stun'
  | 'sleep'
  | 'slow'
  | 'fireball'
  | 'iceball'
  | 'energyball'
  | 'cluster'
  | 'heal'
  | 'shield'
  | 'blink'
  | 'overdrive'
  | 'fortify'
  | 'cloak';

export interface SkillDef {
  id: SkillId;
  name: string;
  /** Energy cost, 0-100 scale. */
  cost: number;
  /** Seconds. 0 = instant. */
  duration: number;
  desc: string;
  color: string;
  /** Present when this skill replaces your cannon fire. */
  projectile?: ProjectileKind;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  /* ---- control ---- */
  stun: { id: 'stun', name: 'ŞOK DALGASI', cost: 30, duration: 3, desc: 'Tüm düşmanları yerinde dondurur.', color: '#fbbf24' },
  sleep: { id: 'sleep', name: 'UYUŞTURMA', cost: 45, duration: 6, desc: 'Düşmanların hareketi ve ateşi durur.', color: '#a78bfa' },
  slow: { id: 'slow', name: 'ZAMAN BÜKÜMÜ', cost: 25, duration: 8, desc: 'Düşman hızını yarıya indirir.', color: '#38bdf8' },

  /* ---- projectiles ---- */
  fireball: { id: 'fireball', name: 'ALEV TOPU', cost: 35, duration: 10, desc: 'Yavaş ama yıkıcı alev küreleri. Yanan iz bırakır.', color: '#f97316', projectile: 'fireball' },
  iceball: { id: 'iceball', name: 'BUZ KÜRESİ', cost: 32, duration: 10, desc: 'İsabet eden düşmanı dondurur. Kristal parçaları saçar.', color: '#67e8f9', projectile: 'iceball' },
  energyball: { id: 'energyball', name: 'ENERJİ KÜRESİ', cost: 28, duration: 10, desc: 'Düşmanların içinden geçer, birden fazlasını vurur.', color: '#c084fc', projectile: 'energyball' },
  cluster: { id: 'cluster', name: 'PARÇALI BOMBA', cost: 40, duration: 8, desc: 'Çarpışta üç parçaya ayrılır.', color: '#fb7185', projectile: 'cluster' },

  /* ---- defence ---- */
  heal: { id: 'heal', name: 'ONARIM', cost: 50, duration: 0, desc: 'Gövde bütünlüğünü anında 45 puan onarır.', color: '#4ade80' },
  shield: { id: 'shield', name: 'KALKAN', cost: 40, duration: 5, desc: 'Hasarın tamamını emen enerji kalkanı.', color: '#22d3ee' },
  fortify: { id: 'fortify', name: 'ZIRH PEKİŞTİRME', cost: 35, duration: 8, desc: 'Alınan hasarı yarıya indirir.', color: '#94a3b8' },

  /* ---- mobility ---- */
  blink: { id: 'blink', name: 'IŞINLANMA', cost: 22, duration: 0, desc: 'İmlecin olduğu yere anında atlar.', color: '#facc15' },
  overdrive: { id: 'overdrive', name: 'AŞIRI YÜKLEME', cost: 30, duration: 7, desc: 'Ateş hızını iki katına çıkarır.', color: '#fb923c' },
  cloak: { id: 'cloak', name: 'GÖRÜNMEZLİK', cost: 38, duration: 5, desc: 'Düşmanlar seni hedef alamaz.', color: '#e879f9' },
};

/* ============================================================
   Drones — every loadout is distinct
   ============================================================ */

export interface DroneDef {
  id: string;
  name: string;
  callsign: string;
  color: string;
  speed: number;
  chassis: number;
  fireRate: number;
  damage: number;
  bulletSpeed: number;
  scale: number;
  desc: string;
  /** Exactly five, in Q E R F C order. */
  skills: SkillId[];
}

export const DRONES: DroneDef[] = [
  {
    id: 'interceptor',
    name: 'SİT-1 INTERCEPTOR',
    callsign: 'ÖNLEME',
    color: '#22d3ee',
    speed: 5.2,
    chassis: 80,
    fireRate: 130,
    damage: 7,
    bulletSpeed: 11,
    scale: 0.85,
    desc: 'Hızlı ve çevik. Sızma karşıtı drone: ışınlan, kalkanlan, enerji küresiyle kaç.',
    skills: ['blink', 'shield', 'energyball', 'overdrive', 'stun'],
  },
  {
    id: 'juggernaut',
    name: 'SIT-X JUGGERNAUT',
    callsign: 'KUŞATMA',
    color: '#f43f5e',
    speed: 2.8,
    chassis: 190,
    fireRate: 320,
    damage: 22,
    bulletSpeed: 8,
    scale: 1.25,
    desc: 'Ağır zırhlı savunma platformu. Alev topları ve parçalı bombalarla alanı temizler.',
    skills: ['fireball', 'fortify', 'cluster', 'stun', 'heal'],
  },
  {
    id: 'phantom',
    name: 'SIT-P PHANTOM',
    callsign: 'HAYALET',
    color: '#a78bfa',
    speed: 6.0,
    chassis: 95,
    fireRate: 170,
    damage: 11,
    bulletSpeed: 13,
    scale: 0.8,
    desc: 'Görünmez sızıntı avcısı. Buz küreleriyle hedefi kilitler, kimse onu göremez.',
    skills: ['cloak', 'iceball', 'blink', 'sleep', 'overdrive'],
  },
  {
    id: 'artillery',
    name: 'SIT-A ARTILLERY',
    callsign: 'TOPKU',
    color: '#fbbf24',
    speed: 2.4,
    chassis: 140,
    fireRate: 420,
    damage: 34,
    bulletSpeed: 6.5,
    scale: 1.35,
    desc: 'Uzun menzilli veri imha sistemi. Yavaş ama tek isabette kalabalığı eritir.',
    skills: ['fireball', 'cluster', 'slow', 'energyball', 'fortify'],
  },
  {
    id: 'support',
    name: 'SIT-S SUPPORT',
    callsign: 'DESTEK',
    color: '#4ade80',
    speed: 4.0,
    chassis: 120,
    fireRate: 220,
    damage: 9,
    bulletSpeed: 9.5,
    scale: 1.0,
    desc: 'Sistem onarım drone\'u. Onarır, kalkanlar, düşmanı yavaşlatır — kimseyi kaybetmez.',
    skills: ['heal', 'shield', 'energyball', 'slow', 'iceball'],
  },
];

/* ============================================================
   Projectile behaviour
   ============================================================ */

export interface ProjectileDef {
  /** Damage multiplier over the drone's base. */
  damageMul: number;
  /** Speed multiplier. */
  speedMul: number;
  /** Radius used for hit tests. */
  radius: number;
  /** Passes through enemies without dying. */
  pierce: boolean;
  /** Freezes the target briefly. */
  freezes: boolean;
  /** Splits into fragments on impact. */
  splits: boolean;
}

export const PROJECTILES: Record<ProjectileKind, ProjectileDef> = {
  fireball: { damageMul: 3.2, speedMul: 0.62, radius: 14, pierce: false, freezes: false, splits: false },
  iceball: { damageMul: 1.4, speedMul: 0.85, radius: 11, pierce: false, freezes: true, splits: false },
  energyball: { damageMul: 1.8, speedMul: 1.0, radius: 12, pierce: true, freezes: false, splits: false },
  cluster: { damageMul: 2.0, speedMul: 0.7, radius: 13, pierce: false, freezes: false, splits: true },
};

/* ============================================================
   Boss
   ============================================================ */

export interface BossPhase {
  below: number;
  name: string;
  spawnEvery: number;
  attackEvery: number;
  color: string;
}

export const BOSS_PHASES: BossPhase[] = [
  { below: 1.0, name: 'SÜRÜ ÇEKİRDEĞİ', spawnEvery: 2600, attackEvery: 2200, color: '#f43f5e' },
  { below: 0.66, name: 'KIZGIN SÜRÜ', spawnEvery: 1900, attackEvery: 1600, color: '#f97316' },
  { below: 0.33, name: 'ÇÖKÜŞ SÜRÜSÜ', spawnEvery: 1300, attackEvery: 1000, color: '#dc2626' },
];

export const BOSS_MAX_HP = 3000;
export const BOSS_SHOT_DAMAGE = 8;

/* ============================================================
   Formation names
   ============================================================ */

export const FORMATION_NAMES = ['', 'SOLO FILO', 'İKİLİ DÜZEN', 'ÜÇLÜ ÇEMBER', 'DÖRTLÜ AĞ', 'TAM FİLO'];

export function formationName(count: number) {
  return FORMATION_NAMES[Math.min(count, FORMATION_NAMES.length - 1)] ?? `FİLO x${count}`;
}

/** Blends the first syllables of each callsign into one name. */
export function mergeNames(names: string[]) {
  return names.map((n) => n.slice(0, Math.max(2, Math.ceil(n.length / 2)))).join('');
}
