/**
 * Cerebral Clash question bank.
 *
 * Questions are ordinary general knowledge — the kind a normal teenager would
 * know from school, the news or the games they play. Difficulty comes from the
 * clock and the streak multiplier, not from obscure trivia.
 */

export type QuestionCategory = 'lol' | 'tarih' | 'cografya' | 'sanat' | 'bilim';

export interface Question {
  q: string;
  a: string[];
  correct: number;
  theme: QuestionCategory;
}

export interface CategoryDef {
  id: QuestionCategory;
  name: string;
  blurb: string;
  accent: string;
  backdrop: string;
}

/* ============================================================
   Backdrops
   Built from layered gradients rather than external image files: they render
   instantly, never 404, and can't be blocked by an ad-filter. Each is tinted
   to its theme so the arena visibly changes with the question set.
   ============================================================ */

const RIFT = `
  radial-gradient(ellipse 60% 45% at 18% 22%, rgba(56,189,248,0.30), transparent 62%),
  radial-gradient(ellipse 55% 45% at 84% 74%, rgba(168,85,247,0.30), transparent 62%),
  radial-gradient(ellipse 70% 40% at 50% 108%, rgba(34,211,238,0.22), transparent 70%),
  linear-gradient(160deg, #061423 0%, #0a1e33 44%, #130b2a 100%)
`;

const ARENA = `
  radial-gradient(ellipse 65% 50% at 78% 18%, rgba(244,63,94,0.32), transparent 64%),
  radial-gradient(ellipse 50% 45% at 14% 80%, rgba(251,191,36,0.24), transparent 64%),
  linear-gradient(200deg, #1a0714 0%, #240d1a 50%, #0a0510 100%)
`;

const ATLAS = `
  radial-gradient(ellipse 62% 48% at 20% 74%, rgba(56,189,248,0.30), transparent 64%),
  radial-gradient(ellipse 56% 44% at 82% 22%, rgba(45,212,191,0.26), transparent 64%),
  linear-gradient(140deg, #04141f 0%, #062430 52%, #041019 100%)
`;

const GALLERY = `
  radial-gradient(ellipse 58% 46% at 76% 26%, rgba(236,72,153,0.28), transparent 64%),
  radial-gradient(ellipse 56% 48% at 20% 78%, rgba(251,146,60,0.24), transparent 64%),
  linear-gradient(185deg, #180716 0%, #22101c 52%, #0b0510 100%)
`;

const LAB = `
  radial-gradient(ellipse 58% 48% at 24% 22%, rgba(74,222,128,0.28), transparent 64%),
  radial-gradient(ellipse 54% 48% at 82% 76%, rgba(34,211,238,0.26), transparent 64%),
  linear-gradient(155deg, #04140f 0%, #06201c 50%, #04101c 100%)
`;

export const CATEGORIES: CategoryDef[] = [
  { id: 'lol', name: 'SUMMONER’S RIFT', blurb: 'League of Legends', accent: '#38bdf8', backdrop: RIFT },
  { id: 'tarih', name: 'ARENA', blurb: 'Tarih', accent: '#f43f5e', backdrop: ARENA },
  { id: 'cografya', name: 'ATLAS', blurb: 'Coğrafya', accent: '#2dd4bf', backdrop: ATLAS },
  { id: 'sanat', name: 'GALERİ', blurb: 'Sanat & müzik', accent: '#ec4899', backdrop: GALLERY },
  { id: 'bilim', name: 'LABORATUVAR', blurb: 'Bilim', accent: '#4ade80', backdrop: LAB },
];

export const BACKDROPS: Record<QuestionCategory, string> = {
  lol: RIFT,
  tarih: ARENA,
  cografya: ATLAS,
  sanat: GALLERY,
  bilim: LAB,
};

/* ============================================================
   Question bank
   ============================================================ */

export const QUESTIONS: Question[] = [
  /* ============ League of Legends — 30 ============ */
  { theme: 'lol', q: 'League of Legends’ı hangi şirket geliştirdi?', a: ['Blizzard', 'Riot Games', 'Valve', 'Epic Games'], correct: 1 },
  { theme: 'lol', q: 'LoL’ün ana haritasının adı nedir?', a: ['Summoner’s Rift', 'Twisted Treeline', 'Howling Abyss', 'Aram'], correct: 0 },
  { theme: 'lol', q: 'Ana haritada kaç şerit (lane) vardır?', a: ['2', '3', '4', '5'], correct: 1 },
  { theme: 'lol', q: 'Bir LoL maçı kaç oyuncuyla oynanır?', a: ['3v3', '4v4', '5v5', '6v6'], correct: 2 },
  { theme: 'lol', q: 'Kazanmak için neyi yok etmen gerekir?', a: ['Tüm kuleleri', 'Nexus', 'Baron', 'Ejderhayı'], correct: 1 },
  { theme: 'lol', q: '“ADC” neyin kısaltmasıdır?', a: ['Attack Damage Carry', 'Auto Damage Control', 'Ability Damage Champ', 'Advanced Defense Carry'], correct: 0 },
  { theme: 'lol', q: '“Flash” büyüsü ne işe yarar?', a: ['Can yeniler', 'Kısa mesafe ışınlar', 'Görünmez yapar', 'Hız verir'], correct: 1 },
  { theme: 'lol', q: 'Baron Nashor haritanın neresinde bekler?', a: ['Üst nehir', 'Alt nehir', 'Orta koridor', 'Orman başlangıcı'], correct: 0 },
  { theme: 'lol', q: 'Ejderhalar hangi amaçla öldürülür?', a: ['Sadece altın', 'Kalıcı takım bonusu', 'Sadece deneyim', 'Haritayı açar'], correct: 1 },
  { theme: 'lol', q: '“Penta Kill” ne demektir?', a: ['5 kule yıkmak', '5 rakip öldürmek', '5 maç kazanmak', '5 seviye atlamak'], correct: 1 },
  { theme: 'lol', q: 'Kulelere verilen diğer ad nedir?', a: ['Turret', 'Tower Rush', 'Pylon', 'Obelisk'], correct: 0 },
  { theme: 'lol', q: 'Takımdaki rollerden biri değildir?', a: ['Top', 'Jungle', 'Mid', 'Healer'], correct: 3 },
  { theme: 'lol', q: 'Bir şampiyon en fazla kaç seviyeye ulaşır?', a: ['15', '18', '20', '25'], correct: 1 },
  { theme: 'lol', q: 'Envanterinde en fazla kaç eşya taşıyabilirsin?', a: ['4', '5', '6', '8'], correct: 2 },
  { theme: 'lol', q: '“CS” neyi ifade eder?', a: ['Champion Score', 'Creep Score', 'Combat Skill', 'Core Stats'], correct: 1 },
  { theme: 'lol', q: 'Üsse yakın yıkılan yapı hangisidir?', a: ['Kule', 'Inhibitor', 'Nexus', 'Ward'], correct: 1 },
  { theme: 'lol', q: 'Akoridordan gelen küçük savaşçılara ne denir?', a: ['Minions', 'Mobs', 'Creeps', 'Pawns'], correct: 0 },
  { theme: 'lol', q: '“GG” neyin kısaltmasıdır?', a: ['Good Game', 'Great Goal', 'Go Go', 'Get Gold'], correct: 0 },
  { theme: 'lol', q: '“KDA” neyi gösterir?', a: ['Kill/Death/Assist', 'Kill/Damage/Armor', 'Kite/Dodge/Attack', 'Kill/Dragon/Ace'], correct: 0 },
  { theme: 'lol', q: 'Bir şampiyonu zayıflatmaya ne denir?', a: ['Buff', 'Nerf', 'Patch', 'Smurf'], correct: 1 },
  { theme: 'lol', q: 'Bir şampiyonu güçlendirmeye ne denir?', a: ['Buff', 'Nerf', 'Debuff', 'Respawn'], correct: 0 },
  { theme: 'lol', q: 'Rakip takımın görüşünü engelleyen araca ne denir?', a: ['Ward', 'Totem', 'Scanner', 'Beacon'], correct: 0 },
  { theme: 'lol', q: 'Rekabetçi sıralamada en düşük kademe hangisidir?', a: ['Bronze', 'Iron', 'Silver', 'Wood'], correct: 1 },
  { theme: 'lol', q: 'Yüksek seviyeli oyuncunun yeni hesap açmasına ne denir?', a: ['Smurf', 'Boost', 'Reroll', 'Clip'], correct: 0 },
  { theme: 'lol', q: 'Maçtan erken çekilmeye ne denir?', a: ['Forfeit', 'Dodge', 'Rage quit', 'Pause'], correct: 1 },
  { theme: 'lol', q: 'Orman bölgesindeki yaratıkları avlayan role ne denir?', a: ['Jungler', 'Roamer', 'Ganker', 'Support'], correct: 0 },
  { theme: 'lol', q: 'Takım arkadaşını iyileştiren rol hangisidir?', a: ['Mid', 'Support', 'Top', 'Jungle'], correct: 1 },
  { theme: 'lol', q: 'LoL ilk olarak hangi yıl yayımlandı?', a: ['2004', '2006', '2009', '2012'], correct: 2 },
  { theme: 'lol', q: 'Rakip şampiyonu öldürmeden kesintisiz 3 öldürme serisine ne denir?', a: ['Killing Spree', 'Ace', 'Double Kill', 'Flawless'], correct: 0 },
  { theme: 'lol', q: 'Bir takımın tüm rakiplerini aynı anda öldürmesine ne denir?', a: ['Ace', 'Sweep', 'Flank', 'Pentakill'], correct: 0 },

  /* ============ Tarih — 20 ============ */
  { theme: 'tarih', q: 'İstanbul’un fethi hangi yılda gerçekleşti?', a: ['1071', '1326', '1453', '1492'], correct: 2 },
  { theme: 'tarih', q: 'Türkiye Cumhuriyeti hangi yıl kuruldu?', a: ['1919', '1920', '1923', '1938'], correct: 2 },
  { theme: 'tarih', q: 'Malazgirt Savaşı hangi yılda yapıldı?', a: ['1071', '1176', '1299', '1402'], correct: 0 },
  { theme: 'tarih', q: 'İkinci Dünya Savaşı hangi yıl bitti?', a: ['1943', '1944', '1945', '1946'], correct: 2 },
  { theme: 'tarih', q: 'Birinci Dünya Savaşı hangi olayla başladı?', a: ['Saraybosna suikastı', 'Berlin kuşatması', 'Versay Antlaşması', 'Paris Kongresi'], correct: 0 },
  { theme: 'tarih', q: 'Osmanlı Devleti’ni kim kurdu?', a: ['Orhan Bey', 'Osman Bey', 'Ertuğrul Gazi', 'Sultan Süleyman'], correct: 1 },
  { theme: 'tarih', q: 'Ayasofya ilk olarak hangi amaçla inşa edildi?', a: ['Saray', 'Kilise', 'Kale', 'Çarşı'], correct: 1 },
  { theme: 'tarih', q: 'Fransız Devrimi hangi yılda başladı?', a: ['1776', '1789', '1815', '1848'], correct: 1 },
  { theme: 'tarih', q: 'Mustafa Kemal Atatürk hangi yıl doğdu?', a: ['1871', '1881', '1891', '1901'], correct: 1 },
  { theme: 'tarih', q: 'TBMM hangi tarihte açıldı?', a: ['23 Nisan 1920', '19 Mayıs 1919', '29 Ekim 1923', '1 Kasım 1922'], correct: 0 },
  { theme: 'tarih', q: 'Türkiye’de kadınlara milletvekili seçme hakkı hangi yıl verildi?', a: ['1926', '1930', '1934', '1945'], correct: 2 },
  { theme: 'tarih', q: 'Çanakkale Savaşı hangi cephede yaşandı?', a: ['Kafkas', 'Gelibolu', 'Sina', 'Galiçya'], correct: 1 },
  { theme: 'tarih', q: 'Berlin Duvarı hangi yıl yıkıldı?', a: ['1961', '1975', '1989', '1991'], correct: 2 },
  { theme: 'tarih', q: 'Yazıyı ilk kullanan uygarlık hangisidir?', a: ['Mısırlılar', 'Sümerler', 'Hititler', 'Romalılar'], correct: 1 },
  { theme: 'tarih', q: 'Halifelik hangi yıl kaldırıldı?', a: ['1922', '1923', '1924', '1928'], correct: 2 },
  { theme: 'tarih', q: 'Kurtuluş Savaşı’nı bitiren antlaşma hangisidir?', a: ['Mudanya', 'Lozan', 'Sevr', 'Ankara'], correct: 1 },
  { theme: 'tarih', q: 'Roma İmparatorluğu’nun başkenti neresiydi?', a: ['Atina', 'Roma', 'İskenderiye', 'Kartaca'], correct: 1 },
  { theme: 'tarih', q: 'Tarihteki ilk yazılı antlaşma hangisidir?', a: ['Kadeş', 'Lozan', 'Versay', 'Magna Carta'], correct: 0 },
  { theme: 'tarih', q: 'Birinci Dünya Savaşı hangi yıl sona erdi?', a: ['1916', '1917', '1918', '1919'], correct: 2 },
  { theme: 'tarih', q: 'Orta Çağ hangi olayla başladığı kabul edilir?', a: ['Roma’nın yıkılışı', 'Matbaanın icadı', 'Amerika’nın keşfi', 'İstanbul’un fethi'], correct: 0 },

  /* ============ Coğrafya — 18 ============ */
  { theme: 'cografya', q: 'Türkiye’nin en yüksek dağı hangisidir?', a: ['Erciyes', 'Uludağ', 'Ağrı Dağı', 'Kaçkar'], correct: 2 },
  { theme: 'cografya', q: 'Dünyanın en uzun nehri hangisidir?', a: ['Amazon', 'Nil', 'Yangtze', 'Mississippi'], correct: 1 },
  { theme: 'cografya', q: 'Türkiye kaç coğrafi bölgeye ayrılmıştır?', a: ['5', '6', '7', '8'], correct: 2 },
  { theme: 'cografya', q: 'En büyük okyanus hangisidir?', a: ['Atlantik', 'Hint', 'Pasifik', 'Arktik'], correct: 2 },
  { theme: 'cografya', q: 'Türkiye’nin başkenti neresidir?', a: ['İstanbul', 'Ankara', 'İzmir', 'Bursa'], correct: 1 },
  { theme: 'cografya', q: 'Dünyanın en yüksek dağı hangisidir?', a: ['K2', 'Everest', 'Kilimanjaro', 'Denali'], correct: 1 },
  { theme: 'cografya', q: 'İstanbul Boğazı hangi iki denizi birleştirir?', a: ['Akdeniz-Ege', 'Karadeniz-Marmara', 'Ege-Marmara', 'Karadeniz-Ege'], correct: 1 },
  { theme: 'cografya', q: 'Türkiye’nin en büyük gölü hangisidir?', a: ['Tuz Gölü', 'Van Gölü', 'Beyşehir', 'Eğirdir'], correct: 1 },
  { theme: 'cografya', q: 'Türkiye’nin en uzun nehri hangisidir?', a: ['Fırat', 'Kızılırmak', 'Sakarya', 'Yeşilırmak'], correct: 1 },
  { theme: 'cografya', q: 'Türkiye’de kaç il vardır?', a: ['67', '74', '81', '85'], correct: 2 },
  { theme: 'cografya', q: 'Türkiye’nin en kalabalık ili hangisidir?', a: ['Ankara', 'İzmir', 'İstanbul', 'Bursa'], correct: 2 },
  { theme: 'cografya', q: 'Dünyanın en küçük ülkesi hangisidir?', a: ['Monako', 'Vatikan', 'San Marino', 'Malta'], correct: 1 },
  { theme: 'cografya', q: 'Sahra Çölü hangi kıtadadır?', a: ['Asya', 'Afrika', 'Avustralya', 'Güney Amerika'], correct: 1 },
  { theme: 'cografya', q: 'Amazon Nehri hangi kıtadadır?', a: ['Afrika', 'Asya', 'Güney Amerika', 'Kuzey Amerika'], correct: 2 },
  { theme: 'cografya', q: 'Asya ile Avrupa’yı ayıran boğaz hangisidir?', a: ['Cebelitarık', 'İstanbul', 'Hürmüz', 'Bering'], correct: 1 },
  { theme: 'cografya', q: 'Eyfel Kulesi hangi şehirdedir?', a: ['Londra', 'Roma', 'Paris', 'Berlin'], correct: 2 },
  { theme: 'cografya', q: 'Dünyanın en büyük çölü hangisidir?', a: ['Sahra', 'Gobi', 'Antarktika', 'Kalahari'], correct: 2 },
  { theme: 'cografya', q: 'Bir ülkenin en büyük idari birimine ne denir?', a: ['İl', 'İlçe', 'Köy', 'Bölge'], correct: 0 },

  /* ============ Sanat & müzik — 13 ============ */
  { theme: 'sanat', q: 'Mona Lisa tablosunu kim yaptı?', a: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Van Gogh'], correct: 1 },
  { theme: 'sanat', q: '“Yıldızlı Gece” tablosu kime aittir?', a: ['Monet', 'Van Gogh', 'Picasso', 'Dali'], correct: 1 },
  { theme: 'sanat', q: 'Bir orkestrayı yönetene ne denir?', a: ['Solist', 'Şef', 'Besteci', 'Koro'], correct: 1 },
  { theme: 'sanat', q: 'Standart bir piyanoda kaç tuş vardır?', a: ['66', '76', '88', '98'], correct: 2 },
  { theme: 'sanat', q: '“Hamlet” kimin eseridir?', a: ['Shakespeare', 'Tolstoy', 'Dostoyevski', 'Goethe'], correct: 0 },
  { theme: 'sanat', q: 'Bir oktavda kaç nota vardır?', a: ['5', '6', '7', '8'], correct: 2 },
  { theme: 'sanat', q: '“Guernica” tablosunu kim yaptı?', a: ['Picasso', 'Dali', 'Monet', 'Matisse'], correct: 0 },
  { theme: 'sanat', q: '“Kaplumbağa Terbiyecisi” hangi Türk ressamın eseridir?', a: ['Osman Hamdi Bey', 'Şeker Ahmet Paşa', 'İbrahim Çallı', 'Fikret Mualla'], correct: 0 },
  { theme: 'sanat', q: '“Davut” heykeli kime aittir?', a: ['Rodin', 'Michelangelo', 'Praksiteles', 'Bernini'], correct: 1 },
  { theme: 'sanat', q: 'Dokuzuncu Senfoni’yi kim besteledi?', a: ['Mozart', 'Beethoven', 'Bach', 'Chopin'], correct: 1 },
  { theme: 'sanat', q: 'Notre-Dame Katedrali hangi şehirdedir?', a: ['Roma', 'Londra', 'Paris', 'Viyana'], correct: 2 },
  { theme: 'sanat', q: 'Heykel yontmak için kullanılan alet hangisidir?', a: ['Fırça', 'Keski', 'Kalem', 'Testere'], correct: 1 },
  { theme: 'sanat', q: '“Barış Manço” hangi alanda ünlüdür?', a: ['Resim', 'Müzik', 'Heykel', 'Tiyatro'], correct: 1 },

  /* ============ Bilim — 19 ============ */
  { theme: 'bilim', q: 'Suyun kimyasal formülü nedir?', a: ['CO2', 'H2O', 'O2', 'NaCl'], correct: 1 },
  { theme: 'bilim', q: 'İnsan vücudundaki en büyük organ hangisidir?', a: ['Karaciğer', 'Deri', 'Akciğer', 'Beyin'], correct: 1 },
  { theme: 'bilim', q: 'Dünya Güneş’in etrafındaki turunu kaç günde tamamlar?', a: ['30', '180', '365', '500'], correct: 2 },
  { theme: 'bilim', q: 'Işığın boşluktaki hızı yaklaşık kaçtır?', a: ['3.000 km/s', '30.000 km/s', '300.000 km/s', '3.000.000 km/s'], correct: 2 },
  { theme: 'bilim', q: 'Periyodik tablodaki ilk element hangisidir?', a: ['Helyum', 'Hidrojen', 'Oksijen', 'Karbon'], correct: 1 },
  { theme: 'bilim', q: 'İnsan kalbi kaç odacıklıdır?', a: ['2', '3', '4', '5'], correct: 2 },
  { theme: 'bilim', q: 'Fotosentez için hangi gaz gereklidir?', a: ['Oksijen', 'Karbondioksit', 'Azot', 'Hidrojen'], correct: 1 },
  { theme: 'bilim', q: 'Güneş sisteminde kaç gezegen vardır?', a: ['7', '8', '9', '10'], correct: 1 },
  { theme: 'bilim', q: '“Kızıl Gezegen” olarak bilinen gezegen hangisidir?', a: ['Venüs', 'Mars', 'Jüpiter', 'Merkür'], correct: 1 },
  { theme: 'bilim', q: 'Güneş sistemindeki en büyük gezegen hangisidir?', a: ['Satürn', 'Jüpiter', 'Neptün', 'Dünya'], correct: 1 },
  { theme: 'bilim', q: 'Yetişkin bir insanda kaç kemik bulunur?', a: ['106', '156', '206', '306'], correct: 2 },
  { theme: 'bilim', q: 'İnsanda kaç kromozom vardır?', a: ['23', '44', '46', '48'], correct: 2 },
  { theme: 'bilim', q: 'Su deniz seviyesinde kaç derecede kaynar?', a: ['50°C', '90°C', '100°C', '120°C'], correct: 2 },
  { theme: 'bilim', q: 'Atomun merkezinde ne bulunur?', a: ['Elektron', 'Çekirdek', 'Proton bulutu', 'Boşluk'], correct: 1 },
  { theme: 'bilim', q: 'Doğada bilinen en sert madde hangisidir?', a: ['Altın', 'Elmas', 'Demir', 'Kuvars'], correct: 1 },
  { theme: 'bilim', q: 'Kanın kırmızı görünmesini sağlayan element hangisidir?', a: ['Kalsiyum', 'Demir', 'Sodyum', 'Potasyum'], correct: 1 },
  { theme: 'bilim', q: 'Ay nedir?', a: ['Bir gezegen', 'Dünya’nın uydusu', 'Bir yıldız', 'Bir kuyruklu yıldız'], correct: 1 },
  { theme: 'bilim', q: 'Solunum için hangi gazı alırız?', a: ['Karbondioksit', 'Oksijen', 'Azot', 'Helyum'], correct: 1 },
  { theme: 'bilim', q: 'Güneş sisteminin merkezinde ne vardır?', a: ['Dünya', 'Güneş', 'Jüpiter', 'Ay'], correct: 1 },
];

/** Group every question by its theme so a match can use a single category. */
export const QUESTIONS_BY_CATEGORY: Record<QuestionCategory, Question[]> = QUESTIONS.reduce(
  (acc, q) => {
    (acc[q.theme] ||= []).push(q);
    return acc;
  },
  {} as Record<QuestionCategory, Question[]>
);
