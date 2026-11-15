// WhatsApp-style Chat Themes for Community Chat & Messaging
// Pairs vibrant outgoing bubble colors with distinct, high-contrast atmospheric background gradients

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
    subtitle: 'Signature purple & starry heavens',
    category: 'Featured',
    bubbleColor: '#7C3AED',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#581C87', '#3B0764', '#1E1B4B'],
    lightGradient: ['#EDE9FE', '#DDD6FE', '#C4B5FD'],
    previewColors: ['#7C3AED', '#581C87'],
  },
  {
    id: 'ocean_blue',
    name: 'Ocean Blue',
    subtitle: 'Deep azure sea & rolling surf',
    category: 'Featured',
    bubbleColor: '#0284C7',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#0284C7', '#0369A1', '#0C4A6E'],
    lightGradient: ['#E0F2FE', '#BAE6FD', '#7DD3FC'],
    previewColors: ['#0284C7', '#0369A1'],
  },
  {
    id: 'aurora_teal',
    name: 'Northern Aurora',
    subtitle: 'Mystic emerald & turquoise glow',
    category: 'Featured',
    bubbleColor: '#0D9488',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#0D9488', '#0F766E', '#115E59'],
    lightGradient: ['#CCFBF1', '#99F6E4', '#5EEAD4'],
    previewColors: ['#0D9488', '#0F766E'],
  },
  {
    id: 'royal_amethyst',
    name: 'Royal Violet',
    subtitle: 'Deep twilight & harmonic notes',
    category: 'Featured',
    bubbleColor: '#9333EA',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#9333EA', '#7E22CE', '#581C87'],
    lightGradient: ['#F3E8FF', '#E9D5FF', '#D8B4FE'],
    previewColors: ['#9333EA', '#7E22CE'],
  },

  // ── NATURE & LANDSCAPES ──
  {
    id: 'tropical_palms',
    name: 'Tropical Palms',
    subtitle: 'Swaying palms & azure breeze',
    category: 'Nature & Landscapes',
    bubbleColor: '#0284C7',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#0284C7', '#0F766E', '#064E3B'],
    lightGradient: ['#E0F2FE', '#CCFBF1', '#A7F3D0'],
    previewColors: ['#0284C7', '#0F766E'],
  },
  {
    id: 'desert_dusk',
    name: 'Desert Dunes',
    subtitle: 'Golden desert dunes & sunset',
    category: 'Nature & Landscapes',
    bubbleColor: '#EA580C',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#EA580C', '#C2410C', '#7C2D12'],
    lightGradient: ['#FFEDD5', '#FED7AA', '#FDBA74'],
    previewColors: ['#EA580C', '#C2410C'],
  },
  {
    id: 'mountain_dawn',
    name: 'Alpine Twilight',
    subtitle: 'Misty mountain ridges & dusk',
    category: 'Nature & Landscapes',
    bubbleColor: '#4F46E5',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#4F46E5', '#4338CA', '#312E81'],
    lightGradient: ['#E0E7FF', '#C7D2FE', '#A5B4FC'],
    previewColors: ['#4F46E5', '#4338CA'],
  },
  {
    id: 'emerald_forest',
    name: 'Lush Forest',
    subtitle: 'Sunbeams & peaceful leaves',
    category: 'Nature & Landscapes',
    bubbleColor: '#16A34A',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#16A34A', '#15803D', '#14532D'],
    lightGradient: ['#DCFCE7', '#BBF7D0', '#86EFAC'],
    previewColors: ['#16A34A', '#15803D'],
  },
  {
    id: 'golden_sunset',
    name: 'Golden Sunset',
    subtitle: 'Warm evening coral & amber dusk',
    category: 'Nature & Landscapes',
    bubbleColor: '#D97706',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#D97706', '#B45309', '#78350F'],
    lightGradient: ['#FEF3C7', '#FDE68A', '#FCD34D'],
    previewColors: ['#D97706', '#B45309'],
  },

  // ── ATMOSPHERIC GRADIENTS ──
  {
    id: 'midnight_indigo',
    name: 'Midnight Galaxy',
    subtitle: 'Milky way & cosmic starlight',
    category: 'Atmospheric Gradients',
    bubbleColor: '#6366F1',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#6366F1', '#4F46E5', '#1E1B4B'],
    lightGradient: ['#E0E7FF', '#C7D2FE', '#A5B4FC'],
    previewColors: ['#6366F1', '#4F46E5'],
  },
  {
    id: 'crimson_rose',
    name: 'Crimson Rose',
    subtitle: 'Velvet ruby petals in soft light',
    category: 'Atmospheric Gradients',
    bubbleColor: '#E11D48',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#E11D48', '#BE123C', '#881337'],
    lightGradient: ['#FFE4E6', '#FECDD3', '#FDA4AF'],
    previewColors: ['#E11D48', '#BE123C'],
  },
  {
    id: 'living_waters',
    name: 'Living Waters',
    subtitle: 'Crystal turquoise sea ripples',
    category: 'Atmospheric Gradients',
    bubbleColor: '#0891B2',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#0891B2', '#0E7490', '#164E63'],
    lightGradient: ['#CFFAFE', '#A5F3FC', '#67E8F9'],
    previewColors: ['#0891B2', '#0E7490'],
  },
  {
    id: 'pink_flamingo',
    name: 'Flamingo Bloom',
    subtitle: 'Spring cherry blossom petals',
    category: 'Atmospheric Gradients',
    bubbleColor: '#DB2777',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#DB2777', '#BE185D', '#831843'],
    lightGradient: ['#FCE7F3', '#FBCFE8', '#F472B6'],
    previewColors: ['#DB2777', '#BE185D'],
  },
  {
    id: 'lavender_mist',
    name: 'Lavender Peace',
    subtitle: 'Serene violet lavender field',
    category: 'Atmospheric Gradients',
    bubbleColor: '#A855F7',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#A855F7', '#9333EA', '#581C87'],
    lightGradient: ['#F3E8FF', '#E9D5FF', '#D8B4FE'],
    previewColors: ['#A855F7', '#9333EA'],
  },

  // ── CLASSIC & SOLIDS ──
  {
    id: 'carbon_slate',
    name: 'Carbon Slate',
    subtitle: 'Natural dark stone architecture',
    category: 'Classic & Solids',
    bubbleColor: '#475569',
    bubbleTextColor: '#FFFFFF',
    darkGradient: ['#475569', '#334155', '#1E293B'],
    lightGradient: ['#F1F5F9', '#E2E8F0', '#CBD5E1'],
    previewColors: ['#475569', '#334155'],
  },
  {
    id: 'pitch_black',
    name: 'OLED Pure Black',
    subtitle: 'Pure dark minimalism & purple',
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
  geometric: 'desert_dusk',
  aurora: 'aurora_teal',
  parchment: 'desert_dusk',
  midnight: 'midnight_indigo',
  golden: 'golden_sunset',
  emerald: 'living_waters',
  minimal_grid: 'carbon_slate',
  spheres: 'tropical_palms',
  mountains: 'mountain_dawn',
  vinyl: 'carbon_slate',
  lavender: 'lavender_mist',
  honey_amber: 'golden_sunset',
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
