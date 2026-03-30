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
  primary: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  }
};

export const Fonts = {
  mono: 'SpaceMono', // Fallback
};

export type ThemeColor = keyof typeof COLORS;
