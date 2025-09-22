import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import LocationIcon from '../../../components/ui/location-icon';
import { createStep, listSteps, Step } from '../../../lib/steps';
import { getTrip } from '../../../lib/trips';

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
	const [startingPoint, setStartingPoint] = useState<{ latitude: number; longitude: number } | null>(null);
	const [finalDestination, setFinalDestination] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
	const [isReordering, setIsReordering] = useState(false);
	const [draggedStep, setDraggedStep] = useState<Step | null>(null);
	const [showLegend, setShowLegend] = useState(false);
	const mapRef = useRef<any>(null);

	const loadSteps = useCallback(async () => {
		if (!id) return;
		const data = await listSteps(id);
		setSteps(data);
		
		// Le point de départ doit être défini manuellement par l'utilisateur
		// Pour l'instant, on ne définit pas automatiquement de point de départ
		setStartingPoint(null);
		
		// Charger la destination finale du voyage
		const trip = await getTrip(id);
		if (trip?.destination) {
			try {
				const results = await Location.geocodeAsync(trip.destination);
				if (results.length > 0) {
					setFinalDestination({
						latitude: results[0].latitude,
						longitude: results[0].longitude,
						name: trip.destination
					});
				}
			} catch (error) {
				console.log('Erreur lors de la géocodification de la destination:', error);
			}
		}
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
		// Si on est en mode ajout d'étape et qu'on a une position actuelle, zoomer dessus
		if (showAddForm && currentLocation) {
			return { 
				latitude: currentLocation.latitude, 
				longitude: currentLocation.longitude, 
				latitudeDelta: 0.01, 
				longitudeDelta: 0.01 
			};
		}
		
		// Si pas d'étapes, centrer sur la position actuelle
		if (steps.length === 0) {
			if (currentLocation) {
				return { 
					latitude: currentLocation.latitude, 
					longitude: currentLocation.longitude, 
					latitudeDelta: 0.1, 
					longitudeDelta: 0.1 
				};
			}
			// Si pas de position actuelle, centrer sur la France (centre géographique)
			return { latitude: 46.2276, longitude: 2.2137, latitudeDelta: 2.0, longitudeDelta: 2.0 };
		}
		
		// Centrer sur le voyage complet (du point de départ aux étapes + destination finale)
		const allPoints = [...steps];
		if (finalDestination) {
			const finalDestinationStep: Step = {
				id: -1, // ID temporaire pour la destination finale
				trip_id: Number(tripId),
				name: finalDestination.name,
				description: 'Destination finale',
				latitude: finalDestination.latitude,
				longitude: finalDestination.longitude,
				order_index: steps.length + 1,
			};
			allPoints.push(finalDestinationStep);
		}
		
		const lats = allPoints.map(s => s.latitude);
		const lngs = allPoints.map(s => s.longitude);
		const minLat = Math.min(...lats);
		const maxLat = Math.max(...lats);
		const minLng = Math.min(...lngs);
		const maxLng = Math.max(...lngs);
		
		// Calculer le centre du voyage
		const latitude = (minLat + maxLat) / 2;
		const longitude = (minLng + maxLng) / 2;
		
		// Calculer les deltas pour inclure tout le voyage avec une marge
		const latRange = maxLat - minLat;
		const lngRange = maxLng - minLng;
		const margin = 0.1; // Marge de 10% autour du voyage
		
		const latitudeDelta = Math.max(0.05, latRange * 1.2 + margin);
		const longitudeDelta = Math.max(0.05, lngRange * 1.2 + margin);
		
		return { latitude, longitude, latitudeDelta, longitudeDelta };
	}, [steps, showAddForm, currentLocation, finalDestination, id]);

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
			// Si c'est la première étape, la définir comme point de départ
			if (steps.length === 0) {
				setStartingPoint(selectedLocation);
			}

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
			// Utiliser l'API de géocodage d'Expo Location
			const results = await Location.geocodeAsync(query);
			const searchResults = results.map((result, index) => ({
				id: `${index}`,
				name: query,
				address: `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
				latitude: result.latitude,
				longitude: result.longitude,
			}));
			
			setSearchResults(searchResults);
		} catch (error) {
			console.log('Erreur de recherche:', error);
			setSearchResults([]);
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
						pinColor="blue"
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
						pinColor="purple"
					/>
				)}
				{startingPoint && (
					<Marker 
						coordinate={startingPoint} 
						title="Point de départ" 
						description="Début du voyage"
						pinColor="green"
					/>
				)}
				{finalDestination && (
					<Marker 
						coordinate={{ latitude: finalDestination.latitude, longitude: finalDestination.longitude }} 
						title="Destination finale" 
						description={finalDestination.name}
						pinColor="orange"
					/>
				)}
				{/* Ligne pointillée entre position actuelle et point de départ */}
				{currentLocation && startingPoint && (
					<Polyline 
						coordinates={[currentLocation, startingPoint]} 
						strokeColor="#2FB6A1" 
						strokeWidth={3}
						strokePattern={[10, 5]} // Ligne pointillée
					/>
				)}
				
				{/* Lignes reliant les étapes entre elles */}
				{steps.length > 1 && (
					<Polyline 
						coordinates={steps.map(s => ({ latitude: s.latitude, longitude: s.longitude }))} 
						strokeColor="#10b981" 
						strokeWidth={4} 
					/>
				)}
				
				{/* Ligne pointillée vers la destination finale si elle existe */}
				{steps.length > 0 && finalDestination && (
					<Polyline 
						coordinates={[
							{ latitude: steps[steps.length - 1].latitude, longitude: steps[steps.length - 1].longitude },
							{ latitude: finalDestination.latitude, longitude: finalDestination.longitude }
						]} 
						strokeColor="#f59e0b" 
						strokeWidth={3}
						strokePattern={[5, 5]} // Ligne pointillée pour la destination finale
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
						<LocationIcon size={20} />
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
						placeholder="Nom de l'étape (ex: Tour Eiffel, Lyon)"
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
							<View style={styles.coordsContainer}>
								<LocationIcon size={16} />
								<Text style={styles.coords}>
									{selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
								</Text>
							</View>
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

			{/* Légende des couleurs - au-dessus du bouton ajouter une étape */}
			{!showAddForm && showLegend && (
				<View style={styles.colorLegend}>
					<Text style={styles.legendTitle}>Légende</Text>
					<View style={styles.legendItems}>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
							<Text style={styles.legendText}>Ma position</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
							<Text style={styles.legendText}>Point de départ</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
							<Text style={styles.legendText}>Étapes du voyage</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
							<Text style={styles.legendText}>Destination finale</Text>
						</View>
					</View>
				</View>
			)}

			{/* Add step button when not in add mode */}
			{!showAddForm && (
				<View style={styles.bottomActions}>
					{/* Bouton toggle légende - à gauche du bouton principal */}
					<Pressable 
						style={[styles.legendToggleButton, showLegend && styles.legendToggleButtonActive]} 
						onPress={() => setShowLegend(!showLegend)}
					>
						<Text style={styles.legendToggleIcon}>
							{showLegend ? '📊' : '📋'}
						</Text>
					</Pressable>
					
					<Pressable style={styles.addStepButton} onPress={() => setShowAddForm(true)}>
						<Text style={styles.addStepButtonText}>+ Ajouter une étape</Text>
					</Pressable>
					{steps.length > 1 && (
						<Pressable 
							style={[styles.reorderButton, isReordering && styles.reorderButtonActive]} 
							onPress={() => setIsReordering(!isReordering)}
						>
							<Text style={styles.reorderButtonText}>
								{isReordering ? 'Terminer' : 'Réorganiser'}
							</Text>
						</Pressable>
					)}
				</View>
			)}

			{/* Message d'information si pas d'étapes */}
			{!showAddForm && steps.length === 0 && (
				<View style={styles.infoMessage}>
					<Text style={styles.infoIcon}>📍</Text>
					<Text style={styles.infoTitle}>Aucune étape définie</Text>
					<Text style={styles.infoText}>Ajoutez votre première étape (point de départ) pour commencer votre voyage</Text>
				</View>
			)}

			{/* Message d'information si pas de point de départ défini */}
			{!showAddForm && steps.length > 0 && !startingPoint && (
				<View style={styles.infoMessage}>
					<Text style={styles.infoIcon}>⚠️</Text>
					<Text style={styles.infoTitle}>Point de départ manquant</Text>
					<Text style={styles.infoText}>Définissez la première étape comme point de départ pour voir l'itinéraire complet</Text>
					<Pressable 
						style={styles.setStartingPointButton} 
						onPress={() => {
							if (steps.length > 0) {
								setStartingPoint({
									latitude: steps[0].latitude,
									longitude: steps[0].longitude
								});
							}
						}}
					>
						<Text style={styles.setStartingPointButtonText}>Définir comme point de départ</Text>
					</Pressable>
				</View>
			)}

			{/* Message d'information si pas de destination finale */}
			{!showAddForm && steps.length > 0 && !finalDestination && (
				<View style={styles.infoMessage}>
					<Text style={styles.infoIcon}>🎯</Text>
					<Text style={styles.infoTitle}>Destination finale manquante</Text>
					<Text style={styles.infoText}>Définissez une destination finale dans les paramètres du voyage</Text>
				</View>
			)}
			
			{/* Liste des étapes pour réorganisation */}
			{isReordering && steps.length > 0 && (
				<View style={styles.stepsListContainer}>
					<Text style={styles.stepsListTitle}>Réorganiser les étapes</Text>
					<FlatList
						data={steps.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))}
						keyExtractor={(item) => String(item.id)}
						renderItem={({ item, index }) => (
							<View style={styles.stepItem}>
								<Text style={styles.stepNumber}>{index + 1}</Text>
								<Text style={styles.stepName}>{item.name}</Text>
								<Pressable 
									style={styles.dragHandle}
									onPress={() => setDraggedStep(item)}
								>
									<Text style={styles.dragIcon}>⋮⋮</Text>
								</Pressable>
							</View>
						)}
						style={styles.stepsList}
					/>
				</View>
			)}
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
	coordsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	coords: {
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
		marginLeft: 4,
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
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
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
	reorderButton: {
		backgroundColor: '#6b7280',
		borderRadius: 25,
		paddingHorizontal: 20,
		paddingVertical: 12,
		marginTop: 8,
	},
	reorderButtonActive: {
		backgroundColor: '#10b981',
	},
	reorderButtonText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 14,
	},
	stepsListContainer: {
		position: 'absolute',
		bottom: 100,
		left: 16,
		right: 16,
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 16,
		maxHeight: 200,
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	stepsListTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 12,
	},
	stepsList: {
		maxHeight: 120,
	},
	stepItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		marginBottom: 4,
	},
	stepNumber: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#10b981',
		color: 'white',
		textAlign: 'center',
		lineHeight: 24,
		fontWeight: '700',
		fontSize: 12,
		marginRight: 12,
	},
	stepName: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	dragHandle: {
		padding: 4,
	},
	dragIcon: {
		fontSize: 16,
		color: '#9ca3af',
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
	infoMessage: {
		position: 'absolute',
		top: 100,
		left: 16,
		right: 16,
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	infoIcon: {
		fontSize: 32,
		marginBottom: 8,
	},
	infoTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 4,
		textAlign: 'center',
	},
	infoText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 20,
	},
	colorLegend: {
		position: 'absolute',
		bottom: 100, // Juste au-dessus du bouton "Ajouter une étape"
		left: 16,
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 12,
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
		minWidth: 200,
		maxWidth: 280,
	},
	legendTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 8,
		textAlign: 'center',
	},
	legendItems: {
		gap: 6,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	legendDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	legendText: {
		fontSize: 12,
		color: '#374151',
		fontWeight: '500',
	},
	legendToggleButton: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: 'white',
		borderWidth: 2,
		borderColor: '#d1d5db',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	legendToggleButtonActive: {
		backgroundColor: '#10b981',
		borderColor: '#059669',
	},
	legendToggleIcon: {
		fontSize: 20,
	},
	setStartingPointButton: {
		backgroundColor: '#10b981',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginTop: 12,
		alignSelf: 'center',
	},
	setStartingPointButtonText: {
		color: 'white',
		fontSize: 14,
		fontWeight: '600',
	},
});



