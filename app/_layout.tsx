import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '../hooks/use-color-scheme';

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<SafeAreaProvider>
			<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="auth/index" />
					<Stack.Screen name="(tabs)" />
					<Stack.Screen name="trip/[tripId]/details" />
					<Stack.Screen name="trip/[tripId]/map" />
					<Stack.Screen name="trip/[tripId]/journal" />
					<Stack.Screen name="trip/[tripId]/checklist" />
				</Stack>
				<StatusBar style="auto" />
			</ThemeProvider>
		</SafeAreaProvider>
	);
}
