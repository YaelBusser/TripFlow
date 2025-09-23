import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedTextProps extends TextProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  children: React.ReactNode;
}

export function ThemedText({ 
  variant = 'primary', 
  style, 
  children, 
  ...props 
}: ThemedTextProps) {
  const { themeColors } = useTheme();
  
  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return themeColors.textPrimary;
      case 'secondary':
        return themeColors.textSecondary;
      case 'tertiary':
        return themeColors.textTertiary;
      default:
        return themeColors.textPrimary;
    }
  };

  return (
    <Text 
      style={[{ color: getTextColor() }, style]} 
      {...props}
    >
      {children}
    </Text>
  );
}