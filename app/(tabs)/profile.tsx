import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, setCurrentUser } from '../../lib/session';

export default function ProfileScreen() {
	const [email, setEmail] = useState('');

	useEffect(() => {
		(async () => {
			const u = await getCurrentUser();
			if (u) setEmail(u.email);
		})();
	}, []);

	async function logout() {
		await setCurrentUser(null);
		router.replace('/auth');
	}

	return (
		<SafeAreaView style={styles.container}>
			<Text style={styles.title}>Mon profil</Text>
			<Text style={styles.subtitle}>{email}</Text>
			<Pressable style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Se déconnecter</Text></Pressable>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	title: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
	subtitle: { color: '#64748b', marginBottom: 20 },
	logout: { backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
	logoutText: { color: 'white', fontWeight: '800' },
});


