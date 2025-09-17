import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addChecklistItem, ChecklistItem, deleteChecklistItem, listChecklist, toggleChecklistItem } from '../../../../lib/checklist';

export default function ChecklistScreen() {
	const { tripId } = useLocalSearchParams<{ tripId: string }>();
	const id = Number(tripId);
	const [items, setItems] = useState<ChecklistItem[]>([]);
	const [title, setTitle] = useState('');

	useEffect(() => {
		(async () => {
			if (!id) return;
			const data = await listChecklist(id);
			setItems(data);
		})();
	}, [id]);

	async function onAdd() {
		if (!title.trim()) return;
		try {
			await addChecklistItem(id, title.trim());
			setTitle('');
			const data = await listChecklist(id);
			setItems(data);
		} catch (e: any) {
			Alert.alert('Erreur', e.message ?? 'Ajout impossible');
		}
	}

	async function onToggle(item: ChecklistItem) {
		await toggleChecklistItem(item.id, !item.is_done);
		const data = await listChecklist(id);
		setItems(data);
	}

	async function onDelete(itemId: number) {
		await deleteChecklistItem(itemId);
		const data = await listChecklist(id);
		setItems(data);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.header}>Checklist</Text>
			<View style={styles.row}>
				<TextInput style={[styles.input, { flex: 1 }]} placeholder="Nouvel élément" value={title} onChangeText={setTitle} />
				<Pressable style={styles.addBtn} onPress={onAdd}><Text style={styles.addText}>Ajouter</Text></Pressable>
			</View>
			<FlatList
				data={items}
				keyExtractor={(i) => String(i.id)}
				renderItem={({ item }) => (
					<View style={styles.item}>
						<Pressable onPress={() => onToggle(item)} style={[styles.checkbox, item.is_done ? styles.checkboxOn : null]} />
						<Text style={[styles.itemText, item.is_done ? styles.doneText : null]}>{item.title}</Text>
						<Pressable style={styles.delete} onPress={() => onDelete(item.id)}>
							<Text style={styles.deleteText}>Supprimer</Text>
						</Pressable>
					</View>
				)}
				ListEmptyComponent={<Text style={styles.empty}>Liste vide.</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
	header: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
	row: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
	input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
	addBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
	addText: { color: 'white', fontWeight: '700' },
	item: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
	checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#e2e8f0' },
	checkboxOn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
	itemText: { flex: 1 },
	doneText: { textDecorationLine: 'line-through', color: '#64748b' },
	delete: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ef4444' },
	deleteText: { color: 'white', fontWeight: '700' },
	empty: { textAlign: 'center', marginTop: 24, color: '#64748b' },
});


