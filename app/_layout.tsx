import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomSplashScreen from '../components/SplashScreen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    if (loaded) {
      // Afficher le splash screen personnalisé pendant 3 secondes
      setTimeout(() => {
        setShowCustomSplash(false);
        SplashScreen.hideAsync();
      }, 3000);
    }
  }, [loaded]);

  if (!loaded || showCustomSplash) {
    return <CustomSplashScreen visible={true} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[tripId]/details" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[tripId]/map" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[tripId]/journal" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[tripId]/checklist" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}