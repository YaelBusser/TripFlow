import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function TermsScreen() {
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
				<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Conditions d'Utilisation</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={[styles.title, { color: themeColors.textPrimary }]}>
					Conditions d'Utilisation de TripFlow
				</Text>
				
				<Text style={[styles.lastUpdated, { color: themeColors.textSecondary }]}>
					Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
				</Text>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						1. Acceptation des Conditions
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						En utilisant l'application TripFlow, vous acceptez d'être lié par ces conditions d'utilisation. 
						Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						2. Description du Service
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						TripFlow est une application mobile qui permet aux utilisateurs de :
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Planifier et organiser leurs voyages
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Créer des itinéraires avec des étapes personnalisées
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Sauvegarder des photos et des souvenirs de voyage
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Suivre la progression de leurs voyages
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						3. Utilisation Acceptable
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Vous vous engagez à utiliser TripFlow de manière responsable et légale. Il est interdit de :
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Utiliser l'application à des fins illégales
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Partager du contenu offensant, diffamatoire ou inapproprié
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Tenter de contourner les mesures de sécurité
					</Text>
					<Text style={[styles.bulletPoint, { color: themeColors.textSecondary }]}>
						• Utiliser l'application pour harceler ou menacer d'autres utilisateurs
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						4. Propriété Intellectuelle
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						L'application TripFlow et son contenu sont protégés par les droits d'auteur et autres 
						lois sur la propriété intellectuelle. Vous conservez tous les droits sur vos propres 
						contenus (photos, textes, données de voyage) que vous ajoutez à l'application.
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						5. Protection des Données
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Toutes vos données sont stockées localement sur votre appareil
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Aucune donnée personnelle n'est transmise à des serveurs externes
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• Vous êtes responsable de la sauvegarde de vos données
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						• En cas de suppression de l'application, vos données peuvent être perdues
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						6. Limitation de Responsabilité
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						TripFlow est fourni "en l'état" sans garantie d'aucune sorte. Nous ne pouvons être tenus 
						responsables des dommages directs ou indirects résultant de l'utilisation de l'application, 
						notamment la perte de données ou les erreurs d'itinéraire.
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						7. Modifications
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Nous nous réservons le droit de modifier ces conditions d'utilisation à tout moment. 
						Les modifications prendront effet dès leur publication dans l'application. 
						Votre utilisation continue de l'application constitue votre acceptation des nouvelles conditions.
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						8. Résiliation
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Vous pouvez cesser d'utiliser TripFlow à tout moment en supprimant l'application de votre appareil. 
						Nous nous réservons le droit de suspendre ou de résilier votre accès en cas de violation 
						de ces conditions d'utilisation.
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						9. Droit Applicable
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Ces conditions d'utilisation sont régies par le droit français. 
						Tout litige sera soumis à la juridiction des tribunaux français.
					</Text>
				</View>

				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						10. Contact
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Pour toute question concernant ces conditions d'utilisation, contactez-nous via l'application 
						ou par email à support@tripflow.app.
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
