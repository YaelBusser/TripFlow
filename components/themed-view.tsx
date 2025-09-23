import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedViewProps extends ViewProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  children: React.ReactNode;
}

export function ThemedView({ 
  variant = 'primary', 
  style, 
  children, 
  ...props 
}: ThemedViewProps) {
  const { themeColors } = useTheme();
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return themeColors.backgroundPrimary;
      case 'secondary':
        return themeColors.backgroundSecondary;
      case 'tertiary':
        return themeColors.backgroundTertiary;
      default:
        return themeColors.backgroundPrimary;
    }
  };

  return (
    <View 
      style={[{ backgroundColor: getBackgroundColor() }, style]} 
      {...props}
    >
      {children}
    </View>
  );
}