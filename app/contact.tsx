import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function ContactScreen() {
	const { themeColors } = useTheme();
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');

	const handleSendEmail = () => {
		if (!subject.trim() || !message.trim()) {
			Alert.alert('Erreur', 'Veuillez remplir tous les champs');
			return;
		}

		const emailBody = `Sujet: ${subject}\n\nMessage:\n${message}`;
		const emailUrl = `mailto:support@tripflow.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
		
		Linking.openURL(emailUrl).catch(() => {
			Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application email');
		});
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
				<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Nous Contacter</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={[styles.title, { color: themeColors.textPrimary }]}>
					Contactez l'Équipe TripFlow
				</Text>
				
				<Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
					Nous sommes là pour vous aider ! Envoyez-nous vos questions, suggestions ou signalements de bugs.
				</Text>

				{/* Contact Form */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Envoyer un Message
					</Text>
					
					<View style={styles.inputGroup}>
						<Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>Sujet</Text>
						<TextInput
							style={[styles.textInput, { 
								backgroundColor: themeColors.backgroundPrimary,
								borderColor: themeColors.borderLight,
								color: themeColors.textPrimary
							}]}
							value={subject}
							onChangeText={setSubject}
							placeholder="Ex: Problème avec la sauvegarde"
							placeholderTextColor={themeColors.textTertiary}
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>Message</Text>
						<TextInput
							style={[styles.textArea, { 
								backgroundColor: themeColors.backgroundPrimary,
								borderColor: themeColors.borderLight,
								color: themeColors.textPrimary
							}]}
							value={message}
							onChangeText={setMessage}
							placeholder="Décrivez votre problème ou suggestion en détail..."
							placeholderTextColor={themeColors.textTertiary}
							multiline
							numberOfLines={6}
							textAlignVertical="top"
						/>
					</View>

					<Pressable 
						style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
						onPress={handleSendEmail}
					>
						<MaterialCommunityIcons name="send" size={20} color="white" />
						<Text style={styles.sendButtonText}>Envoyer par Email</Text>
					</Pressable>
				</View>

				{/* Contact Methods */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Autres Moyens de Contact
					</Text>
					
					<Pressable 
						style={styles.contactMethod}
						onPress={() => Linking.openURL('mailto:support@tripflow.app')}
					>
						<MaterialCommunityIcons name="email" size={24} color={themeColors.primary} />
						<View style={styles.contactInfo}>
							<Text style={[styles.contactTitle, { color: themeColors.textPrimary }]}>Email</Text>
							<Text style={[styles.contactSubtitle, { color: themeColors.textSecondary }]}>
								support@tripflow.app
							</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.textTertiary} />
					</Pressable>

					<Pressable 
						style={styles.contactMethod}
						onPress={() => router.push('/help')}
					>
						<MaterialCommunityIcons name="help-circle" size={24} color={themeColors.accent} />
						<View style={styles.contactInfo}>
							<Text style={[styles.contactTitle, { color: themeColors.textPrimary }]}>Centre d'Aide</Text>
							<Text style={[styles.contactSubtitle, { color: themeColors.textSecondary }]}>
								Consultez notre FAQ
							</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.textTertiary} />
					</Pressable>
				</View>

				{/* Response Time */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Temps de Réponse
					</Text>
					<Text style={[styles.responseText, { color: themeColors.textSecondary }]}>
						Nous nous efforçons de répondre à tous les messages dans les 24-48 heures. 
						Pour les problèmes urgents, n'hésitez pas à nous le faire savoir dans votre message.
					</Text>
				</View>

				{/* Feedback */}
				<View style={[styles.section, { backgroundColor: themeColors.backgroundSecondary }]}>
					<Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
						Vos Suggestions
					</Text>
					<Text style={[styles.feedbackText, { color: themeColors.textSecondary }]}>
						Nous apprécions vos retours ! Vos suggestions nous aident à améliorer TripFlow. 
						N'hésitez pas à nous faire part de vos idées pour de nouvelles fonctionnalités.
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
	inputGroup: {
		marginBottom: 16,
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
	textArea: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
		minHeight: 120,
	},
	sendButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 12,
		marginTop: 8,
	},
	sendButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
	contactMethod: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.1)',
	},
	contactInfo: {
		flex: 1,
		marginLeft: 16,
	},
	contactTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
	},
	contactSubtitle: {
		fontSize: 14,
	},
	responseText: {
		fontSize: 14,
		lineHeight: 20,
	},
	feedbackText: {
		fontSize: 14,
		lineHeight: 20,
	},
	bottomSpacing: {
		height: 40,
	},
});
