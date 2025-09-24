import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../../lib/session';
import { listSteps, Step } from '../../lib/steps';
import { listTrips, Trip } from '../../lib/trips';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
try {
	const maps = require('react-native-maps');
	MapView = maps.default;
	Marker = maps.Marker;
	Polyline = maps.Polyline;
} catch {}

export default function WorldMapScreen() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [tripSteps, setTripSteps] = useState<Record<number, Step[]>>({});
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        (async () => {
            const user = await getCurrentUser();
            if (!user) return;
            
            // Charger tous les voyages
            const allTrips = await listTrips(user.id);
            setTrips(allTrips);
            
            // Charger les étapes pour chaque voyage
            const stepsData: Record<number, Step[]> = {};
            for (const trip of allTrips) {
                const steps = await listSteps(trip.id);
                stepsData[trip.id] = steps;
            }
            setTripSteps(stepsData);
            
            // Get current location automatiquement
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                        timeout: 15000 // 15 secondes
                    });
                    setCurrentLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    });
                } else {
                    console.log('Permission de localisation refusée');
                }
            } catch (error) {
                console.log('Erreur de localisation:', error);
            }
        })();
    }, []);

	const region = useMemo(() => {
		// Récupérer toutes les coordonnées de tous les voyages
		const allCoords: { latitude: number; longitude: number }[] = [];
		Object.values(tripSteps).forEach(steps => {
			steps.forEach(step => {
				allCoords.push({ latitude: step.latitude, longitude: step.longitude });
			});
		});
		
		if (allCoords.length === 0) return { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 20, longitudeDelta: 20 };
		
		const lats = allCoords.map(c => c.latitude);
		const lngs = allCoords.map(c => c.longitude);
		const latitude = (Math.min(...lats) + Math.max(...lats)) / 2;
		const longitude = (Math.min(...lngs) + Math.max(...lngs)) / 2;
		return { latitude, longitude, latitudeDelta: 6, longitudeDelta: 6 };
	}, [tripSteps]);

	// Fonction pour obtenir le point d'arrivée d'un voyage
	const getTripDestination = (tripId: number) => {
		const steps = tripSteps[tripId];
		if (!steps || steps.length === 0) return null;
		return steps[steps.length - 1]; // Dernière étape = destination
	};

	// Fonction pour naviguer vers un voyage
	const navigateToTrip = (tripId: number) => {
		router.push(`/trip/${tripId}/details` as any);
	};

	if (!MapView) return (
		<SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
			<Text>Carte indisponible</Text>
		</SafeAreaView>
	);

  return (
    <SafeAreaView style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={region} mapType={Platform.OS === 'ios' ? 'hybrid' : 'terrain'}>
				{/* Afficher les destinations de tous les voyages */}
				{trips.map((trip) => {
					const destination = getTripDestination(trip.id);
					if (!destination) return null;
					
					return (
						<Marker 
							key={`trip-${trip.id}`}
							coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
							onPress={() => navigateToTrip(trip.id)}
						>
							<Pressable 
								style={styles.tripCard}
								onPress={() => navigateToTrip(trip.id)}
							>
								<View style={styles.tripCardContent}>
									<Text style={styles.tripCardTitle} numberOfLines={1}>{trip.title}</Text>
									<Text style={styles.tripCardDestination} numberOfLines={1}>{destination.name}</Text>
									<View style={styles.tripCardBadges}>
										{trip.is_favorite && (
											<Text style={styles.favoriteIcon}>❤️</Text>
										)}
										<Text style={styles.tripStatus}>
											{trip.completed ? '✅ Terminé' : trip.adventure_started ? '🚀 En cours' : '📅 À venir'}
										</Text>
									</View>
								</View>
							</Pressable>
						</Marker>
					);
				})}
				
				{/* Position actuelle */}
				{currentLocation && (
					<Marker 
						coordinate={currentLocation} 
						title="Ma position" 
						description="Votre position actuelle"
						pinColor="blue"
					/>
				)}
				
				{/* Lignes pour chaque voyage */}
				{Object.entries(tripSteps).map(([tripId, steps]) => {
					if (steps.length === 0) return null;
					
					return (
						<Polyline 
							key={`polyline-${tripId}`}
							coordinates={steps.map(s => ({ latitude: s.latitude, longitude: s.longitude }))} 
							strokeWidth={3} 
							strokeColor="#10b981" 
						/>
					);
				})}
			</MapView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#000' },
	tripCard: {
		backgroundColor: 'rgba(255, 255, 255, 0.95)',
		borderRadius: 12,
		padding: 12,
		minWidth: 200,
		maxWidth: 250,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	tripCardContent: {
		flex: 1,
	},
	tripCardTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#1f2937',
		marginBottom: 4,
	},
	tripCardDestination: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 8,
	},
	tripCardBadges: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	favoriteIcon: {
		fontSize: 14,
	},
	tripStatus: {
		fontSize: 12,
		color: '#059669',
		fontWeight: '500',
	},
});


