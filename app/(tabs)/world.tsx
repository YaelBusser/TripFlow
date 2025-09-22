import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../../lib/session';
import { listSteps, Step } from '../../lib/steps';
import { listTrips } from '../../lib/trips';

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
    const [steps, setSteps] = useState<Step[]>([]);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        (async () => {
            const user = await getCurrentUser();
            if (!user) return;
            const trips = await listTrips(user.id);
            if (trips.length === 0) return;
            // show last trip
            const latest = trips[0];
            const s = await listSteps(latest.id);
            setSteps(s);
            
            // Get current location automatiquement
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                        maximumAge: 10000, // 10 secondes
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
		if (steps.length === 0) return { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 20, longitudeDelta: 20 };
		const lats = steps.map(s => s.latitude);
		const lngs = steps.map(s => s.longitude);
		const latitude = (Math.min(...lats) + Math.max(...lats)) / 2;
		const longitude = (Math.min(...lngs) + Math.max(...lngs)) / 2;
		return { latitude, longitude, latitudeDelta: 6, longitudeDelta: 6 };
	}, [steps]);

	if (!MapView) return (
		<SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
			<Text>Carte indisponible</Text>
		</SafeAreaView>
	);

  return (
    <SafeAreaView style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={region} mapType={Platform.OS === 'ios' ? 'hybrid' : 'terrain'}>
				{steps.map((s, idx) => (
					<Marker key={s.id} coordinate={{ latitude: s.latitude, longitude: s.longitude }} title={`${idx + 1}. ${s.name}`} />
				))}
				{currentLocation && (
					<Marker 
						coordinate={currentLocation} 
						title="Ma position" 
						description="Votre position actuelle"
						pinColor="blue"
					/>
				)}
				{/* Ligne pointillée entre position actuelle et première étape */}
				{currentLocation && steps.length > 0 && (
					<Polyline 
						coordinates={[
							currentLocation, 
							{ latitude: steps[0].latitude, longitude: steps[0].longitude }
						]} 
						strokeColor="#3b82f6" 
						strokeWidth={3}
						strokePattern={[10, 5]} // Ligne pointillée bleue
					/>
				)}
				
				{/* Lignes reliant les étapes entre elles */}
				{steps.length > 0 && (
					<Polyline 
						coordinates={steps.map(s => ({ latitude: s.latitude, longitude: s.longitude }))} 
						strokeWidth={4} 
						strokeColor="#10b981" 
					/>
				)}
			</MapView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#000' },
});


