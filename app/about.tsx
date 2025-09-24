import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function AboutScreen() {
	const { themeColors } = useTheme();

	const features = [
		{
			icon: "map-marker-multiple",
			title: "Planification de Voyages",
			description: "Organisez vos voyages étape par étape avec une interface intuitive"
		},
		{
			icon: "camera",
			title: "Journal de Voyage",
			description: "Capturez et sauvegardez vos souvenirs avec des photos et des notes"
		},
		{
			icon: "map",
			title: "Cartes Interactives",
			description: "Visualisez vos itinéraires sur des cartes détaillées"
		},
		{
			icon: "check-circle",
			title: "Suivi de Progression",
			description: "Marquez vos étapes comme terminées et suivez votre avancement"
		},
		{
			icon: "shield-check",
			title: "Données Privées",
			description: "Toutes vos données restent sur votre appareil, en toute sécurité"
		},
		{
			icon: "palette",
			title: "Personnalisation",
			description: "Adaptez l'application à vos préférences avec différents thèmes"
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
				<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>À Propos</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Hero Section */}
				<View style={styles.heroSection}>
					<Image 
						source={require('../assets/images/icon.png')} 
						style={styles.appIcon}
					/>
					<Text style={[styles.appName, { color: themeColors.textPrimary }]}>
						TripFlow
					</Text>
					<Text style={[styles.version, { color: themeColors.textSecondary }]}>
						Version 1.0.0
					</Text>
					<Text style={[styles.tagline, { color: themeColors.textSecondary }]}>
						Organisez vos voyages en toute simplicité
					</Text>
				</View>

				{/* Mission Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Notre Mission
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						TripFlow a été créé pour simplifier l'organisation de vos voyages. 
						Nous croyons que chaque voyage mérite d'être planifié, vécu et mémorisé 
						avec soin. Notre application vous accompagne de la planification à 
						la réalisation de vos rêves de voyage.
					</Text>
				</View>

				{/* Features Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Fonctionnalités Principales
					</Text>
					
					{features.map((feature, index) => (
						<View key={index} style={styles.featureItem}>
							<MaterialCommunityIcons 
								name={feature.icon as any} 
								size={24} 
								color={themeColors.primary} 
							/>
							<View style={styles.featureContent}>
								<Text style={[styles.featureTitle, { color: themeColors.textPrimary }]}>
									{feature.title}
								</Text>
								<Text style={[styles.featureDescription, { color: themeColors.textSecondary }]}>
									{feature.description}
								</Text>
							</View>
						</View>
					))}
				</View>

				{/* Privacy Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Respect de la Vie Privée
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Chez TripFlow, nous prenons votre vie privée au sérieux. Toutes vos données 
						(voyages, photos, notes) sont stockées localement sur votre appareil. 
						Aucune information n'est transmise à des serveurs externes, garantissant 
						une confidentialité totale de vos souvenirs de voyage.
					</Text>
				</View>

				{/* Team Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						L'Équipe
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						TripFlow est développé par une équipe passionnée de voyage et de technologie. 
						Nous comprenons les défis de l'organisation de voyages et nous nous efforçons 
						de créer des outils qui rendent chaque voyage plus mémorable.
					</Text>
				</View>

				{/* Contact Section */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Restons en Contact
					</Text>
					<Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
						Vos retours et suggestions sont essentiels pour améliorer TripFlow. 
						N'hésitez pas à nous contacter pour partager vos idées ou signaler 
						des problèmes.
					</Text>
					
					<Pressable 
						style={[styles.contactButton, { backgroundColor: themeColors.primary }]}
						onPress={() => router.push('/contact')}
					>
						<MaterialCommunityIcons name="message-text" size={20} color="white" />
						<Text style={styles.contactButtonText}>Nous Contacter</Text>
					</Pressable>
				</View>

				{/* Legal Links */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Informations Légales
					</Text>
					
					<Pressable 
						style={styles.legalLink}
						onPress={() => router.push('/terms')}
					>
						<MaterialCommunityIcons name="file-document" size={20} color={themeColors.textSecondary} />
						<Text style={[styles.legalLinkText, { color: themeColors.textSecondary }]}>
							Conditions d'utilisation
						</Text>
						<MaterialCommunityIcons name="chevron-right" size={16} color={themeColors.textTertiary} />
					</Pressable>

					<Pressable 
						style={styles.legalLink}
						onPress={() => router.push('/privacy')}
					>
						<MaterialCommunityIcons name="shield-check" size={20} color={themeColors.textSecondary} />
						<Text style={[styles.legalLinkText, { color: themeColors.textSecondary }]}>
							Politique de confidentialité
						</Text>
						<MaterialCommunityIcons name="chevron-right" size={16} color={themeColors.textTertiary} />
					</Pressable>
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
	appIcon: {
		width: 80,
		height: 80,
		borderRadius: 20,
		marginBottom: 16,
	},
	appName: {
		fontSize: 32,
		fontWeight: '900',
		marginBottom: 8,
	},
	version: {
		fontSize: 16,
		marginBottom: 8,
	},
	tagline: {
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
		marginBottom: 12,
	},
	sectionText: {
		fontSize: 14,
		lineHeight: 20,
	},
	featureItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	featureContent: {
		flex: 1,
		marginLeft: 12,
	},
	featureTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
	},
	featureDescription: {
		fontSize: 14,
		lineHeight: 18,
	},
	contactButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 12,
		marginTop: 16,
	},
	contactButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
	legalLink: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.1)',
	},
	legalLinkText: {
		fontSize: 14,
		marginLeft: 12,
		flex: 1,
	},
	bottomSpacing: {
		height: 40,
	},
});
