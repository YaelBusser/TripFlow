import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../lib/colors';

interface SplashScreenProps {
  visible: boolean;
}

export default function CustomSplashScreen({ visible }: SplashScreenProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/splash-screen.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(47, 182, 161, 0.9)', // Keppel avec transparence
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    shadowColor: colors.shadowDark,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
