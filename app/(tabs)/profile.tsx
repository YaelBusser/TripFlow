import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { updateUserProfile } from '../../lib/auth';
import { clearSession, getCurrentUser } from '../../lib/session';
import { listTrips } from '../../lib/trips';

const { width } = Dimensions.get('window');

interface UserStats {
	totalTrips: number;
	completedTrips: number;
	totalSteps: number;
	daysTraveled: number;
}

export default function ProfileScreen() {
	const { theme, themeColors, setTheme, isDark } = useTheme();
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
	const [userStats, setUserStats] = useState<UserStats>({
		totalTrips: 0,
		completedTrips: 0,
		totalSteps: 0,
		daysTraveled: 0
	});
	const [loading, setLoading] = useState(true);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showThemeModal, setShowThemeModal] = useState(false);
	const [editName, setEditName] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [editProfilePhoto, setEditProfilePhoto] = useState<string | null>(null);

	useEffect(() => {
		loadUserData();
	}, []);

	async function loadUserData() {
		try {
			const user = await getCurrentUser();
			if (user) {
				setEmail(user.email);
				setName(user.name || '');
				setProfilePhotoUri(user.profile_photo_uri || null);
				await loadUserStats(user.id);
			}
		} catch (error) {
			console.error('Erreur lors du chargement des données utilisateur:', error);
		} finally {
			setLoading(false);
		}
	}

	async function loadUserStats(userId: number) {
		try {
			const trips = await listTrips(userId);
			const now = Date.now();
			
			const stats: UserStats = {
				totalTrips: trips.length,
				completedTrips: trips.filter(trip => trip.end_date && trip.end_date < now).length,
				totalSteps: 0, // À calculer si nécessaire
				daysTraveled: trips.reduce((total, trip) => {
					if (trip.start_date && trip.end_date) {
						return total + Math.ceil((trip.end_date - trip.start_date) / (1000 * 60 * 60 * 24));
					}
					return total;
				}, 0)
			};
			
			setUserStats(stats);
		} catch (error) {
			console.error('Erreur lors du chargement des statistiques:', error);
		}
	}

	async function handleLogout() {
		Alert.alert(
			'Déconnexion',
			'Êtes-vous sûr de vouloir vous déconnecter ?',
			[
				{ text: 'Annuler', style: 'cancel' },
				{ 
					text: 'Déconnexion', 
					style: 'destructive',
					onPress: async () => {
		await clearSession();
		router.replace('/auth');
					}
				}
			]
		);
	}

	async function handleEditProfile() {
		const user = await getCurrentUser();
		if (user) {
			setEditName(user.name || '');
			setEditEmail(user.email);
			setEditProfilePhoto(user.profile_photo_uri || null);
			setShowEditModal(true);
		}
	}

	async function saveProfile() {
		try {
			const user = await getCurrentUser();
			if (!user) return;

			const updates: { name?: string; email?: string; profile_photo_uri?: string | null } = {};
			if (editName !== name) updates.name = editName;
			if (editEmail !== email) updates.email = editEmail;
			if (editProfilePhoto !== profilePhotoUri) updates.profile_photo_uri = editProfilePhoto;

			if (Object.keys(updates).length === 0) {
				setShowEditModal(false);
				return;
			}

			await updateUserProfile(user.id, updates);
			await loadUserData();
			setShowEditModal(false);
			Alert.alert('Succès', 'Profil mis à jour avec succès');
		} catch (error: any) {
			Alert.alert('Erreur', error.message || 'Erreur lors de la mise à jour du profil');
		}
	}

	function handleThemeChange(newTheme: 'light' | 'dark' | 'auto') {
		setTheme(newTheme);
		setShowThemeModal(false);
	}

	async function pickImage() {
		try {
			const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Permission requise', 'Permission d\'accès à la galerie requise');
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			if (!result.canceled && result.assets[0]) {
				setEditProfilePhoto(result.assets[0].uri);
			}
		} catch (error) {
			Alert.alert('Erreur', 'Erreur lors de la sélection de l\'image');
		}
	}

	async function takePhoto() {
		try {
			const { status } = await ImagePicker.requestCameraPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Permission requise', 'Permission d\'accès à la caméra requise');
				return;
			}

			const result = await ImagePicker.launchCameraAsync({
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			if (!result.canceled && result.assets[0]) {
				setEditProfilePhoto(result.assets[0].uri);
			}
		} catch (error) {
			Alert.alert('Erreur', 'Erreur lors de la prise de photo');
		}
	}

	function showImagePicker() {
		Alert.alert(
			'Changer la photo de profil',
			'Choisissez une option',
			[
				{ text: 'Annuler', style: 'cancel' },
				{ text: 'Galerie', onPress: pickImage },
				{ text: 'Caméra', onPress: takePhoto },
			]
		);
	}

	function StatCard({ icon, title, value, color = themeColors.primary }: { icon: string, title: string, value: string | number, color?: string }) {
		return (
			<View style={[styles.statCard, { borderLeftColor: color, backgroundColor: themeColors.backgroundSecondary }]}>
				<MaterialCommunityIcons name={icon as any} size={24} color={color} />
				<Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{value}</Text>
				<Text style={[styles.statTitle, { color: themeColors.textSecondary }]}>{title}</Text>
			</View>
		);
	}

	function MenuItem({ icon, title, onPress, showArrow = true, color = themeColors.textPrimary }: { 
		icon: string, 
		title: string, 
		onPress: () => void, 
		showArrow?: boolean,
		color?: string 
	}) {
		return (
			<Pressable style={[styles.menuItem, { borderBottomColor: themeColors.borderLight }]} onPress={onPress}>
				<View style={styles.menuItemLeft}>
					<MaterialCommunityIcons name={icon as any} size={24} color={color} />
					<Text style={[styles.menuItemText, { color }]}>{title}</Text>
				</View>
				{showArrow && (
					<MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.textTertiary} />
				)}
			</Pressable>
		);
	}

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
				<View style={styles.loadingContainer}>
					<Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Chargement...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* Header avec image de fond */}
				<ImageBackground 
					source={require('../../assets/images/splash-screen.png')} 
					style={styles.headerBackground}
					resizeMode="cover"
				>
					<View style={styles.headerOverlay}>
						<View style={styles.profileSection}>
						<Pressable style={styles.avatarContainer} onPress={showImagePicker}>
							<Image 
								source={profilePhotoUri ? { uri: profilePhotoUri } : require('../../assets/images/icon.png')} 
								style={styles.avatar}
							/>
							<View style={styles.onlineIndicator} />
							<View style={styles.editPhotoButton}>
								<MaterialCommunityIcons name="camera" size={16} color={themeColors.backgroundPrimary} />
							</View>
						</Pressable>
							<Text style={styles.userName}>{name || 'Mon Profil'}</Text>
							<Text style={styles.userEmail}>{email}</Text>
						</View>
					</View>
				</ImageBackground>

				{/* Statistiques */}
				<View style={[styles.statsSection, { backgroundColor: themeColors.backgroundPrimary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Mes Statistiques</Text>
					<View style={styles.statsGrid}>
						<StatCard 
							icon="map-marker-multiple" 
							title="Voyages" 
							value={userStats.totalTrips}
							color={themeColors.primary}
						/>
						<StatCard 
							icon="check-circle" 
							title="Terminés" 
							value={userStats.completedTrips}
							color={themeColors.success}
						/>
						<StatCard 
							icon="calendar" 
							title="Jours" 
							value={userStats.daysTraveled}
							color={themeColors.accent}
						/>
						<StatCard 
							icon="map-marker" 
							title="Étapes" 
							value={userStats.totalSteps}
							color={themeColors.secondary}
						/>
					</View>
				</View>

				{/* Menu principal */}
				<View style={[styles.menuSection, { backgroundColor: themeColors.backgroundPrimary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Paramètres</Text>
					
					<View style={[styles.menuGroup, { backgroundColor: themeColors.backgroundSecondary }]}>
						<MenuItem 
							icon="account-edit" 
							title="Modifier le profil" 
							onPress={handleEditProfile}
						/>
						<MenuItem 
							icon="bell" 
							title="Notifications" 
							onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
						/>
						<MenuItem 
							icon="palette" 
							title="Thème" 
							onPress={() => setShowThemeModal(true)}
						/>
						<MenuItem 
							icon="shield-account" 
							title="Confidentialité" 
							onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
						/>
					</View>

					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Support</Text>
					
					<View style={[styles.menuGroup, { backgroundColor: themeColors.backgroundSecondary }]}>
						<MenuItem 
							icon="help-circle" 
							title="Aide" 
							onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
						/>
						<MenuItem 
							icon="message-text" 
							title="Nous contacter" 
							onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
						/>
						<MenuItem 
							icon="star" 
							title="Évaluer l'app" 
							onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
						/>
					</View>

					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>À propos</Text>
					
					<View style={[styles.menuGroup, { backgroundColor: themeColors.backgroundSecondary }]}>
						<MenuItem 
							icon="information" 
							title="À propos de TripFlow" 
							onPress={() => Alert.alert('TripFlow', 'Version 1.0.0\n\nOrganisez vos voyages en toute simplicité.')}
						/>
						<MenuItem 
							icon="file-document" 
							title="Conditions d'utilisation" 
							onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
						/>
						<MenuItem 
							icon="shield-check" 
							title="Politique de confidentialité" 
							onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
						/>
					</View>
				</View>

				{/* Bouton de déconnexion */}
				<View style={[styles.logoutSection, { backgroundColor: themeColors.backgroundPrimary }]}>
					<Pressable style={[styles.logoutButton, { backgroundColor: themeColors.error }]} onPress={handleLogout}>
						<MaterialCommunityIcons name="logout" size={20} color={themeColors.backgroundPrimary} />
						<Text style={[styles.logoutText, { color: themeColors.backgroundPrimary }]}>Se déconnecter</Text>
					</Pressable>
				</View>

				<View style={styles.bottomSpacing} />
			</ScrollView>

			{/* Modal d'édition du profil */}
			<Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.backgroundPrimary }]}>
					<View style={styles.modalHeader}>
						<Pressable onPress={() => setShowEditModal(false)}>
							<Text style={[styles.modalCancel, { color: themeColors.textSecondary }]}>Annuler</Text>
						</Pressable>
						<Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Modifier le profil</Text>
						<Pressable onPress={saveProfile}>
							<Text style={[styles.modalSave, { color: themeColors.primary }]}>Enregistrer</Text>
						</Pressable>
					</View>
					
					<View style={styles.modalContent}>
						{/* Photo de profil */}
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>Photo de profil</Text>
							<View style={styles.photoSection}>
								<Pressable style={styles.photoContainer} onPress={showImagePicker}>
				<Image 
										source={editProfilePhoto ? { uri: editProfilePhoto } : require('../../assets/images/icon.png')} 
										style={styles.editPhoto}
									/>
									<View style={[styles.editPhotoOverlay, { backgroundColor: themeColors.primary }]}>
										<MaterialCommunityIcons name="camera" size={24} color={themeColors.backgroundPrimary} />
									</View>
								</Pressable>
								<Pressable style={[styles.changePhotoButton, { backgroundColor: themeColors.backgroundSecondary }]} onPress={showImagePicker}>
									<Text style={[styles.changePhotoText, { color: themeColors.textPrimary }]}>Changer la photo</Text>
								</Pressable>
							</View>
						</View>

						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>Nom</Text>
							<TextInput
								style={[styles.textInput, { 
									backgroundColor: themeColors.backgroundSecondary,
									borderColor: themeColors.borderLight,
									color: themeColors.textPrimary
								}]}
								value={editName}
								onChangeText={setEditName}
								placeholder="Votre nom"
								placeholderTextColor={themeColors.textTertiary}
							/>
						</View>
						
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>Email</Text>
							<TextInput
								style={[styles.textInput, { 
									backgroundColor: themeColors.backgroundSecondary,
									borderColor: themeColors.borderLight,
									color: themeColors.textPrimary
								}]}
								value={editEmail}
								onChangeText={setEditEmail}
								placeholder="votre@email.com"
								placeholderTextColor={themeColors.textTertiary}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>
					</View>
				</SafeAreaView>
			</Modal>

			{/* Modal de sélection du thème */}
			<Modal visible={showThemeModal} animationType="slide" presentationStyle="pageSheet">
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.backgroundPrimary }]}>
					<View style={styles.modalHeader}>
						<Pressable onPress={() => setShowThemeModal(false)}>
							<Text style={[styles.modalCancel, { color: themeColors.textSecondary }]}>Annuler</Text>
						</Pressable>
						<Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Choisir le thème</Text>
						<View style={{ width: 60 }} />
			</View>
					
					<View style={styles.modalContent}>
						<Pressable 
							style={[styles.themeOption, { backgroundColor: themeColors.backgroundSecondary }]}
							onPress={() => handleThemeChange('light')}
						>
							<MaterialCommunityIcons name="weather-sunny" size={24} color={themeColors.accent} />
							<Text style={[styles.themeOptionText, { color: themeColors.textPrimary }]}>Clair</Text>
							{theme === 'light' && <MaterialCommunityIcons name="check" size={20} color={themeColors.primary} />}
						</Pressable>
						
						<Pressable 
							style={[styles.themeOption, { backgroundColor: themeColors.backgroundSecondary }]}
							onPress={() => handleThemeChange('dark')}
						>
							<MaterialCommunityIcons name="weather-night" size={24} color={themeColors.textPrimary} />
							<Text style={[styles.themeOptionText, { color: themeColors.textPrimary }]}>Sombre</Text>
							{theme === 'dark' && <MaterialCommunityIcons name="check" size={20} color={themeColors.primary} />}
						</Pressable>
						
						<Pressable 
							style={[styles.themeOption, { backgroundColor: themeColors.backgroundSecondary }]}
							onPress={() => handleThemeChange('auto')}
						>
							<MaterialCommunityIcons name="theme-light-dark" size={24} color={themeColors.secondary} />
							<Text style={[styles.themeOptionText, { color: themeColors.textPrimary }]}>Automatique</Text>
							{theme === 'auto' && <MaterialCommunityIcons name="check" size={20} color={themeColors.primary} />}
			</Pressable>
					</View>
				</SafeAreaView>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#F8F1DD', // colors.backgroundSecondary
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#4A4A4A', // colors.textSecondary
		fontWeight: '500',
	},
	
	// Header avec image de fond
	headerBackground: {
		height: 300,
		width: '100%',
	},
	headerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(47, 182, 161, 0.8)',
		justifyContent: 'center', 
		alignItems: 'center',
	},
	profileSection: {
		alignItems: 'center',
	},
	avatarContainer: {
		position: 'relative',
		marginBottom: 16,
	},
	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 4,
		borderColor: '#FFFFFF', // colors.white
		shadowColor: 'rgba(0, 0, 0, 0.2)', // colors.shadowDark
		shadowOpacity: 1,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 8,
	},
	onlineIndicator: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#2FB6A1', // colors.success
		borderWidth: 3,
		borderColor: '#FFFFFF', // colors.white
	},
	userName: {
		fontSize: 28,
		fontWeight: '900',
		color: '#FFFFFF', // colors.white
		marginBottom: 4,
		textAlign: 'center',
	},
	userEmail: {
		fontSize: 16,
		color: '#F8F1DD', // colors.eggshell
		fontWeight: '500',
		textAlign: 'center',
	},
	
	// Statistiques
	statsSection: {
		padding: 20,
		backgroundColor: '#FFFFFF', // colors.white
		marginTop: -20,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		shadowColor: 'rgba(0, 0, 0, 0.1)', // colors.shadowLight
		shadowOpacity: 1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: -4 },
		elevation: 4,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#1A1A1A', // colors.textPrimary
		marginBottom: 16,
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	statCard: {
		width: (width - 60) / 2,
		backgroundColor: '#F8F1DD', // colors.backgroundSecondary
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		borderLeftWidth: 4,
		shadowColor: 'rgba(0, 0, 0, 0.1)', // colors.shadowLight
		shadowOpacity: 1,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	statValue: {
		fontSize: 24,
		fontWeight: '900', 
		color: '#1A1A1A', // colors.textPrimary
		marginTop: 8,
		marginBottom: 4,
	},
	statTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#4A4A4A', // colors.textSecondary
	},
	
	// Menu
	menuSection: {
		padding: 20,
		backgroundColor: '#FFFFFF', // colors.white
		marginTop: 8,
	},
	menuGroup: {
		backgroundColor: '#F8F1DD', // colors.backgroundSecondary
		borderRadius: 16,
		marginBottom: 24,
		overflow: 'hidden',
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0', // colors.borderLight
	},
	menuItemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	menuItemText: {
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 16,
		color: '#1A1A1A', // colors.textPrimary
	},
	
	// Déconnexion
	logoutSection: {
		padding: 20,
		backgroundColor: '#FFFFFF', // colors.white
	},
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E53E3E', // colors.error
		borderRadius: 16,
		paddingVertical: 16,
		paddingHorizontal: 24,
		shadowColor: '#E53E3E', // colors.error
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	logoutText: { 
		color: '#FFFFFF', // colors.white
		fontWeight: '800',
		fontSize: 16,
		marginLeft: 8,
	},
	
	// Espacement
	bottomSpacing: {
		height: 100, // Augmenté pour éviter que le bouton soit coupé
	},
	
	// Modales
	modalContainer: {
		flex: 1,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
	},
	modalCancel: {
		fontSize: 16,
		fontWeight: '600',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '800',
	},
	modalSave: {
		fontSize: 16,
		fontWeight: '800',
	},
	modalContent: {
		flex: 1,
		padding: 20,
	},
	inputGroup: {
		marginBottom: 24,
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
	},
	themeOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderRadius: 12,
		marginBottom: 12,
	},
	themeOptionText: {
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 16,
		flex: 1,
	},
	
	// Photo de profil
	editPhotoButton: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#2FB6A1',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#FFFFFF',
	},
	photoSection: {
		alignItems: 'center',
		marginBottom: 16,
	},
	photoContainer: {
		position: 'relative',
		marginBottom: 16,
	},
	editPhoto: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 4,
		borderColor: '#FFFFFF',
	},
	editPhotoOverlay: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#FFFFFF',
	},
	changePhotoButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	changePhotoText: {
		fontSize: 14,
		fontWeight: '600',
	},
});


