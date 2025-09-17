import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createStep, deleteStep, listSteps, Step } from '../../../../lib/steps';

export default function TripDetailsScreen() {
	const { tripId } = useLocalSearchParams<{ tripId: string }>();
	const id = Number(tripId);
	const [steps, setSteps] = useState<Step[]>([]);
	const [name, setName] = useState('');
	const [lat, setLat] = useState('');
	const [lng, setLng] = useState('');

	useEffect(() => {
		(async () => {
			if (!id) return;
			const data = await listSteps(id);
			setSteps(data);
		})();
	}, [id]);

	async function onAdd() {
		if (!id || !name.trim() || !lat || !lng) return;
		try {
			const latitude = Number(lat);
			const longitude = Number(lng);
			await createStep({ trip_id: id, name: name.trim(), latitude, longitude, start_date: null, end_date: null, description: null, order_index: steps.length });
			setName(''); setLat(''); setLng('');
			const data = await listSteps(id);
			setSteps(data);
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Ajout impossible');
		}
	}

	async function onDelete(stepId: number) {
		await deleteStep(stepId);
		const data = await listSteps(id);
		setSteps(data);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.header}>Étapes du voyage</Text>
			<View style={styles.row}>
				<TextInput style={[styles.input, { flex: 1 }]} placeholder="Nom du lieu" value={name} onChangeText={setName} />
				<TextInput style={[styles.input, { width: 100 }]} placeholder="Lat" value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
				<TextInput style={[styles.input, { width: 100 }]} placeholder="Lng" value={lng} onChangeText={setLng} keyboardType="decimal-pad" />
				<Pressable style={styles.button} onPress={onAdd}><Text style={styles.buttonText}>Ajouter</Text></Pressable>
			</View>
			<Pressable style={styles.mapBtn} onPress={() => router.push(`/trip/${id}/map`)}>
				<Text style={styles.mapText}>Voir la carte</Text>
			</Pressable>
			<View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
				<Pressable style={[styles.mapBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => router.push(`/(tabs)/trips/${id}/journal`)}>
					<Text style={styles.mapText}>Journal</Text>
				</Pressable>
				<Pressable style={[styles.mapBtn, { backgroundColor: '#9333ea' }]} onPress={() => router.push(`/(tabs)/trips/${id}/checklist`)}>
					<Text style={styles.mapText}>Checklist</Text>
				</Pressable>
			</View>
			<FlatList
				data={steps}
				keyExtractor={(item) => String(item.id)}
				renderItem={({ item, index }) => (
					<View style={styles.card}>
						<Text style={styles.stepTitle}>{index + 1}. {item.name} ({item.latitude.toFixed(3)}, {item.longitude.toFixed(3)})</Text>
						<Pressable style={styles.delete} onPress={() => onDelete(item.id)}>
							<Text style={styles.deleteText}>Supprimer</Text>
						</Pressable>
					</View>
				)}
				ListEmptyComponent={<Text style={styles.empty}>Aucune étape. Ajoutez votre première étape.</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
	header: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
	row: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
	input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
	button: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
	buttonText: { color: 'white', fontWeight: '700' },
	mapBtn: { alignSelf: 'flex-start', backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
	mapText: { color: 'white', fontWeight: '700' },
	card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	stepTitle: { fontSize: 16, fontWeight: '700' },
	delete: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ef4444' },
	deleteText: { color: 'white', fontWeight: '700' },
	empty: { textAlign: 'center', marginTop: 24, color: '#64748b' },
});



