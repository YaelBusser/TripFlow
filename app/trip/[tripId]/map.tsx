import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { listSteps, Step } from '../../../lib/steps';

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
	const { tripId } = useLocalSearchParams<{ tripId: string }>();
	const id = Number(tripId);
	const [steps, setSteps] = useState<Step[]>([]);

	useEffect(() => {
		(async () => {
			if (!id) return;
			const data = await listSteps(id);
			setSteps(data);
		})();
	}, [id]);

	const region = useMemo(() => {
		if (steps.length === 0) return null;
		const lats = steps.map(s => s.latitude);
		const lngs = steps.map(s => s.longitude);
		const minLat = Math.min(...lats);
		const maxLat = Math.max(...lats);
		const minLng = Math.min(...lngs);
		const maxLng = Math.max(...lngs);
		const latitude = (minLat + maxLat) / 2;
		const longitude = (minLng + maxLng) / 2;
		const latitudeDelta = Math.max(0.05, (maxLat - minLat) * 1.5 || 0.1);
		const longitudeDelta = Math.max(0.05, (maxLng - minLng) * 1.5 || 0.1);
		return { latitude, longitude, latitudeDelta, longitudeDelta };
	}, [steps]);

	if (!MapView) {
		return (
			<View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
				<Text>Carte indisponible. Installez react-native-maps pour l'affichage.</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{region ? (
				<MapView style={StyleSheet.absoluteFill} initialRegion={region}>
					{steps.map((s, idx) => (
						<Marker key={s.id} coordinate={{ latitude: s.latitude, longitude: s.longitude }} title={`${idx + 1}. ${s.name}`} />
					))}
					{steps.length > 1 && (
						<Polyline coordinates={steps.map(s => ({ latitude: s.latitude, longitude: s.longitude }))} strokeColor="#2563eb" strokeWidth={3} />
					)}
				</MapView>
			) : (
				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
					<Text>Aucune étape à afficher</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
});



