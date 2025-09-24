import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function NotificationsScreen() {
	const { themeColors } = useTheme();
	
	// États pour les différents types de notifications
	const [tripReminders, setTripReminders] = useState(true);
	const [stepReminders, setStepReminders] = useState(true);
	const [photoReminders, setPhotoReminders] = useState(false);
	const [weeklySummary, setWeeklySummary] = useState(true);
	const [appUpdates, setAppUpdates] = useState(true);
	const [marketingEmails, setMarketingEmails] = useState(false);

	const handleTestNotification = () => {
		Alert.alert(
			'Test de Notification',
			'Cette fonctionnalité sera disponible dans une future mise à jour. Les notifications vous aideront à ne rien oublier pendant vos voyages !',
			[{ text: 'OK' }]
		);
	};

	const handleClearAllNotifications = () => {
		Alert.alert(
			'Effacer les Notifications',
			'Voulez-vous vraiment effacer toutes les notifications ?',
			[
				{ text: 'Annuler', style: 'cancel' },
				{ 
					text: 'Effacer', 
					style: 'destructive',
					onPress: () => {
						Alert.alert('Succès', 'Toutes les notifications ont été effacées.');
					}
				}
			]
		);
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: themeColors.borderLight }]}>
				<Pressable onPress={() => router.back()} style={styles.backButton}>
					<MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.textPrimary} />
				</Pressable>
				<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Notifications</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={[styles.title, { color: themeColors.textPrimary }]}>
					Paramètres de Notifications
				</Text>
				
				<Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
					Personnalisez vos notifications pour ne rien rater de vos voyages
				</Text>

				{/* Notification Types */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Types de Notifications
					</Text>
					
					{/* Rappels de voyage */}
					<View style={styles.notificationItem}>
						<View style={styles.notificationInfo}>
							<MaterialCommunityIcons name="map-marker-multiple" size={24} color={themeColors.primary} />
							<View style={styles.notificationText}>
								<Text style={[styles.notificationTitle, { color: themeColors.textPrimary }]}>
									Rappels de Voyage
								</Text>
								<Text style={[styles.notificationDescription, { color: themeColors.textSecondary }]}>
									Notifications avant le début de vos voyages
								</Text>
							</View>
						</View>
						<Switch
							value={tripReminders}
							onValueChange={setTripReminders}
							trackColor={{ false: themeColors.borderLight, true: themeColors.primary }}
							thumbColor={tripReminders ? 'white' : themeColors.textTertiary}
						/>
					</View>

					{/* Rappels d'étapes */}
					<View style={styles.notificationItem}>
						<View style={styles.notificationInfo}>
							<MaterialCommunityIcons name="map-marker" size={24} color={themeColors.accent} />
							<View style={styles.notificationText}>
								<Text style={[styles.notificationTitle, { color: themeColors.textPrimary }]}>
									Rappels d'Étapes
								</Text>
								<Text style={[styles.notificationDescription, { color: themeColors.textSecondary }]}>
									Rappels pour vos prochaines étapes
								</Text>
							</View>
						</View>
						<Switch
							value={stepReminders}
							onValueChange={setStepReminders}
							trackColor={{ false: themeColors.borderLight, true: themeColors.primary }}
							thumbColor={stepReminders ? 'white' : themeColors.textTertiary}
						/>
					</View>

					{/* Rappels photos */}
					<View style={styles.notificationItem}>
						<View style={styles.notificationInfo}>
							<MaterialCommunityIcons name="camera" size={24} color={themeColors.secondary} />
							<View style={styles.notificationText}>
								<Text style={[styles.notificationTitle, { color: themeColors.textPrimary }]}>
									Rappels Photos
								</Text>
								<Text style={[styles.notificationDescription, { color: themeColors.textSecondary }]}>
									Suggestions pour prendre des photos
								</Text>
							</View>
						</View>
						<Switch
							value={photoReminders}
							onValueChange={setPhotoReminders}
							trackColor={{ false: themeColors.borderLight, true: themeColors.primary }}
							thumbColor={photoReminders ? 'white' : themeColors.textTertiary}
						/>
					</View>

					{/* Résumé hebdomadaire */}
					<View style={styles.notificationItem}>
						<View style={styles.notificationInfo}>
							<MaterialCommunityIcons name="calendar-week" size={24} color={themeColors.success} />
							<View style={styles.notificationText}>
								<Text style={[styles.notificationTitle, { color: themeColors.textPrimary }]}>
									Résumé Hebdomadaire
								</Text>
								<Text style={[styles.notificationDescription, { color: themeColors.textSecondary }]}>
									Récapitulatif de vos activités de voyage
								</Text>
							</View>
						</View>
						<Switch
							value={weeklySummary}
							onValueChange={setWeeklySummary}
							trackColor={{ false: themeColors.borderLight, true: themeColors.primary }}
							thumbColor={weeklySummary ? 'white' : themeColors.textTertiary}
						/>
					</View>
				</View>

				{/* App Notifications */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Notifications de l'Application
					</Text>
					
					<View style={styles.notificationItem}>
						<View style={styles.notificationInfo}>
							<MaterialCommunityIcons name="update" size={24} color={themeColors.primary} />
							<View style={styles.notificationText}>
								<Text style={[styles.notificationTitle, { color: themeColors.textPrimary }]}>
									Mises à Jour
								</Text>
								<Text style={[styles.notificationDescription, { color: themeColors.textSecondary }]}>
									Notifications pour les nouvelles fonctionnalités
								</Text>
							</View>
						</View>
						<Switch
							value={appUpdates}
							onValueChange={setAppUpdates}
							trackColor={{ false: themeColors.borderLight, true: themeColors.primary }}
							thumbColor={appUpdates ? 'white' : themeColors.textTertiary}
						/>
					</View>

					<View style={styles.notificationItem}>
						<View style={styles.notificationInfo}>
							<MaterialCommunityIcons name="email" size={24} color={themeColors.accent} />
							<View style={styles.notificationText}>
								<Text style={[styles.notificationTitle, { color: themeColors.textPrimary }]}>
									Emails Marketing
								</Text>
								<Text style={[styles.notificationDescription, { color: themeColors.textSecondary }]}>
									Conseils et nouvelles fonctionnalités par email
								</Text>
							</View>
						</View>
						<Switch
							value={marketingEmails}
							onValueChange={setMarketingEmails}
							trackColor={{ false: themeColors.borderLight, true: themeColors.primary }}
							thumbColor={marketingEmails ? 'white' : themeColors.textTertiary}
						/>
					</View>
				</View>

				{/* Quick Actions */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Actions Rapides
					</Text>
					
					<Pressable 
						style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
						onPress={handleTestNotification}
					>
						<MaterialCommunityIcons name="bell-ring" size={20} color="white" />
						<Text style={styles.actionButtonText}>Tester les Notifications</Text>
					</Pressable>

					<Pressable 
						style={[styles.actionButton, { backgroundColor: themeColors.accent }]}
						onPress={handleClearAllNotifications}
					>
						<MaterialCommunityIcons name="bell-off" size={20} color="white" />
						<Text style={styles.actionButtonText}>Effacer Toutes les Notifications</Text>
					</Pressable>
				</View>

				{/* Info Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						À Propos des Notifications
					</Text>
					<Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
						Les notifications vous aident à ne rien oublier pendant vos voyages. 
						Vous pouvez les personnaliser selon vos préférences et les désactiver 
						à tout moment depuis cette page.
					</Text>
				</View>

				<View style={styles.bottomSpacing} />
			</ScrollView>
		</SafeAreaView>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
	},
	backButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '800',
	},
	content: {
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 28,
		fontWeight: '900',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 24,
	},
	section: {
		padding: 20,
		borderRadius: 16,
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '800',
		marginBottom: 16,
	},
	notificationItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.1)',
	},
	notificationInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	notificationText: {
		marginLeft: 12,
		flex: 1,
	},
	notificationTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
	},
	notificationDescription: {
		fontSize: 14,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 12,
		marginBottom: 12,
	},
	actionButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
	infoText: {
		fontSize: 14,
		lineHeight: 20,
	},
	bottomSpacing: {
		height: 40,
	},
});
