export type WeightClass = 'All-Around' | 'Lightweight' | 'Heavyweight';

export type ChassisStyle = 'standard' | 'pipe' | 'mach' | 'offroad' | 'arcade';

export type CharacterSpecies =
  | 'human_cap'
  | 'princess'
  | 'dino'
  | 'toad'
  | 'koopa_troopa'
  | 'shyguy'
  | 'boo'
  | 'koopa_king'
  | 'kong'
  | 'pacman'
  | 'ghost'
  | 'taiko';

export interface RacerSpec {
  id: string;
  name: string;
  title: string;
  weightClass: WeightClass;
  chassis: ChassisStyle;
  primaryColor: string;
  secondaryColor: string;
  neonColor: string;
  skinColor: string;
  outfitColor: string;
  accentColor: string;
  emblem: string;
  stats: {
    topSpeed: number; // 1-100
    acceleration: number; // 1-100
    handling: number; // 1-100
    weight: number; // 1-100
  };
  species: CharacterSpecies;
}

export const ROSTER: RacerSpec[] = [
  // ROW 1: HEROES & PRINCESSES
  {
    id: 'mario',
    name: 'Mario',
    title: 'Red Comet Ace',
    weightClass: 'All-Around',
    chassis: 'standard',
    primaryColor: '#e6192e',
    secondaryColor: '#ffffff',
    neonColor: '#ff3b4e',
    skinColor: '#ffcc9e',
    outfitColor: '#1d4ed8',
    accentColor: '#facc15',
    emblem: 'M',
    stats: { topSpeed: 76, acceleration: 74, handling: 76, weight: 70 },
    species: 'human_cap',
  },
  {
    id: 'luigi',
    name: 'Luigi',
    title: 'Emerald Phantom',
    weightClass: 'All-Around',
    chassis: 'mach',
    primaryColor: '#16a34a',
    secondaryColor: '#f8fafc',
    neonColor: '#22c55e',
    skinColor: '#ffcc9e',
    outfitColor: '#1e3a8a',
    accentColor: '#facc15',
    emblem: 'L',
    stats: { topSpeed: 77, acceleration: 73, handling: 78, weight: 68 },
    species: 'human_cap',
  },
  {
    id: 'peach',
    name: 'Peach',
    title: 'Royal Slipstream',
    weightClass: 'Lightweight',
    chassis: 'mach',
    primaryColor: '#f472b6',
    secondaryColor: '#fdf2f8',
    neonColor: '#ec4899',
    skinColor: '#ffdfc4',
    outfitColor: '#ec4899',
    accentColor: '#facc15',
    emblem: '♛',
    stats: { topSpeed: 68, acceleration: 88, handling: 88, weight: 52 },
    species: 'princess',
  },
  {
    id: 'daisy',
    name: 'Daisy',
    title: 'Sarasaland Turbo',
    weightClass: 'Lightweight',
    chassis: 'standard',
    primaryColor: '#f97316',
    secondaryColor: '#fef08a',
    neonColor: '#fb923c',
    skinColor: '#ffd8b8',
    outfitColor: '#eab308',
    accentColor: '#22c55e',
    emblem: '✿',
    stats: { topSpeed: 70, acceleration: 86, handling: 86, weight: 54 },
    species: 'princess',
  },
  {
    id: 'rosalina',
    name: 'Rosalina',
    title: 'Cosmic Starlight',
    weightClass: 'All-Around',
    chassis: 'mach',
    primaryColor: '#2dd4bf',
    secondaryColor: '#e0f2fe',
    neonColor: '#38bdf8',
    skinColor: '#ffe0cc',
    outfitColor: '#06b6d4',
    accentColor: '#fde047',
    emblem: '★',
    stats: { topSpeed: 80, acceleration: 68, handling: 72, weight: 76 },
    species: 'princess',
  },
  {
    id: 'yoshi',
    name: 'Yoshi',
    title: 'Turbo Hopper',
    weightClass: 'Lightweight',
    chassis: 'pipe',
    primaryColor: '#22c55e',
    secondaryColor: '#ffffff',
    neonColor: '#4ade80',
    skinColor: '#22c55e',
    outfitColor: '#ffffff',
    accentColor: '#ef4444',
    emblem: '🥚',
    stats: { topSpeed: 71, acceleration: 86, handling: 89, weight: 55 },
    species: 'dino',
  },

  // ROW 2: MUSHROOM KINGDOM FAVORITES
  {
    id: 'toad',
    name: 'Toad',
    title: 'Mushroom Rocket',
    weightClass: 'Lightweight',
    chassis: 'pipe',
    primaryColor: '#3b82f6',
    secondaryColor: '#ffffff',
    neonColor: '#60a5fa',
    skinColor: '#ffe0c4',
    outfitColor: '#2563eb',
    accentColor: '#ef4444',
    emblem: '🍄',
    stats: { topSpeed: 66, acceleration: 93, handling: 92, weight: 46 },
    species: 'toad',
  },
  {
    id: 'koopa',
    name: 'Koopa Troopa',
    title: 'Shell Slider',
    weightClass: 'Lightweight',
    chassis: 'pipe',
    primaryColor: '#16a34a',
    secondaryColor: '#facc15',
    neonColor: '#4ade80',
    skinColor: '#facc15',
    outfitColor: '#15803d',
    accentColor: '#ef4444',
    emblem: '🐢',
    stats: { topSpeed: 67, acceleration: 91, handling: 90, weight: 47 },
    species: 'koopa_troopa',
  },
  {
    id: 'shyguy',
    name: 'Shy Guy',
    title: 'Masked Drifter',
    weightClass: 'Lightweight',
    chassis: 'standard',
    primaryColor: '#dc2626',
    secondaryColor: '#f8fafc',
    neonColor: '#f87171',
    skinColor: '#f8fafc',
    outfitColor: '#b91c1c',
    accentColor: '#1e293b',
    emblem: '🎭',
    stats: { topSpeed: 69, acceleration: 88, handling: 90, weight: 50 },
    species: 'shyguy',
  },
  {
    id: 'kingboo',
    name: 'King Boo',
    title: 'Phantom Monarch',
    weightClass: 'Heavyweight',
    chassis: 'mach',
    primaryColor: '#f8fafc',
    secondaryColor: '#7e22ce',
    neonColor: '#c084fc',
    skinColor: '#f8fafc',
    outfitColor: '#e2e8f0',
    accentColor: '#facc15',
    emblem: '👻',
    stats: { topSpeed: 88, acceleration: 66, handling: 70, weight: 84 },
    species: 'boo',
  },
  {
    id: 'bowserjr',
    name: 'Bowser Jr.',
    title: 'Clown Car Rogue',
    weightClass: 'Lightweight',
    chassis: 'pipe',
    primaryColor: '#84cc16',
    secondaryColor: '#f97316',
    neonColor: '#a3e635',
    skinColor: '#facc15',
    outfitColor: '#16a34a',
    accentColor: '#ffffff',
    emblem: 'JR',
    stats: { topSpeed: 69, acceleration: 89, handling: 87, weight: 50 },
    species: 'koopa_king',
  },
  {
    id: 'dk',
    name: 'Donkey Kong',
    title: 'Jungle Powerhouse',
    weightClass: 'Heavyweight',
    chassis: 'offroad',
    primaryColor: '#92400e',
    secondaryColor: '#facc15',
    neonColor: '#f59e0b',
    skinColor: '#78350f',
    outfitColor: '#dc2626',
    accentColor: '#fde047',
    emblem: 'DK',
    stats: { topSpeed: 91, acceleration: 62, handling: 64, weight: 92 },
    species: 'kong',
  },

  // ROW 3: HEAVYWEIGHT RIVALS & ARCADE CROSSOVERS
  {
    id: 'wario',
    name: 'Wario',
    title: 'Gold Rush Bruiser',
    weightClass: 'Heavyweight',
    chassis: 'offroad',
    primaryColor: '#eab308',
    secondaryColor: '#7e22ce',
    neonColor: '#fde047',
    skinColor: '#ffd4a3',
    outfitColor: '#7e22ce',
    accentColor: '#22c55e',
    emblem: 'W',
    stats: { topSpeed: 92, acceleration: 60, handling: 61, weight: 94 },
    species: 'human_cap',
  },
  {
    id: 'waluigi',
    name: 'Waluigi',
    title: 'Violet Interceptor',
    weightClass: 'Heavyweight',
    chassis: 'mach',
    primaryColor: '#7e22ce',
    secondaryColor: '#1e1b4b',
    neonColor: '#a855f7',
    skinColor: '#ffd4a3',
    outfitColor: '#312e81',
    accentColor: '#facc15',
    emblem: 'Γ',
    stats: { topSpeed: 89, acceleration: 65, handling: 68, weight: 86 },
    species: 'human_cap',
  },
  {
    id: 'bowser',
    name: 'Bowser',
    title: 'Koopa Juggernaut',
    weightClass: 'Heavyweight',
    chassis: 'offroad',
    primaryColor: '#b91c1c',
    secondaryColor: '#f59e0b',
    neonColor: '#ff5500',
    skinColor: '#eab308',
    outfitColor: '#15803d',
    accentColor: '#dc2626',
    emblem: '🔥',
    stats: { topSpeed: 95, acceleration: 56, handling: 58, weight: 98 },
    species: 'koopa_king',
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    title: 'Arcade Legend',
    weightClass: 'All-Around',
    chassis: 'arcade',
    primaryColor: '#facc15',
    secondaryColor: '#ef4444',
    neonColor: '#fde047',
    skinColor: '#fde047',
    outfitColor: '#dc2626',
    accentColor: '#ffffff',
    emblem: 'PAC',
    stats: { topSpeed: 75, acceleration: 78, handling: 79, weight: 65 },
    species: 'pacman',
  },
  {
    id: 'blinky',
    name: 'Blinky',
    title: 'Shadow Sprinter',
    weightClass: 'Lightweight',
    chassis: 'arcade',
    primaryColor: '#ef4444',
    secondaryColor: '#1e293b',
    neonColor: '#ff2e43',
    skinColor: '#ef4444',
    outfitColor: '#b91c1c',
    accentColor: '#38bdf8',
    emblem: 'B',
    stats: { topSpeed: 70, acceleration: 90, handling: 90, weight: 48 },
    species: 'ghost',
  },
  {
    id: 'donchan',
    name: 'Don-chan',
    title: 'Taiko Thunder',
    weightClass: 'Lightweight',
    chassis: 'arcade',
    primaryColor: '#f97316',
    secondaryColor: '#fef3c7',
    neonColor: '#38bdf8',
    skinColor: '#fb7185',
    outfitColor: '#2563eb',
    accentColor: '#facc15',
    emblem: 'ドン',
    stats: { topSpeed: 68, acceleration: 92, handling: 89, weight: 49 },
    species: 'taiko',
  },
];

export function getRacerById(id: string): RacerSpec {
  return ROSTER.find((r) => r.id === id) ?? ROSTER[0];
}
