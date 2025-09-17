import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addJournal, deleteJournal, JournalEntry, listJournal } from '../../../../lib/journal';
import { listSteps } from '../../../../lib/steps';

export default function JournalScreen() {
	const { tripId } = useLocalSearchParams<{ tripId: string }>();
	const id = Number(tripId);
	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const [content, setContent] = useState('');
	const [hasAnyStep, setHasAnyStep] = useState(false);

	useEffect(() => {
		(async () => {
			if (!id) return;
			const steps = await listSteps(id);
			setHasAnyStep(steps.length > 0);
			if (steps.length > 0) {
				const data = await listJournal(steps[0].id);
				setEntries(data);
			}
		})();
	}, [id]);

	async function onAdd() {
		try {
			const steps = await listSteps(id);
			if (steps.length === 0) {
				Alert.alert('Info', 'Ajoutez d’abord une étape avant le journal.');
				return;
			}
			await addJournal(steps[0].id, content.trim());
			setContent('');
			const data = await listJournal(steps[0].id);
			setEntries(data);
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Ajout impossible');
		}
	}

	async function onDelete(entryId: number) {
		const steps = await listSteps(id);
		if (steps.length === 0) return;
		await deleteJournal(entryId);
		const data = await listJournal(steps[0].id);
		setEntries(data);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.header}>Journal</Text>
			{!hasAnyStep ? (
				<Text style={{ color: '#64748b' }}>Aucune étape. Ajoutez une étape pour commencer un journal.</Text>
			) : (
				<>
					<View style={styles.row}>
						<TextInput style={[styles.input, { flex: 1 }]} placeholder="Votre note" value={content} onChangeText={setContent} />
						<Pressable style={styles.button} onPress={onAdd}><Text style={styles.buttonText}>Ajouter</Text></Pressable>
					</View>
					<FlatList
						data={entries}
						keyExtractor={(i) => String(i.id)}
						renderItem={({ item }) => (
							<View style={styles.card}>
								<Text style={styles.text}>{item.content}</Text>
								<Pressable style={styles.delete} onPress={() => onDelete(item.id)}>
									<Text style={styles.deleteText}>Supprimer</Text>
								</Pressable>
							</View>
						)}
						ListEmptyComponent={<Text style={styles.empty}>Aucune note pour l’instant.</Text>}
					/>
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
	header: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
	row: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
	input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
	button: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
	buttonText: { color: 'white', fontWeight: '700' },
	card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	text: { flex: 1, marginRight: 8 },
	delete: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ef4444' },
	deleteText: { color: 'white', fontWeight: '700' },
	empty: { textAlign: 'center', marginTop: 24, color: '#64748b' },
});


