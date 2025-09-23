import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser, isSessionValid } from '../lib/session';

export default function Index() {
	const { themeColors } = useTheme();
	const [ready, setReady] = useState(false);
	const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

	useEffect(() => {
		(async () => {
			try {
				// Vérifier d'abord si la session est valide
				const isValid = await isSessionValid();
				if (!isValid) {
					setLoggedIn(false);
					setReady(true);
					return;
				}

				// Si la session est valide, récupérer l'utilisateur
				const user = await getCurrentUser();
				setLoggedIn(!!user);
			} catch (error) {
				console.error('Erreur lors de la vérification de la session:', error);
				setLoggedIn(false);
			} finally {
				setReady(true);
			}
		})();
	}, []);

	if (!ready) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
				{/* Optionnel: ajouter un indicateur de chargement */}
			</View>
		);
	}
	if (!loggedIn) return <Redirect href="/auth" />;
	return <Redirect href="/(tabs)/explore" />;
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
});



