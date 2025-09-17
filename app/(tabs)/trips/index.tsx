import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser } from '../../../lib/session';
import { createTrip, deleteTrip, listTrips, Trip } from '../../../lib/trips';

export default function TripsScreen() {
	const [userId, setUserId] = useState<number | null>(null);
	const [trips, setTrips] = useState<Trip[]>([]);
	const [title, setTitle] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		(async () => {
			const user = await getCurrentUser();
			if (user) {
				setUserId(user.id);
				const data = await listTrips(user.id);
				setTrips(data);
			}
		})();
	}, []);

	async function onCreate() {
		if (!userId || !title.trim()) return;
		try {
			setLoading(true);
			await createTrip(userId, title.trim());
			setTitle('');
			const data = await listTrips(userId);
			setTrips(data);
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Création impossible');
		} finally {
			setLoading(false);
		}
	}

	async function onDelete(id: number) {
		if (!userId) return;
		await deleteTrip(id);
		const data = await listTrips(userId);
		setTrips(data);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.header}>Mes voyages</Text>
			<View style={styles.row}>
				<TextInput style={styles.input} placeholder="Titre du voyage" value={title} onChangeText={setTitle} />
				<Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={onCreate} disabled={loading}>
					<Text style={styles.buttonText}>Créer</Text>
				</Pressable>
			</View>
			<FlatList
				data={trips}
				keyExtractor={(item) => String(item.id)}
				renderItem={({ item }) => (
					<Pressable style={styles.card} onPress={() => router.push(`/(tabs)/trips/${item.id}`)}>
						<Text style={styles.tripTitle}>{item.title}</Text>
						<Pressable style={styles.delete} onPress={() => onDelete(item.id)}>
							<Text style={styles.deleteText}>Supprimer</Text>
						</Pressable>
					</Pressable>
				)}
				ListEmptyComponent={<Text style={styles.empty}>Aucun voyage. Créez votre premier voyage.</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
	header: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
	row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
	input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12 },
	button: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
	buttonText: { color: 'white', fontWeight: '700' },
	card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	tripTitle: { fontSize: 16, fontWeight: '700' },
	delete: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ef4444' },
	deleteText: { color: 'white', fontWeight: '700' },
	empty: { textAlign: 'center', marginTop: 24, color: '#64748b' },
});


