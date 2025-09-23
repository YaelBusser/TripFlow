import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { login, signUp } from '../../lib/auth';
import { setCurrentUser } from '../../lib/session';

export default function AuthScreen() {
	const { themeColors } = useTheme();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [name, setName] = useState('');
	const [mode, setMode] = useState<'login' | 'signup'>('login');
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
			const user = mode === 'login' 
				? await action(email, password)
				: await action(email, password, name);
			await setCurrentUser(user.id);
			router.replace('/');
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Une erreur est survenue');
		} finally {
			setLoading(false);
		}
	}

	const dynamicStyles = StyleSheet.create({
		container: {
			flex: 1,
		},
		keyboardContainer: {
			flex: 1,
			backgroundColor: 'rgba(47, 182, 161, 0.9)', // Keppel avec transparence
		},
		scrollContainer: {
			flexGrow: 1,
			justifyContent: 'center',
			padding: 24,
		},
		logoContainer: {
			alignItems: 'center',
			marginBottom: 16,
		},
		logo: {
			width: 80,
			height: 80,
			borderRadius: 40,
			marginBottom: 12,
			shadowColor: themeColors.shadowMedium,
			shadowOpacity: 1,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
			elevation: 4,
		},
		title: {
			fontSize: 42,
			fontWeight: '900',
			color: themeColors.backgroundPrimary,
			textAlign: 'center',
			marginBottom: 8,
			letterSpacing: -1,
		},
		subtitle: {
			fontSize: 16,
			color: '#F8F1DD', // eggshell color
			textAlign: 'center',
			marginBottom: 32,
			fontWeight: '500',
		},
		card: {
			width: '100%',
			backgroundColor: themeColors.backgroundPrimary,
			borderRadius: 20,
			padding: 24,
			shadowColor: themeColors.shadowDark,
			shadowOpacity: 1,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 10 },
			elevation: 8,
		},
		cardTitle: {
			fontSize: 24,
			fontWeight: '800',
			marginBottom: 20,
			textAlign: 'center',
			color: themeColors.textPrimary,
		},
		input: {
			borderWidth: 2,
			borderColor: themeColors.borderLight,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 14,
			marginBottom: 8,
			fontSize: 16,
			backgroundColor: themeColors.backgroundSecondary,
			color: themeColors.textPrimary,
		},
		inputError: {
			borderColor: themeColors.error,
			backgroundColor: '#fef2f2',
		},
		errorText: {
			color: themeColors.error,
			fontSize: 14,
			marginBottom: 12,
			fontWeight: '600',
		},
		button: {
			backgroundColor: themeColors.primary,
			borderRadius: 12,
			paddingVertical: 16,
			alignItems: 'center',
			marginTop: 8,
			shadowColor: themeColors.primary,
			shadowOpacity: 0.3,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
			elevation: 4,
		},
		buttonText: {
			color: themeColors.backgroundPrimary,
			fontWeight: '800',
			fontSize: 16,
		},
		switchButton: {
			marginTop: 16,
			paddingVertical: 8,
		},
		switchText: {
			textAlign: 'center',
			color: themeColors.secondary,
			fontWeight: '700',
			fontSize: 16,
		},
	});

	return (
		<ImageBackground 
			source={require('../../assets/images/splash-screen.png')} 
			style={dynamicStyles.container}
			resizeMode="cover"
		>
			<KeyboardAvoidingView 
				style={dynamicStyles.keyboardContainer} 
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView contentContainerStyle={dynamicStyles.scrollContainer} showsVerticalScrollIndicator={false}>
					<View style={dynamicStyles.logoContainer}>
						<Image 
							source={require('../../assets/images/icon.png')} 
							style={dynamicStyles.logo}
						/>
						<Text style={dynamicStyles.title}>TripFlow</Text>
					</View>
					<Text style={dynamicStyles.subtitle}>Organisez vos voyages en toute simplicité</Text>
				
				<View style={dynamicStyles.card}>
					<Text style={dynamicStyles.cardTitle}>{mode === 'login' ? 'Connexion' : 'Inscription'}</Text>
					
					{mode === 'signup' && (
						<>
							<TextInput
								style={[dynamicStyles.input, errors.name && dynamicStyles.inputError]}
								placeholder="Nom complet"
								placeholderTextColor={themeColors.textTertiary}
								value={name}
								onChangeText={(text) => {
									setName(text);
									if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
								}}
								autoCapitalize="words"
							/>
							{errors.name && <Text style={dynamicStyles.errorText}>{errors.name}</Text>}
						</>
					)}

					<TextInput
						style={[dynamicStyles.input, errors.email && dynamicStyles.inputError]}
						placeholder="Email"
						placeholderTextColor={themeColors.textTertiary}
						keyboardType="email-address"
						autoCapitalize="none"
						value={email}
						onChangeText={(text) => {
							setEmail(text);
							if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
						}}
					/>
					{errors.email && <Text style={dynamicStyles.errorText}>{errors.email}</Text>}

					<View style={styles.passwordContainer}>
						<TextInput
							style={[dynamicStyles.input, styles.passwordInput, errors.password && dynamicStyles.inputError]}
							placeholder="Mot de passe"
							placeholderTextColor={themeColors.textTertiary}
							secureTextEntry={!showPassword}
							value={password}
							onChangeText={(text) => {
								setPassword(text);
								if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
							}}
						/>
						<Pressable 
							style={styles.eyeButton}
							onPress={() => setShowPassword(!showPassword)}
						>
							<MaterialCommunityIcons 
								name={showPassword ? "eye-off" : "eye"} 
								size={20} 
								color="#64748b" 
							/>
						</Pressable>
					</View>
					{errors.password && <Text style={dynamicStyles.errorText}>{errors.password}</Text>}

					{mode === 'signup' && (
						<>
							<View style={styles.passwordContainer}>
								<TextInput
									style={[dynamicStyles.input, styles.passwordInput, errors.confirmPassword && dynamicStyles.inputError]}
									placeholder="Confirmer le mot de passe"
									secureTextEntry={!showConfirmPassword}
									value={confirmPassword}
									onChangeText={(text) => {
										setConfirmPassword(text);
										if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
									}}
								/>
								<Pressable 
									style={styles.eyeButton}
									onPress={() => setShowConfirmPassword(!showConfirmPassword)}
								>
									<MaterialCommunityIcons 
										name={showConfirmPassword ? "eye-off" : "eye"} 
										size={20} 
										color="#64748b" 
									/>
								</Pressable>
							</View>
							{errors.confirmPassword && <Text style={dynamicStyles.errorText}>{errors.confirmPassword}</Text>}
						</>
					)}

					<Pressable 
						style={[dynamicStyles.button, loading && { opacity: 0.7 }]} 
						disabled={loading} 
						onPress={onSubmit}
					>
						<Text style={dynamicStyles.buttonText}>
							{loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
						</Text>
					</Pressable>

					<Pressable 
						onPress={() => {
							setMode(mode === 'login' ? 'signup' : 'login');
							setErrors({});
							setName('');
							setConfirmPassword('');
							setShowPassword(false);
							setShowConfirmPassword(false);
						}}
						style={dynamicStyles.switchButton}
					>
						<Text style={dynamicStyles.switchText}>
							{mode === 'login' ? "Pas de compte ? Inscrivez-vous" : 'Déjà un compte ? Connectez-vous'}
						</Text>
					</Pressable>
				</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	passwordContainer: {
		position: 'relative',
		marginBottom: 8,
	},
	passwordInput: {
		paddingRight: 50,
		marginBottom: 0,
	},
	eyeButton: {
		position: 'absolute',
		right: 16,
		top: 14,
		padding: 4,
	},
});



