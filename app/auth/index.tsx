import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { login, signUp } from '../../lib/auth';
import { setCurrentUser } from '../../lib/session';

export default function AuthScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [name, setName] = useState('');
	const [mode, setMode] = useState<'login' | 'signup'>('login');
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	function validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function validatePassword(password: string): { valid: boolean; message?: string } {
		if (password.length < 6) {
			return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
		}
		if (!/(?=.*[a-z])/.test(password)) {
			return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
		}
		if (!/(?=.*[A-Z])/.test(password)) {
			return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
		}
		if (!/(?=.*\d)/.test(password)) {
			return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
		}
		return { valid: true };
	}

	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};

		if (!email.trim()) {
			newErrors.email = 'L\'email est requis';
		} else if (!validateEmail(email)) {
			newErrors.email = 'Format d\'email invalide';
		}

		if (!password) {
			newErrors.password = 'Le mot de passe est requis';
		} else if (mode === 'signup') {
			const passwordValidation = validatePassword(password);
			if (!passwordValidation.valid) {
				newErrors.password = passwordValidation.message!;
			}
		}

		if (mode === 'signup') {
			if (!name.trim()) {
				newErrors.name = 'Le nom est requis';
			} else if (name.trim().length < 2) {
				newErrors.name = 'Le nom doit contenir au moins 2 caractères';
			}

			if (!confirmPassword) {
				newErrors.confirmPassword = 'Confirmez votre mot de passe';
			} else if (password !== confirmPassword) {
				newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	async function onSubmit() {
		if (!validateForm()) return;

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
		<KeyboardAvoidingView 
			style={styles.container} 
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
		>
			<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
				<Text style={styles.title}>TripFlow</Text>
				<Text style={styles.subtitle}>Organisez vos voyages en toute simplicité</Text>
				
				<View style={styles.card}>
					<Text style={styles.cardTitle}>{mode === 'login' ? 'Connexion' : 'Inscription'}</Text>
					
					{mode === 'signup' && (
						<>
							<TextInput
								style={[styles.input, errors.name && styles.inputError]}
								placeholder="Nom complet"
								value={name}
								onChangeText={(text) => {
									setName(text);
									if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
								}}
								autoCapitalize="words"
							/>
							{errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
						</>
					)}

					<TextInput
						style={[styles.input, errors.email && styles.inputError]}
						placeholder="Email"
						keyboardType="email-address"
						autoCapitalize="none"
						value={email}
						onChangeText={(text) => {
							setEmail(text);
							if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
						}}
					/>
					{errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

					<TextInput
						style={[styles.input, errors.password && styles.inputError]}
						placeholder="Mot de passe"
						secureTextEntry
						value={password}
						onChangeText={(text) => {
							setPassword(text);
							if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
						}}
					/>
					{errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

					{mode === 'signup' && (
						<>
							<TextInput
								style={[styles.input, errors.confirmPassword && styles.inputError]}
								placeholder="Confirmer le mot de passe"
								secureTextEntry
								value={confirmPassword}
								onChangeText={(text) => {
									setConfirmPassword(text);
									if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
								}}
							/>
							{errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
						</>
					)}

					<Pressable 
						style={[styles.button, loading && { opacity: 0.7 }]} 
						disabled={loading} 
						onPress={onSubmit}
					>
						<Text style={styles.buttonText}>
							{loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
						</Text>
					</Pressable>

					<Pressable 
						onPress={() => {
							setMode(mode === 'login' ? 'signup' : 'login');
							setErrors({});
							setName('');
							setConfirmPassword('');
						}}
						style={styles.switchButton}
					>
						<Text style={styles.switchText}>
							{mode === 'login' ? "Pas de compte ? Inscrivez-vous" : 'Déjà un compte ? Connectez-vous'}
						</Text>
					</Pressable>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0f172a',
	},
	scrollContainer: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: 24,
	},
	title: {
		fontSize: 42,
		fontWeight: '900',
		color: 'white',
		textAlign: 'center',
		marginBottom: 8,
		letterSpacing: -1,
	},
	subtitle: {
		fontSize: 16,
		color: '#94a3b8',
		textAlign: 'center',
		marginBottom: 32,
		fontWeight: '500',
	},
	card: {
		width: '100%',
		backgroundColor: 'white',
		borderRadius: 20,
		padding: 24,
		shadowColor: '#000',
		shadowOpacity: 0.15,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 10 },
		elevation: 8,
	},
	cardTitle: {
		fontSize: 24,
		fontWeight: '800',
		marginBottom: 20,
		textAlign: 'center',
		color: '#1e293b',
	},
	input: {
		borderWidth: 2,
		borderColor: '#e2e8f0',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		marginBottom: 8,
		fontSize: 16,
		backgroundColor: '#f8fafc',
	},
	inputError: {
		borderColor: '#ef4444',
		backgroundColor: '#fef2f2',
	},
	errorText: {
		color: '#ef4444',
		fontSize: 14,
		marginBottom: 12,
		fontWeight: '600',
	},
	button: {
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		marginTop: 8,
		shadowColor: '#2563eb',
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	buttonText: {
		color: 'white',
		fontWeight: '800',
		fontSize: 16,
	},
	switchButton: {
		marginTop: 16,
		paddingVertical: 8,
	},
	switchText: {
		textAlign: 'center',
		color: '#2563eb',
		fontWeight: '700',
		fontSize: 16,
	},
});



