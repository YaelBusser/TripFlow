import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import LocationIcon from '../../../components/ui/location-icon';
import { createStep, listSteps, Step, updateStep } from '../../../lib/steps';
import { getTrip, setTripAdventureStarted } from '../../../lib/trips';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let DraggableFlatList: any = null;
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
try {
	// Draggable list is optional; fallback to FlatList if not installed
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	DraggableFlatList = require('react-native-draggable-flatlist').default;
} catch (e) {
	DraggableFlatList = null;
}

export default function TripMapScreen() {
	const { tripId, addStep, focusLat, focusLng } = useLocalSearchParams<{ tripId: string; addStep?: string; focusLat?: string; focusLng?: string }>();
	const id = Number(tripId);
	const [steps, setSteps] = useState<Step[]>([]);
	const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
	const [stepName, setStepName] = useState('');
	const [stepDescription, setStepDescription] = useState('');
	const [isStepNameAuto, setIsStepNameAuto] = useState(true);
	const [stepDate, setStepDate] = useState(new Date().toISOString().split('T')[0]);
	const [showAddForm, setShowAddForm] = useState(addStep === 'true');
	const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [finalDestination, setFinalDestination] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
	const [isReordering, setIsReordering] = useState(false);
	const [isStepModalVisible, setIsStepModalVisible] = useState(false);
	const [modalStep, setModalStep] = useState<Step | null>(null);
	const [modalDescription, setModalDescription] = useState('');
	const [blockedIndex, setBlockedIndex] = useState<number | null>(null);
	const [adventureStarted, setAdventureStarted] = useState(false);
	const sortedSteps = useMemo(() => {
		return [...steps].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
	}, [steps]);
	const [draggedStep, setDraggedStep] = useState<Step | null>(null);
	const [showLegend, setShowLegend] = useState(false);
	const mapRef = useRef<any>(null);
	const startingStepCreatedRef = useRef(false);

	const loadSteps = useCallback(async () => {
		if (!id) return;
		// Réinitialiser le ref pour le nouveau voyage
		startingStepCreatedRef.current = false;
		const data = await listSteps(id);
		// Ordonner les étapes par order_index (ordre d'ajout)
		const sortedSteps = data.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
		setSteps(sortedSteps);

		// Étapes chargées (log supprimé pour éviter le spam)

		// Ne plus déduire adventureStarted de la présence du point de départ

		// La destination finale: si aucune étape en base, on utilise la destination du trip si existante; sinon null
		if (sortedSteps.length > 0) {
			const lastStep = sortedSteps[sortedSteps.length - 1];
			setFinalDestination({
				latitude: lastStep.latitude,
				longitude: lastStep.longitude,
				name: lastStep.name
			});
		} else {
			setFinalDestination(null);
		}
	}, [id]);

	// Créer un point de départ automatiquement s'il n'existe pas encore
	const ensureStartingStep = useCallback(async () => {
		if (!id || !currentLocation || startingStepCreatedRef.current) return;

		console.log('Vérification du point de départ...');
		startingStepCreatedRef.current = true; // Marquer immédiatement pour éviter les doublons

		const existing = await listSteps(id);
		const hasStart = existing.some(s => s.name === 'Point de départ');
		if (!hasStart) {
			console.log('Création du point de départ automatique...');

			// Décaler toutes les étapes existantes de +1 pour libérer l'index 0
			const ordered = existing.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
			for (let i = 0; i < ordered.length; i++) {
				await updateStep(ordered[i].id, { order_index: (ordered[i].order_index || 0) + 1 });
			}
			// Créer l'étape de départ en 0
			await createStep({
				trip_id: id,
				name: 'Point de départ',
				latitude: currentLocation.latitude,
				longitude: currentLocation.longitude,
				start_date: new Date().getTime(),
				end_date: null,
				description: 'Point de départ (temporaire)',
				order_index: 0,
			});
			console.log('Point de départ créé, rechargement des étapes...');
			// Recharger les étapes et forcer la mise à jour
			const refreshed = await listSteps(id);
			const sortedRefreshed = refreshed.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
			setSteps(sortedRefreshed);
			console.log('Étapes rechargées:', sortedRefreshed);
		} else {
			console.log('Point de départ déjà présent en base');
		}
	}, [id, currentLocation]);

	/* start adventure handled by explicit button */

	const hasAutoCenteredRef = useRef(false);

	useEffect(() => {
		(async () => {
			await loadSteps();
			// Charger l'état adventure_started depuis le voyage pour persister le bouton
			try {
				const trip = await getTrip(id);
				if (trip && typeof trip.adventure_started !== 'undefined' && trip.adventure_started !== null) {
					setAdventureStarted(!!trip.adventure_started);
				}
			} catch { }

			// Get current location automatiquement
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status === 'granted') {
					const location = await Location.getCurrentPositionAsync({
						accuracy: Location.Accuracy.High
					});
					const newLocation = {
						latitude: location.coords.latitude,
						longitude: location.coords.longitude
					};
					setCurrentLocation(newLocation);
					// Le point de départ sera créé par le useEffect séparé

					// Ne plus centrer automatiquement sur la position actuelle
					// La région initiale est calculée pour montrer l'ensemble du voyage
				} else {
					console.log('Permission de localisation refusée');
				}
			} catch (error) {
				console.log('Erreur de localisation:', error);
			}
		})();
	}, [loadSteps]);

	// S'assurer que le point de départ est créé quand on a la localisation
	useEffect(() => {
		if (currentLocation && id && !startingStepCreatedRef.current) {
			console.log('Déclenchement de ensureStartingStep depuis useEffect');
			ensureStartingStep();
		}
	}, [currentLocation, id]);

	// Si on vient avec des coordonnées à centrer depuis la page d'une étape
	useEffect(() => {
		if (!mapRef.current) return;
		if (typeof focusLat === 'string' && typeof focusLng === 'string') {
			const lat = parseFloat(focusLat);
			const lng = parseFloat(focusLng);
			if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
				setTimeout(() => {
					mapRef.current?.animateToRegion({
						latitude: lat,
						longitude: lng,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01,
					}, 800);
				}, 300);
			}
		}
	}, [focusLat, focusLng]);

	// Suivi de la position: mettre à jour le point de départ tant que l'aventure n'est pas démarrée
	useEffect(() => {
		let subscription: any = null;
		const THRESHOLD_METERS = 75; // seuil de mouvement pour MAJ du départ

		const toRad = (v: number) => (v * Math.PI) / 180;
		const getDistanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
			const R = 6371000; // Terre en m
			const dLat = toRad(b.latitude - a.latitude);
			const dLon = toRad(b.longitude - a.longitude);
			const lat1 = toRad(a.latitude);
			const lat2 = toRad(b.latitude);
			const sinDLat = Math.sin(dLat / 2);
			const sinDLon = Math.sin(dLon / 2);
			const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
			return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
		};

		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') return;
				subscription = await Location.watchPositionAsync(
					{
						accuracy: Location.Accuracy.High,
						timeInterval: 5000,
						distanceInterval: 25,
					},
					async (loc) => {
						const newLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
						setCurrentLocation(newLoc);
						if (!adventureStarted && steps.length > 0) {
							const first = steps[0];
							if (first && first.name === 'Point de départ') {
								const dist = getDistanceMeters({ latitude: first.latitude, longitude: first.longitude }, newLoc);
								if (dist >= THRESHOLD_METERS) {
									await updateStep(first.id, { latitude: newLoc.latitude, longitude: newLoc.longitude });
									const refreshed = await listSteps(id);
									setSteps(refreshed.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
								}
							}
						}
					}
				);
			} catch { }
		})();

		return () => {
			try { subscription && subscription.remove && subscription.remove(); } catch { }
		};
	}, [adventureStarted, steps, id]);

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

		// Si pas d'étapes, centrer sur la position actuelle ou la France
		if (sortedSteps.length === 0) {
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
		const allPoints = [...sortedSteps];
		
		// Inclure la position actuelle si disponible pour avoir une vue d'ensemble
		if (currentLocation) {
			allPoints.push({
				id: -2, // ID temporaire pour la position actuelle
				trip_id: Number(tripId),
				name: 'Position actuelle',
				description: 'Votre position',
				latitude: currentLocation.latitude,
				longitude: currentLocation.longitude,
				order_index: -1,
			});
		}
		
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

		// Calculer les deltas pour inclure tout le voyage avec un dézoom maximum
		const latRange = maxLat - minLat;
		const lngRange = maxLng - minLng;
		
		// Dézoom maximum tout en gardant les étapes visibles
		const latitudeDelta = Math.max(0.5, latRange * 2.0 + 0.3);
		const longitudeDelta = Math.max(0.5, lngRange * 2.0 + 0.3);

		return { latitude, longitude, latitudeDelta, longitudeDelta };
	}, [sortedSteps, showAddForm, currentLocation, finalDestination, id]);

	const handleMapPress = async (event: any) => {
		if (showAddForm) {
			const { latitude, longitude } = event.nativeEvent.coordinate;
			setSelectedLocation({ latitude, longitude });

			// Get address from coordinates
			const address = await getAddressFromCoordinates(latitude, longitude);
			if (isStepNameAuto || !stepName.trim()) {
				setStepName(address);
				setIsStepNameAuto(true);
			}
		}
	};

	const handleMapLongPress = async (event: any) => {
		if (!showAddForm) return;
		return handleMapPress(event);
	};

	// Démarrer l'aventure: créer l'étape de départ depuis la position actuelle
	const handleStartAdventure = async () => {
		if (!currentLocation) {
			Alert.alert('Erreur', 'Position actuelle non disponible. Veuillez d\'abord obtenir votre localisation.');
			return;
		}

		try {
			// Charger l'état actuel depuis la base
			const existing = (await listSteps(id)).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
			const existingStart = existing.find(s => s.name === 'Point de départ');

			if (!existingStart) {
				// Décaler toutes les étapes existantes de +1 pour libérer l'index 0
				for (let i = 0; i < existing.length; i++) {
					await updateStep(existing[i].id, { order_index: (existing[i].order_index || 0) + 1 });
				}
				// Créer le point de départ à l'index 0
				await createStep({
					trip_id: id,
					name: 'Point de départ',
					latitude: currentLocation.latitude,
					longitude: currentLocation.longitude,
					start_date: new Date().getTime(),
					end_date: null,
					description: 'Début de votre aventure',
					order_index: 0
				});
			} else {
				// Redéfinir simplement la position du point de départ avec la position actuelle
				await updateStep(existingStart.id, {
					latitude: currentLocation.latitude,
					longitude: currentLocation.longitude,
					start_date: new Date().getTime(),
				});
			}

			setAdventureStarted(true);
			await setTripAdventureStarted(id, true);
			const refreshed = await listSteps(id);
			setSteps(refreshed.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
			Alert.alert('Aventure démarrée !', 'Votre point de départ a été fixé.');
		} catch (error) {
			console.log('Erreur lors du démarrage:', error);
			Alert.alert('Erreur', 'Impossible de démarrer l\'aventure');
		}
	};

	const handleAddStep = async () => {
		if (!selectedLocation) {
			Alert.alert('Erreur', 'Veuillez sélectionner un emplacement sur la carte');
			return;
		}

		try {
			// Calculer l'index d'insertion: toujours avant l'arrivée si elle existe
			const numExisting = steps.length;
			const insertIndex = Math.max(0, numExisting - 1);
			const previousArrival = numExisting >= 1 ? steps[numExisting - 1] : null;
			const existingWithoutArrival = numExisting >= 1 ? steps.slice(0, Math.max(0, numExisting - 1)) : [];

			// Créer la nouvelle étape avec des valeurs par défaut
			const newStepId = await createStep({
				trip_id: id,
				name: stepName.trim() || 'Nouvelle étape',
				latitude: selectedLocation.latitude,
				longitude: selectedLocation.longitude,
				start_date: new Date().getTime(),
				end_date: null,
				description: null,
				order_index: insertIndex
			});

			// Recharger depuis la base pour récupérer l'étape créée
			const all = await listSteps(id);
			const newStep = all.find(s => s.id === newStepId);

			// Construire l'ordre souhaité: [départ et intermédiaires sans arrivée] + [nouvelle étape] + [arrivée]
			let desiredOrder: typeof all = [] as any;
			if (numExisting === 0) {
				desiredOrder = newStep ? [newStep] : [];
			} else if (numExisting === 1 && previousArrival) {
				desiredOrder = newStep ? [newStep, previousArrival] : [previousArrival];
			} else if (previousArrival) {
				desiredOrder = newStep ? [...existingWithoutArrival, newStep, previousArrival] : [...existingWithoutArrival, previousArrival];
			}

			// Réindexer proprement
			for (let i = 0; i < desiredOrder.length; i++) {
				const s = desiredOrder[i];
				if (s.order_index !== i) {
					await updateStep(s.id, { order_index: i });
				}
			}

			// Recharger les étapes dans l'ordre final et mettre à jour la destination finale (dernier élément)
			const finalData = await listSteps(id);
			const finalSortedData = finalData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
			setSteps(finalSortedData);
			if (finalSortedData.length > 0) {
				const last = finalSortedData[finalSortedData.length - 1];
				setFinalDestination({ latitude: last.latitude, longitude: last.longitude, name: last.name });
			}
			console.log('Étapes après ajout:', finalSortedData.map(s => ({ name: s.name, order: s.order_index })));

			// Reset form et rediriger
			setSelectedLocation(null);
			setShowAddForm(false);

			// Rediriger vers la page de l'étape nouvellement créée
			router.push(`/trip/${id}/step/${newStepId}`);
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Impossible d\'ajouter l\'étape');
		}
	};

	const handleMyLocation = async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Permission requise', 'L\'accès à la localisation est nécessaire');
				return;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.High
			});

			const newLocation = {
				latitude: location.coords.latitude,
				longitude: location.coords.longitude
			};
			setCurrentLocation(newLocation);

			// Animate to current location immédiatement
			if (mapRef.current) {
				mapRef.current.animateToRegion({
					...newLocation,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				}, 1000);
			}
		} catch (error) {
			console.log('Erreur de localisation:', error);
			Alert.alert('Erreur', 'Impossible d\'obtenir votre position. Vérifiez que la localisation est activée.');
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
				onLongPress={handleMapLongPress}
			>
				{/* Marqueur de la position actuelle (toujours affiché) */}
				{currentLocation && (
					<Marker
						coordinate={currentLocation}
						anchor={{ x: 0.5, y: 0.5 }}
					>
						<View style={styles.currentLocationMarker}>
							<View style={styles.currentLocationInner} />
						</View>
					</Marker>
				)}

				{/* Marqueurs des étapes */}
				{sortedSteps.map((s, idx) => {
					const isFirstStep = idx === 0;
					const isLastStep = idx === sortedSteps.length - 1;

					return (
						<Marker
							key={s.id}
							coordinate={{ latitude: s.latitude, longitude: s.longitude }}
							title={`${idx + 1}. ${s.name}`}
							description={s.description ?? ''}
							pinColor={isFirstStep ? "green" : isLastStep ? "orange" : "blue"}
							onCalloutPress={() => router.push(`/trip/${id}/step/${s.id}`)}
							onPress={() => router.push(`/trip/${id}/step/${s.id}`)}
						/>
					);
				})}
				{selectedLocation && (
					<Marker
						coordinate={selectedLocation}
						title="Nouvelle étape"
						description="Appuyez sur 'Ajouter' pour confirmer"
						pinColor="red"
					/>
				)}
				{/* (duplicate current location marker removed) */}
				{finalDestination && (
					<Marker
						coordinate={{ latitude: finalDestination.latitude, longitude: finalDestination.longitude }}
						title="Destination finale"
						description={finalDestination.name}
						pinColor="orange"
					/>
				)}
				{/* Lignes reliant les étapes */}
				{sortedSteps.length > 0 && (
					<>
						{/* Lignes reliant les étapes intermédiaires (sans l'arrivée) */}
						{sortedSteps.length >= 2 && (
							<Polyline
								coordinates={(sortedSteps.length === 2 ? sortedSteps : sortedSteps.slice(0, -1)).map(s => ({
									latitude: s.latitude, longitude: s.longitude
								}))}
								strokeColor="#3b82f6"
								strokeWidth={4}
							/>
						)}

						{/* Ligne de la dernière étape intermédiaire vers l'arrivée */}
						{sortedSteps.length > 2 && (
							<Polyline
								coordinates={[
									{ latitude: sortedSteps[sortedSteps.length - 2].latitude, longitude: sortedSteps[sortedSteps.length - 2].longitude },
									{ latitude: sortedSteps[sortedSteps.length - 1].latitude, longitude: sortedSteps[sortedSteps.length - 1].longitude }
								]}
								strokeColor="#f59e0b"
								strokeWidth={4}
								strokePattern={[10, 5]} // Ligne pointillée orange
							/>
						)}
					</>
				)}

				{/* Pas besoin de ligne séparée vers la destination finale car elle fait partie des étapes */}
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
								keyExtractor={(item: any) => item.id}
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

			{/* Add step form - simplifié */}
			{showAddForm && (
				<View style={styles.addForm}>
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
						style={[styles.addButton, !selectedLocation && styles.addButtonDisabled]}
						onPress={handleAddStep}
						disabled={!selectedLocation}
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
							<View style={styles.legendRing}>
								<View style={styles.legendRingInner} />
							</View>
							<Text style={styles.legendText}>Ma position</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendBadge, styles.legendBadgeStart]} />
							<Text style={styles.legendText}>Point de départ</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendBadge, styles.legendBadgeMid]} />
							<Text style={styles.legendText}>Étapes intermédiaires</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendBadge, styles.legendBadgeArrival]} />
							<Text style={styles.legendText}>Point d'arrivée</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendLine, { backgroundColor: '#8b5cf6' }]} />
							<Text style={styles.legendText}>Trajet vers le départ</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendLine, { backgroundColor: '#3b82f6' }]} />
							<Text style={styles.legendText}>Étapes intermédiaires</Text>
						</View>
						<View style={styles.legendItem}>
							<View style={[styles.legendLine, { backgroundColor: '#f59e0b' }]} />
							<Text style={styles.legendText}>Vers l'arrivée</Text>
						</View>
					</View>
				</View>
			)}

			{/* Boutons fixes - disposition séparée */}
			{!showAddForm && (
				<>
					{/* Bouton légende - bas gauche */}
					<Pressable
						style={[styles.legendToggleButtonFixed, showLegend && styles.legendToggleButtonActive]}
						onPress={() => {
							setShowLegend(!showLegend);
							// Masquer les étapes du voyage si on ouvre la légende
							if (!showLegend) {
								setIsReordering(false);
							}
						}}
					>
						<Text style={styles.legendToggleIcon}>
							{showLegend ? '📊' : '📋'}
						</Text>
					</Pressable>

					{/* Bouton ajouter étape - bas centre */}
					<Pressable style={styles.addStepButtonFixed} onPress={() => {
						setShowAddForm(true);
						// Masquer les étapes du voyage si on ouvre le formulaire d'ajout
						setIsReordering(false);
					}}>
						<Text style={styles.addStepButtonText}>+ Ajouter une étape</Text>
					</Pressable>

					{/* Bouton afficher étapes - bas droite */}
					{steps.length >= 1 && (
						<Pressable
							style={[styles.reorderIconButtonFixed, isReordering && styles.reorderIconButtonActive]}
							onPress={() => {
								setIsReordering(!isReordering);
								// Masquer la légende si on ouvre les étapes du voyage
								if (!isReordering) {
									setShowLegend(false);
								}
							}}
							accessibilityLabel="Réorganiser les étapes"
						>
							<Text style={styles.reorderIcon}>{isReordering ? '✖' : '🧭'}</Text>
						</Pressable>
					)}
				</>
			)}


			{/* Message d'information si pas d'étapes et aventure démarrée */}
			{!showAddForm && steps.length === 0 && adventureStarted && (
				<View style={styles.infoMessage}>
					<Text style={styles.infoIcon}>📍</Text>
					<Text style={styles.infoTitle}>Aucune étape définie</Text>
					<Text style={styles.infoText}>Ajoutez des étapes à votre voyage</Text>
				</View>
			)}


			{/* Message d'information si pas de destination finale */}
			{!showAddForm && !finalDestination && (
				<View style={styles.infoMessage}>
					<Text style={styles.infoIcon}>🎯</Text>
					<Text style={styles.infoTitle}>Aucun point d'arrivée défini</Text>
					<Text style={styles.infoText}>La prochaine étape que vous ajouterez deviendra votre point d'arrivée</Text>
					<Text style={styles.infoSubtext}>Vous pouvez bifurquer n'importe où, n'importe quand !</Text>
				</View>
			)}

			{/* Bouton démarrer l'aventure si pas encore démarrée */}
			{!showAddForm && !adventureStarted && currentLocation && (
				<View style={styles.startAdventureContainer}>
					<Text style={styles.startAdventureTitle}>🚀 Prêt pour l'aventure ?</Text>
					<Text style={styles.startAdventureText}>Démarrez votre voyage depuis votre position actuelle</Text>
					<Pressable
						style={styles.startAdventureButton}
						onPress={handleStartAdventure}
					>
						<Text style={styles.startAdventureButtonText}>Démarrer l'aventure</Text>
					</Pressable>
				</View>
			)}

			{/* Liste des étapes pour réorganisation */}
			{isReordering && steps.length > 0 && (
				<View style={styles.stepsListContainer}>
					<Text style={styles.stepsListTitle}>Étapes du voyage</Text>
					<Text style={styles.reorderNote}>Note: Le point de départ ne peut pas être modifié. Le point d'arrivée peut être déplacé.</Text>
					{DraggableFlatList ? (
						<DraggableFlatList
							data={sortedSteps}
							keyExtractor={(item: Step) => String(item.id)}
							renderItem={({ item, index, drag, isActive }: { item: Step; index: number; drag: () => void; isActive: boolean }) => {
								const currentIndex = (item?.order_index ?? (typeof index === 'number' ? index : sortedSteps.findIndex(s => s.id === item.id)));
								const isFirstStep = currentIndex === 0;
								const isLastStep = currentIndex === sortedSteps.length - 1;
								const isStartingStep = item.name === 'Point de départ';
								const isTemporaryStarting = isStartingStep && !adventureStarted;
								const canReorder = !isStartingStep && currentIndex !== 0 && currentIndex < (sortedSteps.length - 1);
								return (
									<Pressable style={[
										styles.stepItem,
										isFirstStep && styles.startStepItem,
										isLastStep && styles.arrivalStepItem,
										(blockedIndex === index) && { opacity: 0.5 }
									]}
										onPress={() => router.push(`/trip/${id}/step/${item.id}`)}
									>
										<Text style={[
											styles.stepNumber,
											isFirstStep ? styles.stepNumberStart : (isLastStep ? styles.stepNumberArrival : styles.stepNumberMid)
										]}>{(currentIndex + 1)}</Text>
										<Text style={styles.stepName}>{item.name}</Text>
										{isTemporaryStarting && (<Text style={[styles.stepTag, styles.startTag]}>Départ (temporaire)</Text>)}
										{isStartingStep && adventureStarted && (<Text style={[styles.stepTag, styles.startTag]}>Départ</Text>)}
										{isLastStep && (<Text style={[styles.stepTag, styles.arrivalTag]}>Arrivée</Text>)}
										{canReorder ? (
											<Pressable style={styles.dragHandle} onLongPress={drag}>
												<Text style={styles.dragIcon}>⋮⋮</Text>
											</Pressable>
										) : null}
									</Pressable>
								);
							}}
							onDragEnd={async ({ data, from, to }: { data: Step[]; from: number; to: number }) => {
								// Empêcher de déplacer le point de départ (index 0) et arrivée (dernier index)
								const fromItem = data[from];
								const toItem = data[to];
								if (fromItem?.name === 'Point de départ' || toItem?.name === 'Point de départ' || to === 0 || to === data.length - 1 || from === 0 || from === data.length - 1) {
									setBlockedIndex(from);
									setTimeout(() => setBlockedIndex(null), 250);
									return;
								}
								// Réindexer proprement selon le nouvel ordre
								for (let i = 0; i < data.length; i++) {
									const s = data[i];
									const desired = i;
									if ((s.order_index || 0) !== desired) {
										await updateStep(s.id, { order_index: desired });
									}
								}
								// Recharger liste locale
								const refreshed = await listSteps(id);
								setSteps(refreshed.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
							}}
							style={styles.stepsList}
						/>
					) : (
						<FlatList
							data={sortedSteps}
							keyExtractor={(item: Step) => String(item.id)}
							renderItem={({ item, index }) => {
								const isFirstStep = index === 0;
								const isLastStep = index === sortedSteps.length - 1;
								const isStartingStep = item.name === 'Point de départ';
								const isTemporaryStarting = isStartingStep && !adventureStarted;
								const canReorder = !isStartingStep && index !== 0 && !isLastStep;
								return (
									<Pressable
										style={[
											styles.stepItem,
											isFirstStep && styles.startStepItem,
											isLastStep && styles.arrivalStepItem,
										]}
										onPress={() => router.push(`/trip/${id}/step/${item.id}`)}
									>
										<Text style={[
											styles.stepNumber,
											isFirstStep ? styles.stepNumberStart : (isLastStep ? styles.stepNumberArrival : styles.stepNumberMid)
										]}>{(item.order_index ?? index) + 1}</Text>
										<View style={styles.stepContentCol}>
											<Text style={styles.stepName} numberOfLines={1}>{item.name}</Text>
											<View style={styles.stepTagsRow}>
												{isTemporaryStarting && (<Text style={[styles.stepTag, styles.startTag]}>Départ (temporaire)</Text>)}
												{isStartingStep && adventureStarted && (<Text style={[styles.stepTag, styles.startTag]}>Départ</Text>)}
												{isLastStep && (<Text style={[styles.stepTag, styles.arrivalTag]}>Arrivée</Text>)}
											</View>
										</View>
										{canReorder ? (
											<Text style={styles.dragIcon}>⋮⋮</Text>
										) : null}
									</Pressable>
								);
							}}
							style={styles.stepsList}
						/>
					)}
				</View>
			)}

			{/* Modal d'édition d'étape */}
			<Modal visible={isStepModalVisible} transparent animationType="slide" onRequestClose={() => setIsStepModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>{modalStep ? modalStep.name : 'Étape'}</Text>
						<Text style={styles.modalLabel}>Notes</Text>
						<TextInput
							style={[styles.input, styles.textArea]}
							multiline
							placeholder="Ajoutez des notes de voyage..."
							value={modalDescription}
							onChangeText={setModalDescription}
						/>
						<View style={styles.modalActions}>
							<Pressable style={styles.modalButtonSecondary} onPress={() => {
								setIsStepModalVisible(false);
							}}>
								<Text style={styles.modalButtonTextSecondary}>Annuler</Text>
							</Pressable>
							<Pressable style={styles.modalButtonPrimary} onPress={async () => {
								if (modalStep) {
									await updateStep(modalStep.id, { description: modalDescription });
									// Rafraîchir les étapes
									const refreshed = await listSteps(id);
									setSteps(refreshed.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
								}
								setIsStepModalVisible(false);
							}}>
								<Text style={styles.modalButtonTextPrimary}>Enregistrer</Text>
							</Pressable>
						</View>
						<View style={styles.modalImagesRow}>
							<Pressable style={styles.addImageButton} onPress={() => Alert.alert('Bientôt', 'Ajout d\'images par étape à venir')}>
								<Text style={styles.addImageIcon}>🖼️</Text>
								<Text style={styles.addImageText}>Ajouter une image</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
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
		padding: 20,
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
	// Boutons fixes - positions séparées
	legendToggleButtonFixed: {
		position: 'absolute',
		bottom: 30,
		left: 16,
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
	addStepButtonFixed: {
		position: 'absolute',
		bottom: 30,
		left: 0,
		right: 0,
		backgroundColor: '#10b981',
		borderRadius: 25,
		paddingHorizontal: 24,
		paddingVertical: 16,
		shadowColor: '#10b981',
		shadowOpacity: 0.4,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6,
		alignItems: 'center',
		marginHorizontal: 80, // Espace pour les boutons latéraux (50 + 16 + 14 de marge)
	},
	reorderIconButtonFixed: {
		position: 'absolute',
		bottom: 30,
		right: 16,
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#6b7280',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	addStepButtonText: {
		color: 'white',
		fontWeight: '800',
		fontSize: 16,
	},
	reorderIconButtonActive: {
		backgroundColor: '#10b981',
	},
	reorderIcon: {
		fontSize: 22,
		color: 'white',
	},
	stepsListContainer: {
		position: 'absolute',
		bottom: 100,
		left: 16,
		right: 16,
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 16,
		maxHeight: 480,
		shadowColor: '#000',
		shadowOpacity: 0.25,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6,
	},
	stepsListTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 12,
	},
	stepsList: {
		maxHeight: 380,
	},
	stepItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: '#f9fafb',
		borderRadius: 10,
		marginBottom: 6,
		borderWidth: 1,
		borderColor: '#e6ecf2',
		borderLeftWidth: 1,
		borderLeftColor: '#e6ecf2',
	},
	startStepItem: {
		backgroundColor: '#ecfdf5',
		borderWidth: 1,
		borderColor: '#a7f3d0',
		borderLeftWidth: 1,
		borderLeftColor: '#a7f3d0',
	},
	arrivalStepItem: {
		backgroundColor: '#fff7ed',
		borderWidth: 1,
		borderColor: '#fdba74',
		borderLeftWidth: 1,
		borderLeftColor: '#f59e0b',
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
	stepNumberStart: {
		backgroundColor: '#10b981', // vert
	},
	stepNumberMid: {
		backgroundColor: '#3b82f6', // bleu
	},
	stepNumberArrival: {
		backgroundColor: '#f59e0b', // orange
	},
	stepName: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	stepContentCol: {
		flex: 1,
		gap: 4,
	},
	stepTagsRow: {
		flexDirection: 'row',
		gap: 6,
		alignItems: 'center',
	},
	stepIconBadge: {
		display: 'none'
	},
	stepTag: {
		marginLeft: 8,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 8,
		backgroundColor: '#e5e7eb',
		color: '#111827',
		fontSize: 12,
		fontWeight: '700',
	},
	arrivalTag: {
		backgroundColor: '#ffedd5',
		color: '#c2410c',
	},
	startTag: {
		backgroundColor: '#d1fae5',
		color: '#065f46',
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
	legendBadge: {
		width: 16,
		height: 16,
		borderRadius: 8,
	},
	legendBadgeStart: {
		backgroundColor: '#10b981',
	},
	legendBadgeMid: {
		backgroundColor: '#3b82f6',
	},
	legendBadgeArrival: {
		backgroundColor: '#f59e0b',
	},
	legendRing: {
		width: 16,
		height: 16,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: '#3b82f6',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(59,130,246,0.15)'
	},
	legendRingInner: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#1d4ed8'
	},
	legendLine: {
		width: 20,
		height: 3,
		borderRadius: 1.5,
	},
	legendText: {
		fontSize: 12,
		color: '#374151',
		fontWeight: '500',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.3)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	modalCard: {
		width: '100%',
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 16,
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '800',
		marginBottom: 12,
		color: '#0f172a',
	},
	modalLabel: {
		fontSize: 12,
		fontWeight: '700',
		marginBottom: 6,
		color: '#374151',
	},
	modalActions: {
		marginTop: 12,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 12,
	},
	modalButtonPrimary: {
		backgroundColor: '#10b981',
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	modalButtonTextPrimary: {
		color: 'white',
		fontWeight: '700',
	},
	modalButtonSecondary: {
		backgroundColor: '#e5e7eb',
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	modalButtonTextSecondary: {
		color: '#111827',
		fontWeight: '700',
	},
	modalImagesRow: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	addImageButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#f3f4f6',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	addImageIcon: { fontSize: 16 },
	addImageText: { fontWeight: '700', color: '#111827' },
	currentLocationMarker: {
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: 'rgba(59,130,246,0.2)', // bleu clair semi-transparent
		borderWidth: 2,
		borderColor: '#3b82f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	currentLocationInner: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#1d4ed8',
	},
	startAdventureContainer: {
		position: 'absolute',
		top: 100,
		left: 16,
		right: 16,
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 20,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 8,
	},
	startAdventureTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#1f2937',
		marginBottom: 8,
	},
	startAdventureText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		marginBottom: 16,
	},
	startAdventureButton: {
		backgroundColor: '#10b981',
		borderRadius: 12,
		paddingHorizontal: 24,
		paddingVertical: 12,
		shadowColor: '#10b981',
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	startAdventureButtonText: {
		color: 'white',
		fontWeight: '700',
		fontSize: 16,
	},
	legendToggleButtonActive: {
		backgroundColor: '#10b981',
		borderColor: '#059669',
	},
	legendToggleIcon: {
		fontSize: 20,
	},
	setDestinationButton: {
		backgroundColor: '#f59e0b',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginTop: 12,
		alignSelf: 'center',
	},
	setDestinationButtonText: {
		color: 'white',
		fontSize: 14,
		fontWeight: '600',
	},
	reorderNote: {
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
		marginBottom: 12,
		fontStyle: 'italic',
	},
	stepItemFixed: {
		backgroundColor: '#f3f4f6',
		opacity: 0.7,
	},
	fixedStepText: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '600',
		fontStyle: 'italic',
	},
	infoSubtext: {
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
		marginTop: 4,
		fontStyle: 'italic',
	},
	arrivalStepText: {
		fontSize: 10,
		color: '#f59e0b',
		fontWeight: '600',
		fontStyle: 'italic',
		marginLeft: 8,
	},
});



