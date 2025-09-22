import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../lib/colors';

interface LocationIconProps {
  size?: number;
  color?: string;
}

export default function LocationIcon({ size = 16, color = colors.keppel }: LocationIconProps) {
  const scale = size / 16;
  
  return (
    <View style={[styles.container, { transform: [{ scale }] }]}>
      {/* Forme principale de l'épingle */}
      <View style={[styles.pin, { backgroundColor: color }]}>
        {/* Cercle blanc au centre */}
        <View style={styles.center} />
      </View>
      {/* Pointe vers le bas */}
      <View style={[styles.point, { borderTopColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 16,
    height: 20,
    alignItems: 'center',
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  point: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.keppel,
    marginTop: -1,
  },
});
