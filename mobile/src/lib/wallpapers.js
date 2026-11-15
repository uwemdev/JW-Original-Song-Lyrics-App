// WhatsApp-style Chat Themes for Community Chat & Messaging
// Pairs vibrant outgoing bubble colors with beautiful atmospheric background gradients

export const THEME_CATEGORIES = [
  'Featured',
  'Nature & Landscapes',
  'Atmospheric Gradients',
  'Classic & Solids',
];

export const WALLPAPERS = [
  // ── FEATURED ──
  {
    id: 'default',
    name: 'Classic Royal',
    subtitle: 'Signature purple theme',
    category: 'Featured',
    bubbleColor: '#7C3AED',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#180D2B', '#0F071C'],
    lightGradient: ['#F5F3FF', '#EDE9FE'],
    previewColors: ['#7C3AED', '#180D2B'],
  },
  {
    id: 'ocean_blue',
    name: 'Ocean Blue',
    subtitle: 'Electric sky & deep oceanic navy',
    category: 'Featured',
    bubbleColor: '#0284C7',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#0C2540', '#03101C'],
    lightGradient: ['#F0F9FF', '#E0F2FE'],
    previewColors: ['#0284C7', '#0C2540'],
  },
  {
    id: 'aurora_teal',
    name: 'Northern Aurora',
    subtitle: 'Vibrant turquoise & mystic emerald',
    category: 'Featured',
    bubbleColor: '#0D9488',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#072D2B', '#021413'],
    lightGradient: ['#F0FDFA', '#CCFBF1'],
    previewColors: ['#0D9488', '#072D2B'],
  },
  {
    id: 'royal_amethyst',
    name: 'Royal Violet',
    subtitle: 'Bright amethyst & deep twilight',
    category: 'Featured',
    bubbleColor: '#9333EA',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#250E38', '#0F0417'],
    lightGradient: ['#FAF5FF', '#F3E8FF'],
    previewColors: ['#9333EA', '#250E38'],
  },

  // ── NATURE & LANDSCAPES ──
  {
    id: 'emerald_forest',
    name: 'Lush Forest',
    subtitle: 'Fresh forest green & deep canopy',
    category: 'Nature & Landscapes',
    bubbleColor: '#16A34A',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#0B2B16', '#041409'],
    lightGradient: ['#F0FDF4', '#DCFCE7'],
    previewColors: ['#16A34A', '#0B2B16'],
  },
  {
    id: 'golden_sunset',
    name: 'Golden Sunset',
    subtitle: 'Warm evening coral & amber dusk',
    category: 'Nature & Landscapes',
    bubbleColor: '#EA580C',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#361706', '#170802'],
    lightGradient: ['#FFF7ED', '#FFEDD5'],
    previewColors: ['#EA580C', '#361706'],
  },
  {
    id: 'mountain_dawn',
    name: 'Alpine Twilight',
    subtitle: 'Twilight indigo & alpine ridges',
    category: 'Nature & Landscapes',
    bubbleColor: '#4F46E5',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#161A3D', '#080A1C'],
    lightGradient: ['#EEF2FF', '#E0E7FF'],
    previewColors: ['#4F46E5', '#161A3D'],
  },
  {
    id: 'desert_dusk',
    name: 'Desert Canyon',
    subtitle: 'Terracotta & warm canyon dusk',
    category: 'Nature & Landscapes',
    bubbleColor: '#C2410C',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#30150B', '#140703'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    previewColors: ['#C2410C', '#30150B'],
  },

  // ── ATMOSPHERIC GRADIENTS ──
  {
    id: 'midnight_indigo',
    name: 'Midnight Galaxy',
    subtitle: 'Cosmic periwinkle & midnight sky',
    category: 'Atmospheric Gradients',
    bubbleColor: '#6366F1',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#18123B', '#09061A'],
    lightGradient: ['#EEF2FF', '#E0E7FF'],
    previewColors: ['#6366F1', '#18123B'],
  },
  {
    id: 'crimson_rose',
    name: 'Crimson Rose',
    subtitle: 'Vibrant crimson & deep ruby wine',
    category: 'Atmospheric Gradients',
    bubbleColor: '#E11D48',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#330A18', '#140208'],
    lightGradient: ['#FFF1F2', '#FFE4E6'],
    previewColors: ['#E11D48', '#330A18'],
  },
  {
    id: 'living_waters',
    name: 'Living Waters',
    subtitle: 'Deep ocean cyan & cobalt sea',
    category: 'Atmospheric Gradients',
    bubbleColor: '#0891B2',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#082633', '#021017'],
    lightGradient: ['#ECFEFF', '#CFFAFE'],
    previewColors: ['#0891B2', '#082633'],
  },
  {
    id: 'pink_flamingo',
    name: 'Flamingo Bloom',
    subtitle: 'Hot magenta pink & twilight bloom',
    category: 'Atmospheric Gradients',
    bubbleColor: '#DB2777',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#330C26', '#14030E'],
    lightGradient: ['#FDF2F8', '#FCE7F3'],
    previewColors: ['#DB2777', '#330C26'],
  },
  {
    id: 'honey_amber',
    name: 'Honey Amber',
    subtitle: 'Golden honey & warm bronze',
    category: 'Atmospheric Gradients',
    bubbleColor: '#D97706',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#301E06', '#140B01'],
    lightGradient: ['#FFFBEB', '#FEF3C7'],
    previewColors: ['#D97706', '#301E06'],
  },
  {
    id: 'lavender_mist',
    name: 'Lavender Peace',
    subtitle: 'Soft orchid & serene violet mist',
    category: 'Atmospheric Gradients',
    bubbleColor: '#A855F7',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#211033', '#0E0517'],
    lightGradient: ['#FAF5FF', '#F3E8FF'],
    previewColors: ['#A855F7', '#211033'],
  },

  // ── CLASSIC & SOLIDS ──
  {
    id: 'carbon_slate',
    name: 'Carbon Slate',
    subtitle: 'Refined graphite & cool steel',
    category: 'Classic & Solids',
    bubbleColor: '#475569',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#1A2230', '#0B0F17'],
    lightGradient: ['#F8FAFC', '#E2E8F0'],
    previewColors: ['#475569', '#1A2230'],
  },
  {
    id: 'pitch_black',
    name: 'OLED Pure Black',
    subtitle: 'Deep pure black & vivid purple',
    category: 'Classic & Solids',
    bubbleColor: '#7C3AED',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#000000', '#000000'],
    lightGradient: ['#FFFFFF', '#F8FAFC'],
    previewColors: ['#7C3AED', '#000000'],
  },
];

const LEGACY_ID_MAP = {
  melody: 'royal_amethyst',
  stardust: 'ocean_blue',
  acoustic: 'crimson_rose',
  botanical: 'emerald_forest',
  geometric: 'honey_amber',
  aurora: 'aurora_teal',
  parchment: 'desert_dusk',
  midnight: 'midnight_indigo',
  golden: 'golden_sunset',
  emerald: 'living_waters',
  minimal_grid: 'carbon_slate',
  spheres: 'ocean_blue',
  mountains: 'mountain_dawn',
  vinyl: 'carbon_slate',
  lavender: 'lavender_mist',
};

export function getWallpaperById(id) {
  if (!id) return WALLPAPERS[0];
  const targetId = LEGACY_ID_MAP[id] || id;
  return WALLPAPERS.find((w) => w.id === targetId) || WALLPAPERS[0];
}

export function getWallpaperName(id) {
  const w = getWallpaperById(id);
  return w?.name || 'Classic Royal';
}
