import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function RateAppScreen() {
	const { themeColors } = useTheme();
	const [selectedRating, setSelectedRating] = useState(0);

	const handleRateApp = (rating: number) => {
		setSelectedRating(rating);
		
		if (rating >= 4) {
			// Ouvrir l'App Store / Play Store
			Alert.alert(
				'Merci !',
				'Votre évaluation nous aide énormément. Voulez-vous nous laisser un avis sur l\'App Store ?',
				[
					{ text: 'Plus tard', style: 'cancel' },
					{ 
						text: 'Évaluer maintenant', 
						onPress: () => {
							// Ici vous pouvez ajouter le lien vers l'App Store
							Alert.alert('Info', 'Redirection vers l\'App Store...');
						}
					}
				]
			);
		} else {
			Alert.alert(
				'Nous sommes désolés',
				'Nous sommes désolés que votre expérience ne soit pas à la hauteur. Pouvez-vous nous dire ce qui pourrait être amélioré ?',
				[
					{ text: 'Annuler', style: 'cancel' },
					{ 
						text: 'Donner mon avis', 
						onPress: () => router.push('/contact')
					}
				]
			);
		}
	};

	const StarRating = ({ rating, onPress }: { rating: number, onPress: () => void }) => (
		<Pressable onPress={onPress} style={styles.starContainer}>
			<MaterialCommunityIcons 
				name={rating <= selectedRating ? "star" : "star-outline"} 
				size={32} 
				color={rating <= selectedRating ? themeColors.accent : themeColors.borderLight} 
			/>
		</Pressable>
	);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: themeColors.borderLight }]}>
				<Pressable onPress={() => router.back()} style={styles.backButton}>
					<MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.textPrimary} />
				</Pressable>
				<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Évaluer l'App</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.heroSection}>
					<MaterialCommunityIcons name="star-circle" size={80} color={themeColors.primary} />
					<Text style={[styles.title, { color: themeColors.textPrimary }]}>
						Évaluez TripFlow
					</Text>
					<Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
						Votre avis nous aide à améliorer l'application
					</Text>
				</View>

				{/* Rating Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Comment évaluez-vous votre expérience ?
					</Text>
					
					<View style={styles.starsContainer}>
						{[1, 2, 3, 4, 5].map((rating) => (
							<StarRating 
								key={rating} 
								rating={rating} 
								onPress={() => handleRateApp(rating)} 
							/>
						))}
					</View>

					{selectedRating > 0 && (
						<Text style={[styles.ratingText, { color: themeColors.textSecondary }]}>
							{selectedRating === 1 && "Terrible"}
							{selectedRating === 2 && "Pas bien"}
							{selectedRating === 3 && "Moyen"}
							{selectedRating === 4 && "Bien"}
							{selectedRating === 5 && "Excellent !"}
						</Text>
					)}
				</View>

				{/* Why Rate Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Pourquoi évaluer ?
					</Text>
					
					<View style={styles.benefitItem}>
						<MaterialCommunityIcons name="heart" size={20} color={themeColors.primary} />
						<Text style={[styles.benefitText, { color: themeColors.textSecondary }]}>
							Aidez-nous à améliorer l'application
						</Text>
					</View>
					
					<View style={styles.benefitItem}>
						<MaterialCommunityIcons name="users" size={20} color={themeColors.primary} />
						<Text style={[styles.benefitText, { color: themeColors.textSecondary }]}>
							Partagez votre expérience avec d'autres voyageurs
						</Text>
					</View>
					
					<View style={styles.benefitItem}>
						<MaterialCommunityIcons name="lightbulb" size={20} color={themeColors.primary} />
						<Text style={[styles.benefitText, { color: themeColors.textSecondary }]}>
							Influencez le développement de nouvelles fonctionnalités
						</Text>
					</View>
				</View>

				{/* Alternative Actions */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Autres Actions
					</Text>
					
					<Pressable 
						style={[styles.actionButton, { backgroundColor: themeColors.accent }]}
						onPress={() => router.push('/contact')}
					>
						<MaterialCommunityIcons name="message-text" size={20} color="white" />
						<Text style={styles.actionButtonText}>Donner un Retour Détaillé</Text>
					</Pressable>

					<Pressable 
						style={[styles.actionButton, { backgroundColor: themeColors.secondary }]}
						onPress={() => router.push('/help')}
					>
						<MaterialCommunityIcons name="help-circle" size={20} color="white" />
						<Text style={styles.actionButtonText}>Consulter l'Aide</Text>
					</Pressable>
				</View>

				{/* Thank You Message */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.thankYouTitle, { color: themeColors.textPrimary }]}>
						Merci de votre soutien !
					</Text>
					<Text style={[styles.thankYouText, { color: themeColors.textSecondary }]}>
						Chaque évaluation compte et nous aide à créer une meilleure expérience pour tous les voyageurs. 
						Votre feedback est précieux pour nous.
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
	heroSection: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	title: {
		fontSize: 28,
		fontWeight: '900',
		marginTop: 16,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		textAlign: 'center',
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
		textAlign: 'center',
	},
	starsContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 16,
	},
	starContainer: {
		padding: 8,
	},
	ratingText: {
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
	},
	benefitItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	benefitText: {
		fontSize: 14,
		marginLeft: 12,
		flex: 1,
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
	thankYouTitle: {
		fontSize: 20,
		fontWeight: '800',
		textAlign: 'center',
		marginBottom: 12,
	},
	thankYouText: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},
	bottomSpacing: {
		height: 40,
	},
});
