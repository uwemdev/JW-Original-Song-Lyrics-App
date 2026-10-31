import React from 'react';
import {
  CloudRain,
  Zap,
  Smile,
  Hourglass,
  Users,
  Heart,
} from 'lucide-react-native';

/**
 * Returns a clean, professional SVG vector icon for each emotional mood category.
 */
export default function MoodIcon({ moodId, size = 16, color = '#FFFFFF', style }) {
  switch (moodId) {
    case 'comfort':
      return <CloudRain size={size} color={color} style={style} />;
    case 'strength':
      return <Zap size={size} color={color} style={style} />;
    case 'joy':
      return <Smile size={size} color={color} style={style} />;
    case 'patience':
      return <Hourglass size={size} color={color} style={style} />;
    case 'kids':
      return <Users size={size} color={color} style={style} />;
    default:
      return <Heart size={size} color={color} style={style} />;
  }
}
