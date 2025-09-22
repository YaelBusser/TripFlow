import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/colors';
import { clearSession, getCurrentUser } from '../../lib/session';

export default function ProfileScreen() {
	const [email, setEmail] = useState('');

	useEffect(() => {
		(async () => {
			const u = await getCurrentUser();
			if (u) setEmail(u.email);
		})();
	}, []);

	async function logout() {
		await clearSession();
		router.replace('/auth');
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.profileHeader}>
				<Image 
					source={require('../../assets/images/icon.png')} 
					style={styles.profileIcon}
				/>
				<Text style={styles.title}>Mon profil</Text>
				<Text style={styles.subtitle}>{email}</Text>
			</View>
			<Pressable style={styles.logout} onPress={logout}>
				<Text style={styles.logoutText}>Se déconnecter</Text>
			</Pressable>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		justifyContent: 'center', 
		alignItems: 'center',
		backgroundColor: colors.backgroundSecondary,
		padding: 20,
	},
	profileHeader: {
		alignItems: 'center',
		marginBottom: 40,
	},
	profileIcon: {
		width: 80,
		height: 80,
		borderRadius: 40,
		marginBottom: 16,
		shadowColor: colors.shadowMedium,
		shadowOpacity: 1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	title: { 
		fontSize: 28, 
		fontWeight: '900', 
		marginBottom: 8,
		color: colors.textPrimary,
	},
	subtitle: { 
		color: colors.textSecondary, 
		fontSize: 16,
		fontWeight: '500',
	},
	logout: { 
		backgroundColor: colors.error, 
		borderRadius: 12, 
		paddingHorizontal: 24, 
		paddingVertical: 16,
		shadowColor: colors.error,
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	logoutText: { 
		color: colors.white, 
		fontWeight: '800',
		fontSize: 16,
	},
});


