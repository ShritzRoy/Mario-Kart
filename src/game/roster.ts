import type { ItemKind } from '../shared/protocol';

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

export interface RacerVariant {
  id: string;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  outfitColor: string;
  neonColor: string;
  accentColor: string;
}

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
  bio: [string, string];
  specialItem: Exclude<ItemKind, 'none'>;
  variants: RacerVariant[];
  stats: {
    topSpeed: number; // 1-100
    acceleration: number; // 1-100
    handling: number; // 1-100
    weight: number; // 1-100
  };
  species: CharacterSpecies;
}

function makeVariants(
  base: Pick<
    RacerSpec,
    'primaryColor' | 'secondaryColor' | 'outfitColor' | 'neonColor' | 'accentColor'
  >,
  alts: Omit<RacerVariant, 'id'>[],
  baseLabel = 'Classic'
): RacerVariant[] {
  return [
    {
      id: 'classic',
      label: baseLabel,
      primaryColor: base.primaryColor,
      secondaryColor: base.secondaryColor,
      outfitColor: base.outfitColor,
      neonColor: base.neonColor,
      accentColor: base.accentColor,
    },
    ...alts.map((a, idx) => ({
      id: `v${idx + 1}`,
      ...a,
    })),
  ];
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
    specialItem: 'golden_flower',
    bio: [
      'The fearless all-rounder of the Mushroom Kingdom Grand Prix, balancing crisp cornering with reliable top-end nitro velocity on every circuit.',
      'Signature Special Item: Golden Fire Flower — unleashes blazing golden fireballs that spin rivals out and burst into coin showers.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#e6192e',
        secondaryColor: '#ffffff',
        outfitColor: '#1d4ed8',
        neonColor: '#ff3b4e',
        accentColor: '#facc15',
      },
      [
        {
          label: 'Fire Mario',
          primaryColor: '#ffffff',
          secondaryColor: '#ef4444',
          outfitColor: '#dc2626',
          neonColor: '#fb923c',
          accentColor: '#fde047',
        },
        {
          label: 'Ice Mario',
          primaryColor: '#38bdf8',
          secondaryColor: '#e0f2fe',
          outfitColor: '#1e3a8a',
          neonColor: '#7dd3fc',
          accentColor: '#ffffff',
        },
        {
          label: 'Builder',
          primaryColor: '#facc15',
          secondaryColor: '#fef08a',
          outfitColor: '#b45309',
          neonColor: '#fde047',
          accentColor: '#ef4444',
        },
        {
          label: 'Gold Comet',
          primaryColor: '#f59e0b',
          secondaryColor: '#fef3c7',
          outfitColor: '#92400e',
          neonColor: '#fde047',
          accentColor: '#ffffff',
        },
      ]
    ),
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
    specialItem: 'p_balloon',
    bio: [
      'Precision line-holder famous for razor-sharp drift exits and fearless overtaking maneuvers under stadium floodlights.',
      'Signature Special Item: P-Balloon — wraps the kart in Triple Shield Balloons that pop upon impact to deflect shells and hazards.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#16a34a',
        secondaryColor: '#f8fafc',
        outfitColor: '#1e3a8a',
        neonColor: '#22c55e',
        accentColor: '#facc15',
      },
      [
        {
          label: 'Poltergust',
          primaryColor: '#4ade80',
          secondaryColor: '#0f172a',
          outfitColor: '#334155',
          neonColor: '#86efac',
          accentColor: '#38bdf8',
        },
        {
          label: 'Fire Luigi',
          primaryColor: '#f8fafc',
          secondaryColor: '#16a34a',
          outfitColor: '#15803d',
          neonColor: '#4ade80',
          accentColor: '#fde047',
        },
        {
          label: 'Mr. L',
          primaryColor: '#1e293b',
          secondaryColor: '#22c55e',
          outfitColor: '#0f172a',
          neonColor: '#4ade80',
          accentColor: '#facc15',
        },
        {
          label: 'Casino',
          primaryColor: '#047857',
          secondaryColor: '#fde047',
          outfitColor: '#14532d',
          neonColor: '#34d399',
          accentColor: '#ffffff',
        },
      ]
    ),
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
    specialItem: 'super_bell',
    bio: [
      'A sleek aerodynamic specialist whose nimble acceleration launches her off the starting grid and cleanly out of tight corners.',
      'Signature Special Item: Super Bell — grants shimmering Cat Claws with magnet boost speed and sweeps nearby karts aside.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#f472b6',
        secondaryColor: '#fdf2f8',
        outfitColor: '#ec4899',
        neonColor: '#ec4899',
        accentColor: '#facc15',
      },
      [
        {
          label: 'Cat Peach',
          primaryColor: '#fb7185',
          secondaryColor: '#fff1f2',
          outfitColor: '#f43f5e',
          neonColor: '#fda4af',
          accentColor: '#fde047',
        },
        {
          label: 'Vacation',
          primaryColor: '#38bdf8',
          secondaryColor: '#f0f9ff',
          outfitColor: '#0284c7',
          neonColor: '#7dd3fc',
          accentColor: '#fde047',
        },
        {
          label: 'Winter',
          primaryColor: '#e2e8f0',
          secondaryColor: '#f472b6',
          outfitColor: '#db2777',
          neonColor: '#f9a8d4',
          accentColor: '#ffffff',
        },
        {
          label: 'Royal Gold',
          primaryColor: '#fbbf24',
          secondaryColor: '#fdf2f8',
          outfitColor: '#be185d',
          neonColor: '#fde047',
          accentColor: '#f472b6',
        },
      ]
    ),
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
    specialItem: 'double_cherry',
    bio: [
      'Energetic Sarasaland champion who carries blistering mini-turbo momentum through sweeping chicanes and elevated viaducts.',
      'Signature Special Item: Double Cherry — deploys a holographic twin escort that doubles drafting force and boosts slipstream pace.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#f97316',
        secondaryColor: '#fef08a',
        outfitColor: '#eab308',
        neonColor: '#fb923c',
        accentColor: '#22c55e',
      },
      [
        {
          label: 'Swimwear',
          primaryColor: '#fb923c',
          secondaryColor: '#ffffff',
          outfitColor: '#facc15',
          neonColor: '#fdba74',
          accentColor: '#38bdf8',
        },
        {
          label: 'Thai Dress',
          primaryColor: '#fbbf24',
          secondaryColor: '#fef3c7',
          outfitColor: '#d97706',
          neonColor: '#fde047',
          accentColor: '#ef4444',
        },
        {
          label: 'Sailor',
          primaryColor: '#0ea5e9',
          secondaryColor: '#fef08a',
          outfitColor: '#1d4ed8',
          neonColor: '#38bdf8',
          accentColor: '#f97316',
        },
        {
          label: 'Emerald',
          primaryColor: '#16a34a',
          secondaryColor: '#fef08a',
          outfitColor: '#15803d',
          neonColor: '#4ade80',
          accentColor: '#fb923c',
        },
      ]
    ),
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
    specialItem: 'cloud_flower',
    bio: [
      'Guardian of the Comet Observatory whose celestial weight and top-speed grace dominate long straightaways and 360° anti-gravity loops.',
      'Signature Special Item: Cloud Flower — unlocks triple mid-air Cloud Hop boosts for soaring shortcuts over track curves.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#2dd4bf',
        secondaryColor: '#e0f2fe',
        outfitColor: '#06b6d4',
        neonColor: '#38bdf8',
        accentColor: '#fde047',
      },
      [
        {
          label: 'Aurora',
          primaryColor: '#6366f1',
          secondaryColor: '#2dd4bf',
          outfitColor: '#4338ca',
          neonColor: '#818cf8',
          accentColor: '#f472b6',
        },
        {
          label: 'Halloween',
          primaryColor: '#7e22ce',
          secondaryColor: '#f97316',
          outfitColor: '#4c1d95',
          neonColor: '#c084fc',
          accentColor: '#fde047',
        },
        {
          label: 'Fire Rosa',
          primaryColor: '#f43f5e',
          secondaryColor: '#fef2f2',
          outfitColor: '#be123c',
          neonColor: '#fb7185',
          accentColor: '#fde047',
        },
        {
          label: 'Starry Gold',
          primaryColor: '#0f172a',
          secondaryColor: '#fde047',
          outfitColor: '#1e293b',
          neonColor: '#facc15',
          accentColor: '#38bdf8',
        },
      ]
    ),
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
    specialItem: 'mushroom',
    bio: [
      'A lively fan-favorite dinosaur known for lightning-fast drift snap and vibrant Isle aesthetics across every GP course.',
      'Signature Special Item: Dash Mushroom — fires an instant high-pressure blue nitro surge straight down the racing apex.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#22c55e',
        secondaryColor: '#ffffff',
        outfitColor: '#ffffff',
        neonColor: '#4ade80',
        accentColor: '#ef4444',
      },
      [
        {
          label: 'Orange',
          primaryColor: '#f97316',
          secondaryColor: '#fff7ed',
          outfitColor: '#ffffff',
          neonColor: '#fb923c',
          accentColor: '#1d4ed8',
        },
        {
          label: 'Crimson',
          primaryColor: '#ef4444',
          secondaryColor: '#fef2f2',
          outfitColor: '#ffffff',
          neonColor: '#f87171',
          accentColor: '#facc15',
        },
        {
          label: 'Sky Blue',
          primaryColor: '#0ea5e9',
          secondaryColor: '#f0f9ff',
          outfitColor: '#ffffff',
          neonColor: '#38bdf8',
          accentColor: '#ec4899',
        },
        {
          label: 'Midnight',
          primaryColor: '#1e293b',
          secondaryColor: '#e2e8f0',
          outfitColor: '#f8fafc',
          neonColor: '#38bdf8',
          accentColor: '#fde047',
        },
      ],
      'Green'
    ),
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
    specialItem: 'mini_mushroom',
    bio: [
      'Featherweight sprinter from the Mushroom Palace whose tiny turning circle carves effortlessly inside heavyweight rivals.',
      'Signature Special Item: Mini Mushroom — shrinks your kart profile to dodge projectiles while gaining hyper-agile cornering speed.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#3b82f6',
        secondaryColor: '#ffffff',
        outfitColor: '#2563eb',
        neonColor: '#60a5fa',
        accentColor: '#ef4444',
      },
      [
        {
          label: 'Pit Crew',
          primaryColor: '#ef4444',
          secondaryColor: '#f8fafc',
          outfitColor: '#b91c1c',
          neonColor: '#f87171',
          accentColor: '#facc15',
        },
        {
          label: 'Party Time',
          primaryColor: '#eab308',
          secondaryColor: '#fef9c3',
          outfitColor: '#7e22ce',
          neonColor: '#fde047',
          accentColor: '#ec4899',
        },
        {
          label: 'Toadette',
          primaryColor: '#ec4899',
          secondaryColor: '#fdf2f8',
          outfitColor: '#db2777',
          neonColor: '#f472b6',
          accentColor: '#ffffff',
        },
        {
          label: 'Explorer',
          primaryColor: '#16a34a',
          secondaryColor: '#fef3c7',
          outfitColor: '#854d0e',
          neonColor: '#4ade80',
          accentColor: '#f59e0b',
        },
      ]
    ),
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
    specialItem: 'shell',
    bio: [
      'A classic Koopaling Circuit native who carries effortless drift rhythm through palm-lined resorts and winding highway hairpins.',
      'Signature Special Item: Green Shell — launches high-velocity ricocheting shells that rebound off track barriers.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#16a34a',
        secondaryColor: '#facc15',
        outfitColor: '#15803d',
        neonColor: '#4ade80',
        accentColor: '#ef4444',
      },
      [
        {
          label: 'Freerunning',
          primaryColor: '#ef4444',
          secondaryColor: '#fde047',
          outfitColor: '#b91c1c',
          neonColor: '#f87171',
          accentColor: '#ffffff',
        },
        {
          label: 'Gold Koopa',
          primaryColor: '#f59e0b',
          secondaryColor: '#fef3c7',
          outfitColor: '#b45309',
          neonColor: '#fde047',
          accentColor: '#ffffff',
        },
        {
          label: 'Purple Dash',
          primaryColor: '#9333ea',
          secondaryColor: '#f3e8ff',
          outfitColor: '#6b21a8',
          neonColor: '#c084fc',
          accentColor: '#fde047',
        },
        {
          label: 'Ocean Shell',
          primaryColor: '#0284c7',
          secondaryColor: '#e0f2fe',
          outfitColor: '#0369a1',
          neonColor: '#38bdf8',
          accentColor: '#facc15',
        },
      ]
    ),
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
    specialItem: 'cannon_box',
    bio: [
      'A mysterious pit-lane tactician whose crisp steering response and quiet focus win photo finishes at the checkered banner.',
      'Signature Special Item: Cannon Box — mounts a hood-top artillery cannon firing rapid-sequence high-speed cannonballs ahead.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#dc2626',
        secondaryColor: '#f8fafc',
        outfitColor: '#b91c1c',
        neonColor: '#f87171',
        accentColor: '#1e293b',
      },
      [
        {
          label: 'Ninja Guy',
          primaryColor: '#1e293b',
          secondaryColor: '#94a3b8',
          outfitColor: '#0f172a',
          neonColor: '#38bdf8',
          accentColor: '#ef4444',
        },
        {
          label: 'Gold Shy Guy',
          primaryColor: '#eab308',
          secondaryColor: '#fef9c3',
          outfitColor: '#a16207',
          neonColor: '#fde047',
          accentColor: '#ffffff',
        },
        {
          label: 'Mint Guy',
          primaryColor: '#10b981',
          secondaryColor: '#ecfdf5',
          outfitColor: '#047857',
          neonColor: '#34d399',
          accentColor: '#1e293b',
        },
        {
          label: 'Cobalt Guy',
          primaryColor: '#2563eb',
          secondaryColor: '#eff6ff',
          outfitColor: '#1d4ed8',
          neonColor: '#60a5fa',
          accentColor: '#facc15',
        },
      ]
    ),
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
    specialItem: 'purple_shell',
    bio: [
      'Floating spectral royalty combining haunting heavyweight momentum with surprisingly graceful slipstream transitions.',
      'Signature Special Item: Poison Purple Shell — leaves toxic purple hazard plumes and inflicts lingering toxic slowdown on hits.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#f8fafc',
        secondaryColor: '#7e22ce',
        outfitColor: '#e2e8f0',
        neonColor: '#c084fc',
        accentColor: '#facc15',
      },
      [
        {
          label: 'Luigi Mansion',
          primaryColor: '#6b21a8',
          secondaryColor: '#e9d5ff',
          outfitColor: '#4c1d95',
          neonColor: '#d8b4fe',
          accentColor: '#fde047',
        },
        {
          label: 'Gold Boo',
          primaryColor: '#fbbf24',
          secondaryColor: '#1e1b4b',
          outfitColor: '#d97706',
          neonColor: '#fde047',
          accentColor: '#c084fc',
        },
        {
          label: 'Crimson',
          primaryColor: '#be123c',
          secondaryColor: '#ffe4e6',
          outfitColor: '#881337',
          neonColor: '#fb7185',
          accentColor: '#fde047',
        },
        {
          label: 'Phantom Ice',
          primaryColor: '#38bdf8',
          secondaryColor: '#f0f9ff',
          outfitColor: '#0284c7',
          neonColor: '#7dd3fc',
          accentColor: '#e0f2fe',
        },
      ]
    ),
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
    specialItem: 'drill_mushroom',
    bio: [
      'Mischievous Koopa prince who dives aggressively under inside kerbs and blasts through rival clusters without hesitation.',
      'Signature Special Item: Drill Mushroom — equips a spinning nose drill that burrows through mud/off-road with zero drag penalty.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#84cc16',
        secondaryColor: '#f97316',
        outfitColor: '#16a34a',
        neonColor: '#a3e635',
        accentColor: '#ffffff',
      },
      [
        {
          label: 'Pirate Jr.',
          primaryColor: '#dc2626',
          secondaryColor: '#1e293b',
          outfitColor: '#991b1b',
          neonColor: '#f87171',
          accentColor: '#facc15',
        },
        {
          label: 'Shadow Jr.',
          primaryColor: '#1d4ed8',
          secondaryColor: '#0f172a',
          outfitColor: '#1e3a8a',
          neonColor: '#38bdf8',
          accentColor: '#e0f2fe',
        },
        {
          label: 'Magma',
          primaryColor: '#ea580c',
          secondaryColor: '#7c2d12',
          outfitColor: '#c2410c',
          neonColor: '#fb923c',
          accentColor: '#fde047',
        },
        {
          label: 'Neon Lime',
          primaryColor: '#22c55e',
          secondaryColor: '#ecfccb',
          outfitColor: '#15803d',
          neonColor: '#a3e635',
          accentColor: '#f97316',
        },
      ]
    ),
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
    specialItem: 'banana',
    bio: [
      'A towering heavyweight powerhouse who shrugs off shoulder-to-shoulder bumps and builds monstrous straightaway momentum.',
      'Signature Special Item: Giant Banana Trap — drops oversized treacherous banana peels behind your twin exhausts.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#92400e',
        secondaryColor: '#facc15',
        outfitColor: '#dc2626',
        neonColor: '#f59e0b',
        accentColor: '#fde047',
      },
      [
        {
          label: 'Gladiator',
          primaryColor: '#475569',
          secondaryColor: '#f59e0b',
          outfitColor: '#1e293b',
          neonColor: '#fbbf24',
          accentColor: '#ef4444',
        },
        {
          label: 'White DK',
          primaryColor: '#e2e8f0',
          secondaryColor: '#38bdf8',
          outfitColor: '#0284c7',
          neonColor: '#7dd3fc',
          accentColor: '#ffffff',
        },
        {
          label: 'Jungle Red',
          primaryColor: '#991b1b',
          secondaryColor: '#fde047',
          outfitColor: '#dc2626',
          neonColor: '#f87171',
          accentColor: '#facc15',
        },
        {
          label: 'Gold Barrel',
          primaryColor: '#ca8a04',
          secondaryColor: '#fef08a',
          outfitColor: '#713f12',
          neonColor: '#fde047',
          accentColor: '#ffffff',
        },
      ]
    ),
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
    specialItem: 'elephant_fruit',
    bio: [
      'Greedy powerhouse brawler built for rough track battles, towering brute torque, and explosive mid-pack overtakes.',
      'Signature Special Item: Elephant Fruit — triggers a massive shockwave pulse that knocks nearby rivals airborne cleanly off-line.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#eab308',
        secondaryColor: '#7e22ce',
        outfitColor: '#7e22ce',
        neonColor: '#fde047',
        accentColor: '#22c55e',
      },
      [
        {
          label: 'WarioWare',
          primaryColor: '#1d4ed8',
          secondaryColor: '#facc15',
          outfitColor: '#dc2626',
          neonColor: '#60a5fa',
          accentColor: '#fde047',
        },
        {
          label: 'Cowboy',
          primaryColor: '#92400e',
          secondaryColor: '#fde047',
          outfitColor: '#78350f',
          neonColor: '#fbbf24',
          accentColor: '#ef4444',
        },
        {
          label: 'Hiker',
          primaryColor: '#15803d',
          secondaryColor: '#f59e0b',
          outfitColor: '#422006',
          neonColor: '#4ade80',
          accentColor: '#fde047',
        },
        {
          label: 'Waluigi Swp',
          primaryColor: '#7e22ce',
          secondaryColor: '#facc15',
          outfitColor: '#1e1b4b',
          neonColor: '#c084fc',
          accentColor: '#fde047',
        },
      ]
    ),
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
    specialItem: 'blue_shell',
    bio: [
      'A long-limbed heavyweight interceptor famous across competitive lobbies for lethal late-lap tactics and razor slipstreaming.',
      'Signature Special Item: Spiny Blue Shell — locks onto the 1st-place race leader along the spline for a dramatic lead change.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#7e22ce',
        secondaryColor: '#1e1b4b',
        outfitColor: '#312e81',
        neonColor: '#a855f7',
        accentColor: '#facc15',
      },
      [
        {
          label: 'Bus Driver',
          primaryColor: '#1d4ed8',
          secondaryColor: '#f8fafc',
          outfitColor: '#0f172a',
          neonColor: '#38bdf8',
          accentColor: '#facc15',
        },
        {
          label: 'Vampire',
          primaryColor: '#991b1b',
          secondaryColor: '#0f172a',
          outfitColor: '#450a0a',
          neonColor: '#fb7185',
          accentColor: '#e2e8f0',
        },
        {
          label: 'Neon Violet',
          primaryColor: '#c026d3',
          secondaryColor: '#1e1b4b',
          outfitColor: '#701a75',
          neonColor: '#e879f9',
          accentColor: '#38bdf8',
        },
        {
          label: 'Gold Γ',
          primaryColor: '#eab308',
          secondaryColor: '#4c1d95',
          outfitColor: '#1e1b4b',
          neonColor: '#fde047',
          accentColor: '#c084fc',
        },
      ]
    ),
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
    specialItem: 'star',
    bio: [
      'Unstoppable heavyweight champion boasting the highest raw top speed in the entire paddock and crushing frame authority.',
      'Signature Special Item: Super Star — engulfs kart & driver in an invincible Rainbow Hologram Sphere with blisteringly fast speed.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#b91c1c',
        secondaryColor: '#f59e0b',
        outfitColor: '#15803d',
        neonColor: '#ff5500',
        accentColor: '#dc2626',
      },
      [
        {
          label: 'Dry Bowser',
          primaryColor: '#e2e8f0',
          secondaryColor: '#7c2d12',
          outfitColor: '#334155',
          neonColor: '#38bdf8',
          accentColor: '#f97316',
        },
        {
          label: 'Meowser',
          primaryColor: '#f59e0b',
          secondaryColor: '#1e293b',
          outfitColor: '#b45309',
          neonColor: '#fde047',
          accentColor: '#ef4444',
        },
        {
          label: 'Fury Black',
          primaryColor: '#0f172a',
          secondaryColor: '#ef4444',
          outfitColor: '#1e293b',
          neonColor: '#ff2e43',
          accentColor: '#f59e0b',
        },
        {
          label: 'Gold Koopa',
          primaryColor: '#eab308',
          secondaryColor: '#991b1b',
          outfitColor: '#a16207',
          neonColor: '#fde047',
          accentColor: '#ffffff',
        },
      ]
    ),
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
    specialItem: 'star',
    bio: [
      'Guest arcade icon bringing golden power-pellet energy, clean balanced steering, and classic chomp flair to the Grand Prix.',
      'Signature Special Item: Power Star — activates a shimmering Rainbow Hologram Sphere for unstoppable arcade rampages.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#facc15',
        secondaryColor: '#ef4444',
        outfitColor: '#dc2626',
        neonColor: '#fde047',
        accentColor: '#ffffff',
      },
      [
        {
          label: 'Neon Arcade',
          primaryColor: '#fde047',
          secondaryColor: '#0ea5e9',
          outfitColor: '#0284c7',
          neonColor: '#38bdf8',
          accentColor: '#ffffff',
        },
        {
          label: 'Ms. Style',
          primaryColor: '#fbbf24',
          secondaryColor: '#ec4899',
          outfitColor: '#db2777',
          neonColor: '#f472b6',
          accentColor: '#ffffff',
        },
        {
          label: 'Retro Dark',
          primaryColor: '#1e293b',
          secondaryColor: '#facc15',
          outfitColor: '#0f172a',
          neonColor: '#fde047',
          accentColor: '#ef4444',
        },
        {
          label: 'Cherry',
          primaryColor: '#ef4444',
          secondaryColor: '#facc15',
          outfitColor: '#b91c1c',
          neonColor: '#f87171',
          accentColor: '#22c55e',
        },
      ]
    ),
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
    specialItem: 'bee_mushroom',
    bio: [
      'Relentless arcade phantom who hugs tight inner corners and never lifts off the throttle when hunting P1.',
      'Signature Special Item: Bee Mushroom — hovers effortlessly above mud & off-road terrain while swarming forward at turbo pace.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#ef4444',
        secondaryColor: '#1e293b',
        outfitColor: '#b91c1c',
        neonColor: '#ff2e43',
        accentColor: '#38bdf8',
      },
      [
        {
          label: 'Inky',
          primaryColor: '#06b6d4',
          secondaryColor: '#0f172a',
          outfitColor: '#0e7490',
          neonColor: '#22d3ee',
          accentColor: '#ffffff',
        },
        {
          label: 'Pinky',
          primaryColor: '#f472b6',
          secondaryColor: '#1e1b4b',
          outfitColor: '#db2777',
          neonColor: '#f9a8d4',
          accentColor: '#ffffff',
        },
        {
          label: 'Clyde',
          primaryColor: '#f97316',
          secondaryColor: '#1e293b',
          outfitColor: '#c2410c',
          neonColor: '#fb923c',
          accentColor: '#fde047',
        },
        {
          label: 'Fright Blue',
          primaryColor: '#1d4ed8',
          secondaryColor: '#ffffff',
          outfitColor: '#1e3a8a',
          neonColor: '#60a5fa',
          accentColor: '#fde047',
        },
      ],
      'Blinky'
    ),
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
    specialItem: 'super_bell',
    bio: [
      'Festival drum spirit bringing rhythmic drift timing and joyous arcade festival energy straight to Shritiz Grand Prix.',
      'Signature Special Item: Super Bell — unleashes golden drum-beat turbo strikes that clear the path to the podium.',
    ],
    variants: makeVariants(
      {
        primaryColor: '#f97316',
        secondaryColor: '#fef3c7',
        outfitColor: '#2563eb',
        neonColor: '#38bdf8',
        accentColor: '#facc15',
      },
      [
        {
          label: 'Katsu-chan',
          primaryColor: '#0ea5e9',
          secondaryColor: '#f0f9ff',
          outfitColor: '#dc2626',
          neonColor: '#38bdf8',
          accentColor: '#fde047',
        },
        {
          label: 'Matsuri',
          primaryColor: '#ef4444',
          secondaryColor: '#fde047',
          outfitColor: '#0f172a',
          neonColor: '#f87171',
          accentColor: '#ffffff',
        },
        {
          label: 'Gold Drum',
          primaryColor: '#eab308',
          secondaryColor: '#fffbeb',
          outfitColor: '#b45309',
          neonColor: '#fde047',
          accentColor: '#ef4444',
        },
        {
          label: 'Sakura',
          primaryColor: '#f472b6',
          secondaryColor: '#fdf2f8',
          outfitColor: '#be185d',
          neonColor: '#f9a8d4',
          accentColor: '#fde047',
        },
      ]
    ),
    stats: { topSpeed: 68, acceleration: 92, handling: 89, weight: 49 },
    species: 'taiko',
  },
];

export function getRacerById(id: string): RacerSpec {
  return ROSTER.find((r) => r.id === id) ?? ROSTER[0];
}

export function getRacerWithVariant(
  id: string,
  variantId?: string
): RacerSpec & { activeVariant: RacerVariant } {
  const base = getRacerById(id);
  const activeVariant =
    (variantId ? base.variants.find((v) => v.id === variantId) : undefined) ?? base.variants[0];
  return {
    ...base,
    primaryColor: activeVariant.primaryColor,
    secondaryColor: activeVariant.secondaryColor,
    outfitColor: activeVariant.outfitColor,
    neonColor: activeVariant.neonColor,
    accentColor: activeVariant.accentColor,
    activeVariant,
  };
}
