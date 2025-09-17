import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { login, signUp } from '../../lib/auth';
import { setCurrentUser } from '../../lib/session';

export default function AuthScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [mode, setMode] = useState<'login' | 'signup'>('login');
	const [loading, setLoading] = useState(false);

	async function onSubmit() {
		try {
			setLoading(true);
			const action = mode === 'login' ? login : signUp;
			const user = await action(email, password);
			await setCurrentUser(user.id);
			router.replace('/');
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Une erreur est survenue');
		} finally {
			setLoading(false);
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>TripFlow</Text>
			<View style={styles.card}>
				<Text style={styles.cardTitle}>{mode === 'login' ? 'Connexion' : 'Inscription'}</Text>
				<TextInput
					style={styles.input}
					placeholder="Email"
					keyboardType="email-address"
					autoCapitalize="none"
					value={email}
					onChangeText={setEmail}
				/>
				<TextInput
					style={styles.input}
					placeholder="Mot de passe"
					secureTextEntry
					value={password}
					onChangeText={setPassword}
				/>
				<Pressable style={[styles.button, loading && { opacity: 0.7 }]} disabled={loading} onPress={onSubmit}>
					<Text style={styles.buttonText}>{mode === 'login' ? 'Se connecter' : "S'inscrire"}</Text>
				</Pressable>
				<Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
					<Text style={styles.switchText}>
						{mode === 'login' ? "Pas de compte ? Inscrivez-vous" : 'Déjà un compte ? Connectez-vous'}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		backgroundColor: '#0f172a',
	},
	title: {
		fontSize: 36,
		fontWeight: '800',
		color: 'white',
		marginBottom: 16,
	},
	card: {
		width: '100%',
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 20,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 4,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 12,
	},
	button: {
		backgroundColor: '#2563eb',
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 4,
	},
	buttonText: {
		color: 'white',
		fontWeight: '700',
	},
	switchText: {
		textAlign: 'center',
		marginTop: 12,
		color: '#334155',
		fontWeight: '600',
	},
});



