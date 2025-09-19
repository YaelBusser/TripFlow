import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createStep, listSteps, Step } from '../../../lib/steps';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
try {
	// Lazy require to avoid crash if maps not installed yet
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const maps = require('react-native-maps');
	MapView = maps.default;
	Marker = maps.Marker;
	Polyline = maps.Polyline;
} catch (e) {
	// no-op fallback
}

export default function TripMapScreen() {
	const { tripId, addStep } = useLocalSearchParams<{ tripId: string; addStep?: string }>();
	const id = Number(tripId);
	const [steps, setSteps] = useState<Step[]>([]);
	const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
	const [stepName, setStepName] = useState('');
	const [stepDescription, setStepDescription] = useState('');
	const [showAddForm, setShowAddForm] = useState(addStep === 'true');
	const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const mapRef = useRef<any>(null);

	const loadSteps = useCallback(async () => {
		if (!id) return;
		const data = await listSteps(id);
		setSteps(data);
	}, [id]);

	useEffect(() => {
		(async () => {
			await loadSteps();
			
			// Get current location
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status === 'granted') {
					const location = await Location.getCurrentPositionAsync({});
					setCurrentLocation({
						latitude: location.coords.latitude,
						longitude: location.coords.longitude
					});
				}
			} catch (error) {
				console.log('Location permission denied or error:', error);
			}
		})();
	}, [loadSteps]);

	useFocusEffect(
		useCallback(() => {
			loadSteps();
		}, [loadSteps])
	);

	const region = useMemo(() => {
		if (steps.length === 0) {
			// Default to Paris if no steps
			return { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.1, longitudeDelta: 0.1 };
		}
		const lats = steps.map(s => s.latitude);
		const lngs = steps.map(s => s.longitude);
		const minLat = Math.min(...lats);
		const maxLat = Math.max(...lats);
		const minLng = Math.min(...lngs);
		const maxLng = Math.max(...lngs);
		const latitude = (minLat + maxLat) / 2;
		const longitude = (minLng + maxLng) / 2;
		const latitudeDelta = Math.max(0.1, (maxLat - minLat) * 1.8 || 0.6);
		const longitudeDelta = Math.max(0.1, (maxLng - minLng) * 1.8 || 0.6);
		return { latitude, longitude, latitudeDelta, longitudeDelta };
	}, [steps]);

	const handleMapPress = async (event: any) => {
		if (showAddForm) {
			const { latitude, longitude } = event.nativeEvent.coordinate;
			setSelectedLocation({ latitude, longitude });
			
			// Get address from coordinates
			const address = await getAddressFromCoordinates(latitude, longitude);
			if (!stepName.trim()) {
				setStepName(address);
			}
		}
	};

	const handleAddStep = async () => {
		if (!selectedLocation || !stepName.trim()) {
			Alert.alert('Erreur', 'Veuillez sélectionner un emplacement et saisir un nom');
			return;
		}

		try {
			await createStep({
				trip_id: id,
				name: stepName.trim(),
				latitude: selectedLocation.latitude,
				longitude: selectedLocation.longitude,
				start_date: null,
				end_date: null,
				description: stepDescription.trim() || null,
				order_index: steps.length
			});

			// Refresh steps
			const data = await listSteps(id);
			setSteps(data);
			
			// Reset form
			setStepName('');
			setStepDescription('');
			setSelectedLocation(null);
			setShowAddForm(false);
			
			Alert.alert('Succès', 'Étape ajoutée avec succès');
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Impossible d\'ajouter l\'étape');
		}
	};

	const handleMyLocation = async () => {
		if (!currentLocation) {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') {
					Alert.alert('Permission requise', 'L\'accès à la localisation est nécessaire');
					return;
				}
				const location = await Location.getCurrentPositionAsync({});
				const newLocation = {
					latitude: location.coords.latitude,
					longitude: location.coords.longitude
				};
				setCurrentLocation(newLocation);
				
				// Animate to current location
				if (mapRef.current) {
					mapRef.current.animateToRegion({
						...newLocation,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01,
					}, 1000);
				}
			} catch (error) {
				Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
			}
		} else {
			// Animate to current location
			if (mapRef.current) {
				mapRef.current.animateToRegion({
					...currentLocation,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				}, 1000);
			}
		}
	};

	const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
		try {
			// Use reverse geocoding to get address from coordinates
			const response = await fetch(
				`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`
			);
			const data = await response.json();
			
			if (data.city && data.countryName) {
				return `${data.city}, ${data.countryName}`.replace(/\s*\(la\)\s*$/i, '');
			} else if (data.locality && data.countryName) {
				return `${data.locality}, ${data.countryName}`.replace(/\s*\(la\)\s*$/i, '');
			} else {
				return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
			}
		} catch (error) {
			console.log('Reverse geocoding error:', error);
			return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
		}
	};

	const searchLocation = async (query: string) => {
		if (!query.trim()) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		try {
			// Use Google Places API or similar geocoding service
			// For now, we'll use a simple mock search
			const mockResults = [
				{
					id: '1',
					name: `${query} - Centre-ville`,
					address: 'Centre-ville, France',
					latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
					longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
				},
				{
					id: '2',
					name: `${query} - Gare`,
					address: 'Gare, France',
					latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
					longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
				},
				{
					id: '3',
					name: `${query} - Aéroport`,
					address: 'Aéroport, France',
					latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
					longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
				},
			];
			
			setSearchResults(mockResults);
		} catch (error) {
			Alert.alert('Erreur', 'Impossible de rechercher l\'emplacement');
		} finally {
			setIsSearching(false);
		}
	};

	const selectSearchResult = (result: any) => {
		const location = {
			latitude: result.latitude,
			longitude: result.longitude
		};
		setSelectedLocation(location);
		setStepName(result.name);
		setSearchQuery('');
		setSearchResults([]);
		
		// Animate to selected location
		if (mapRef.current) {
			mapRef.current.animateToRegion({
				...location,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			}, 1000);
		}
	};

	if (!MapView) {
		return (
			<View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
				<Text>Carte indisponible. Installez react-native-maps pour l'affichage.</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<MapView 
				ref={mapRef} 
				style={StyleSheet.absoluteFill} 
				initialRegion={region} 
				mapType={Platform.OS === 'ios' ? 'hybrid' : 'terrain'}
				onPress={handleMapPress}
			>
				{steps.map((s, idx) => (
					<Marker 
						key={s.id} 
						coordinate={{ latitude: s.latitude, longitude: s.longitude }} 
						title={`${idx + 1}. ${s.name}`} 
						description={s.description ?? ''} 
					/>
				))}
				{selectedLocation && (
					<Marker 
						coordinate={selectedLocation} 
						title="Nouvelle étape" 
						description="Appuyez sur 'Ajouter' pour confirmer"
						pinColor="red"
					/>
				)}
				{currentLocation && (
					<Marker 
						coordinate={currentLocation} 
						title="Ma position" 
						description="Votre position actuelle"
						pinColor="blue"
					/>
				)}
				{steps.length > 1 && (
					<Polyline 
						coordinates={steps.map(s => ({ latitude: s.latitude, longitude: s.longitude }))} 
						strokeColor="#10b981" 
						strokeWidth={4} 
					/>
				)}
			</MapView>

			{/* Header with back button */}
			<View style={styles.header}>
				<Pressable style={styles.backButton} onPress={() => router.back()}>
					<Text style={styles.backIcon}>←</Text>
				</Pressable>
				<Text style={styles.headerTitle}>
					{showAddForm ? 'Ajouter une étape' : 'Carte du voyage'}
				</Text>
				{showAddForm ? (
					<Pressable style={styles.cancelButton} onPress={() => setShowAddForm(false)}>
						<Text style={styles.cancelText}>Annuler</Text>
					</Pressable>
				) : (
					<Pressable style={styles.locationButton} onPress={handleMyLocation}>
						<Text style={styles.locationIcon}>📍</Text>
					</Pressable>
				)}
			</View>

			{/* Search bar */}
			{showAddForm && (
				<View style={styles.searchContainer}>
					<View style={styles.searchBar}>
						<Text style={styles.searchIcon}>🔍</Text>
						<TextInput
							style={styles.searchInput}
							placeholder="Rechercher un emplacement..."
							value={searchQuery}
							onChangeText={(text) => {
								setSearchQuery(text);
								searchLocation(text);
							}}
						/>
						{isSearching && <ActivityIndicator size="small" color="#10b981" />}
					</View>
					
					{searchResults.length > 0 && (
						<View style={styles.searchResults}>
							<FlatList
								data={searchResults}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => (
									<Pressable 
										style={styles.searchResultItem}
										onPress={() => selectSearchResult(item)}
									>
										<Text style={styles.searchResultName}>{item.name}</Text>
										<Text style={styles.searchResultAddress}>{item.address}</Text>
									</Pressable>
								)}
								style={styles.searchResultsList}
							/>
						</View>
					)}
				</View>
			)}

			{/* Add step form */}
			{showAddForm && (
				<View style={styles.addForm}>
					<Text style={styles.formTitle}>
						{selectedLocation ? 'Étape sélectionnée' : 'Sélectionnez un emplacement sur la carte'}
					</Text>
					<TextInput
						style={styles.input}
						placeholder="Nom de l'étape (ex: Paris, Tour Eiffel)"
						value={stepName}
						onChangeText={setStepName}
					/>
					<TextInput
						style={[styles.input, styles.textArea]}
						placeholder="Description (optionnel)"
						value={stepDescription}
						onChangeText={setStepDescription}
						multiline
						numberOfLines={2}
					/>
					{selectedLocation && (
						<View style={styles.locationInfo}>
							<Text style={styles.coords}>
								📍 {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
							</Text>
							<Text style={styles.address}>
								🏠 {stepName || 'Adresse en cours de chargement...'}
							</Text>
						</View>
					)}
					<Pressable 
						style={[styles.addButton, (!selectedLocation || !stepName.trim()) && styles.addButtonDisabled]} 
						onPress={handleAddStep}
						disabled={!selectedLocation || !stepName.trim()}
					>
						<Text style={styles.addButtonText}>Ajouter l'étape</Text>
					</Pressable>
				</View>
			)}

			{/* Add step button when not in add mode */}
			{!showAddForm && (
				<View style={styles.bottomActions}>
					<Pressable style={styles.addStepButton} onPress={() => setShowAddForm(true)}>
						<Text style={styles.addStepButtonText}>+ Ajouter une étape</Text>
					</Pressable>
				</View>
			)}

			{/* Recenter button */}
			<View style={styles.recenterButtonContainer}>
				<Pressable style={styles.recenterButton} onPress={handleMyLocation}>
					<Text style={styles.recenterIcon}>🎯</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	header: {
		position: 'absolute',
		top: 50,
		left: 0,
		right: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		zIndex: 1000,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.95)',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	backIcon: {
		fontSize: 20,
		fontWeight: '900',
		color: '#0f172a',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0f172a',
		backgroundColor: 'rgba(255,255,255,0.95)',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
	},
	cancelButton: {
		backgroundColor: '#ef4444',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 16,
	},
	cancelText: {
		color: 'white',
		fontWeight: '700',
		fontSize: 14,
	},
	locationButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.95)',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	locationIcon: {
		fontSize: 18,
	},
	addForm: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'white',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 20,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: -5 },
		elevation: 10,
	},
	formTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 16,
		textAlign: 'center',
	},
	input: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 12,
		fontSize: 16,
		backgroundColor: '#f9fafb',
	},
	textArea: {
		height: 60,
		textAlignVertical: 'top',
	},
	locationInfo: {
		marginBottom: 16,
		alignItems: 'center',
	},
	coords: {
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
		marginBottom: 4,
		fontWeight: '600',
	},
	address: {
		fontSize: 14,
		color: '#0f172a',
		textAlign: 'center',
		fontWeight: '600',
	},
	addButton: {
		backgroundColor: '#10b981',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		shadowColor: '#10b981',
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	addButtonDisabled: {
		backgroundColor: '#9ca3af',
		shadowOpacity: 0,
		elevation: 0,
	},
	addButtonText: {
		color: 'white',
		fontWeight: '800',
		fontSize: 16,
	},
	bottomActions: {
		position: 'absolute',
		bottom: 30,
		left: 16,
		right: 16,
		alignItems: 'center',
	},
	addStepButton: {
		backgroundColor: '#10b981',
		borderRadius: 25,
		paddingHorizontal: 24,
		paddingVertical: 16,
		shadowColor: '#10b981',
		shadowOpacity: 0.4,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6,
	},
	addStepButtonText: {
		color: 'white',
		fontWeight: '800',
		fontSize: 16,
	},
	searchContainer: {
		position: 'absolute',
		top: 100,
		left: 16,
		right: 16,
		zIndex: 1000,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'white',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 4,
	},
	searchIcon: {
		fontSize: 16,
		marginRight: 12,
		color: '#6b7280',
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#0f172a',
	},
	searchResults: {
		backgroundColor: 'white',
		borderRadius: 12,
		marginTop: 8,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 4,
		maxHeight: 200,
	},
	searchResultsList: {
		maxHeight: 200,
	},
	searchResultItem: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	searchResultName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 4,
	},
	searchResultAddress: {
		fontSize: 14,
		color: '#6b7280',
	},
	recenterButtonContainer: {
		position: 'absolute',
		bottom: 120,
		right: 16,
		zIndex: 1000,
	},
	recenterButton: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: 'white',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
		borderWidth: 2,
		borderColor: '#f1f5f9',
	},
	recenterIcon: {
		fontSize: 24,
	},
});



