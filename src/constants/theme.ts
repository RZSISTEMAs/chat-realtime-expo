import { Platform } from 'react-native';

export const COLORS = {
  background: '#0D0E15',      // Deep dark blue/black
  surface: '#1A1C29',         // Slightly lighter for cards
  primary: '#00D084',         // Vibrant Neon Green (WhatsApp inspiration but neon)
  primaryGradient: ['#00E5FF', '#00D084'] as const,
  secondary: '#73788B',       // Mute text
  text: '#FFFFFF',            // Main text
  textMuted: '#A0A3B1',       // Secondary text
  border: '#2C2F40',          // Subtle dividers
  glassBg: 'rgba(26, 28, 41, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.1)'
};

export const SIZES = {
  padding: 20,
  radius: 16,
  largeRadius: 32,
  fontLarge: 28,
  fontMedium: 18,
  fontSmall: 14,
};

// Utilizado para preencher as sombras no app
export const SHADOWS = {
  primary: Platform.select({
    web: { boxShadow: `0 10px 20px -5px ${COLORS.primary}` },
    default: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    }
  }),
  glass: Platform.select({
    web: { boxShadow: '0 4px 10px rgba(0,0,0,0.2)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    }
  }),
  medium: Platform.select({
    web: { boxShadow: '0 8px 30px rgba(0,0,0,0.3)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 10,
    }
  }),
  bold: Platform.select({
    web: { boxShadow: '0 15px 45px rgba(168, 85, 247, 0.4)' },
    default: {
      shadowColor: '#a855f7',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 20,
    }
  })
};

export const Fonts = {
  mono: 'SpaceMono', // Fallback
};

export type ThemeColor = keyof typeof COLORS;
