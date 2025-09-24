import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function HelpScreen() {
	const { themeColors } = useTheme();

	const faqItems = [
		{
			question: "Comment créer un nouveau voyage ?",
			answer: "Tapez sur le bouton '+' en bas de l'écran, puis remplissez les informations de votre voyage (titre, destination, dates). Vous pourrez ensuite ajouter des étapes à votre voyage."
		},
		{
			question: "Comment ajouter des étapes à mon voyage ?",
			answer: "Une fois dans votre voyage, tapez sur 'Ajouter une étape' et sélectionnez un lieu sur la carte. Vous pouvez organiser vos étapes dans l'ordre souhaité."
		},
		{
			question: "Comment marquer une étape comme terminée ?",
			answer: "Dans la page d'une étape, tapez sur le bouton 'Marquer comme atteint' quand vous arrivez à destination. L'étape sera alors marquée comme terminée."
		},
		{
			question: "Comment ajouter des photos à mon voyage ?",
			answer: "Dans chaque étape, vous pouvez ajouter des photos en tapant sur l'icône caméra. Ces photos seront sauvegardées dans votre galerie de voyage."
		},
		{
			question: "Comment changer mon thème d'application ?",
			answer: "Allez dans votre profil, tapez sur 'Thème' et choisissez entre Clair, Sombre ou Automatique selon vos préférences."
		},
		{
			question: "Mes données sont-elles sauvegardées ?",
			answer: "Oui, toutes vos données sont sauvegardées localement sur votre appareil. Vos voyages et photos restent privés et ne sont pas partagés."
		}
	];

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: themeColors.borderLight }]}>
				<Pressable onPress={() => router.back()} style={styles.backButton}>
					<MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.textPrimary} />
				</Pressable>
				<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Aide</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={[styles.title, { color: themeColors.textPrimary }]}>
					Centre d'Aide TripFlow
				</Text>
				
				<Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
					Trouvez rapidement les réponses à vos questions
				</Text>

				{/* FAQ Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Questions Fréquentes
					</Text>
					
					{faqItems.map((item, index) => (
						<View key={index} style={styles.faqItem}>
							<Text style={[styles.question, { color: themeColors.textPrimary }]}>
								{item.question}
							</Text>
							<Text style={[styles.answer, { color: themeColors.textSecondary }]}>
								{item.answer}
							</Text>
						</View>
					))}
				</View>

				{/* Quick Actions */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Actions Rapides
					</Text>
					
					<Pressable 
						style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
						onPress={() => router.push('/contact')}
					>
						<MaterialCommunityIcons name="message-text" size={20} color="white" />
						<Text style={styles.actionButtonText}>Nous Contacter</Text>
					</Pressable>

					<Pressable 
						style={[styles.actionButton, { backgroundColor: themeColors.accent }]}
						onPress={() => router.push('/rate-app')}
					>
						<MaterialCommunityIcons name="star" size={20} color="white" />
						<Text style={styles.actionButtonText}>Évaluer l'App</Text>
					</Pressable>
				</View>

				{/* Tips Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Conseils d'Utilisation
					</Text>
					
					<View style={styles.tipItem}>
						<MaterialCommunityIcons name="lightbulb" size={20} color={themeColors.accent} />
						<Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
							Organisez vos étapes dans l'ordre chronologique pour un meilleur suivi
						</Text>
					</View>
					
					<View style={styles.tipItem}>
						<MaterialCommunityIcons name="camera" size={20} color={themeColors.accent} />
						<Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
							Ajoutez des photos à chaque étape pour créer un journal de voyage
						</Text>
					</View>
					
					<View style={styles.tipItem}>
						<MaterialCommunityIcons name="map-marker" size={20} color={themeColors.accent} />
						<Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
							Utilisez la carte pour visualiser votre itinéraire complet
						</Text>
					</View>
					
					<View style={styles.tipItem}>
						<MaterialCommunityIcons name="check-circle" size={20} color={themeColors.accent} />
						<Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
							Marquez vos étapes comme terminées pour suivre votre progression
						</Text>
					</View>
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
	faqItem: {
		marginBottom: 16,
	},
	question: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
	},
	answer: {
		fontSize: 14,
		lineHeight: 20,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		marginBottom: 12,
	},
	actionButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
	tipItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 12,
	},
	tipText: {
		fontSize: 14,
		lineHeight: 20,
		marginLeft: 12,
		flex: 1,
	},
	bottomSpacing: {
		height: 40,
	},
});
