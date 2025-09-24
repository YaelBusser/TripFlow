import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function PrivacyScreen() {
	const { themeColors } = useTheme();

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: themeColors.borderLight }]}>
				<Pressable onPress={() => router.back()} style={styles.backButton}>
					<MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.textPrimary} />
				</Pressable>
				<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Confidentialité</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={[styles.title, { color: themeColors.textPrimary }]}>
					Politique de Confidentialité
				</Text>
				
				<Text style={[styles.lastUpdated, { color: themeColors.textSecondary }]}>
					Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
				</Text>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						1. Collecte des Informations
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						TripFlow collecte uniquement les informations nécessaires au bon fonctionnement de l'application :
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Informations de compte (nom, email, photo de profil)
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Données de voyage (destinations, dates, étapes)
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Photos et médias liés à vos voyages
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Préférences d'application (thème, notifications)
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						2. Utilisation des Données
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Vos données sont utilisées exclusivement pour :
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Fournir les fonctionnalités de l'application
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Sauvegarder vos voyages et souvenirs
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Personnaliser votre expérience utilisateur
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Améliorer les performances de l'application
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						3. Stockage et Sécurité
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Toutes vos données sont stockées localement sur votre appareil
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Aucune donnée n'est transmise à des serveurs externes
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Les données sont chiffrées et protégées par les mécanismes de sécurité de votre appareil
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						4. Partage des Données
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Nous ne partageons aucune de vos données personnelles
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Aucune donnée n'est vendue à des tiers
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Vos voyages restent privés et confidentiels
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						5. Vos Droits
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Vous avez le droit de :
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Accéder à toutes vos données
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Modifier ou supprimer vos informations
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Exporter vos données de voyage
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Supprimer votre compte et toutes les données associées
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						6. Contact
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Pour toute question concernant cette politique de confidentialité, contactez-nous via l'application.
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
	lastUpdated: {
		fontSize: 14,
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
		marginBottom: 12,
	},
	sectionText: {
		fontSize: 16,
		lineHeight: 24,
		marginBottom: 8,
	},
	bulletPoint: {
		fontSize: 16,
		lineHeight: 24,
		marginLeft: 16,
		marginBottom: 4,
	},
	bottomSpacing: {
		height: 40,
	},
});
