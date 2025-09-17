import { executeAsync, getDatabase, queryAsync } from './db';

export type ChecklistItem = {
	id: number;
	trip_id: number;
	title: string;
	is_done: number; // 0 or 1
};

export async function listChecklist(tripId: number): Promise<ChecklistItem[]> {
	const db = await getDatabase();
	return await queryAsync<ChecklistItem>(db, 'SELECT id, trip_id, title, is_done FROM checklist_items WHERE trip_id = ? ORDER BY id DESC', [tripId]);
}

export async function addChecklistItem(tripId: number, title: string): Promise<number> {
	const db = await getDatabase();
	await executeAsync(db, 'INSERT INTO checklist_items (trip_id, title, is_done) VALUES (?, ?, 0)', [tripId, title]);
	const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
	return rows[0]?.id;
}

export async function toggleChecklistItem(id: number, done: boolean): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'UPDATE checklist_items SET is_done = ? WHERE id = ?', [done ? 1 : 0, id]);
}

export async function deleteChecklistItem(id: number): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'DELETE FROM checklist_items WHERE id = ?', [id]);
}


