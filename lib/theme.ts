import { colors } from './colors';

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  // Couleurs principales
  primary: string;
  secondary: string;
  accent: string;
  
  // Couleurs de texte
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  
  // Couleurs d'arrière-plan
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Couleurs de bordure
  borderLight: string;
  borderMedium: string;
  borderDark: string;
  
  // Couleurs d'état
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Couleurs d'ombre
  shadowLight: string;
  shadowMedium: string;
  shadowDark: string;
}

export const lightTheme: ThemeColors = {
  primary: colors.keppel,
  secondary: colors.cambridgeBlue,
  accent: colors.carrotOrange,
  
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textTertiary: colors.textTertiary,
  
  backgroundPrimary: colors.white,
  backgroundSecondary: colors.eggshell,
  backgroundTertiary: colors.backgroundTertiary,
  
  borderLight: colors.borderLight,
  borderMedium: colors.borderMedium,
  borderDark: colors.borderDark,
  
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  
  shadowLight: colors.shadowLight,
  shadowMedium: colors.shadowMedium,
  shadowDark: colors.shadowDark,
};

export const darkTheme: ThemeColors = {
  primary: colors.keppelLight,
  secondary: colors.cambridgeBlueLight,
  accent: colors.carrotOrangeLight,
  
  textPrimary: colors.white,
  textSecondary: '#E2E8F0',
  textTertiary: '#A0AEC0',
  
  backgroundPrimary: '#1A202C',
  backgroundSecondary: '#2D3748',
  backgroundTertiary: '#4A5568',
  
  borderLight: '#4A5568',
  borderMedium: '#718096',
  borderDark: '#A0AEC0',
  
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  
  shadowLight: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

export function getThemeColors(theme: Theme, systemTheme: 'light' | 'dark' = 'light'): ThemeColors {
  if (theme === 'auto') {
    return systemTheme === 'dark' ? darkTheme : lightTheme;
  }
  return theme === 'dark' ? darkTheme : lightTheme;
}
