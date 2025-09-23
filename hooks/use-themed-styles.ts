import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function useThemedStyles<T extends Record<string, any>>(
  createStyles: (themeColors: any) => T
): T {
  const { themeColors } = useTheme();
  return StyleSheet.create(createStyles(themeColors));
}
