import { executeAsync, getDatabase, queryAsync } from './db';

export type JournalEntry = {
	id: number;
	step_id: number;
	content?: string | null;
	photo_uri?: string | null;
	created_at: number;
};

export async function listJournal(stepId: number): Promise<JournalEntry[]> {
	const db = await getDatabase();
	return await queryAsync<JournalEntry>(db, 'SELECT id, step_id, content, photo_uri, created_at FROM journal_entries WHERE step_id = ? ORDER BY created_at DESC', [stepId]);
}

export async function addJournal(stepId: number, content?: string | null, photoUri?: string | null): Promise<number> {
	const db = await getDatabase();
	await executeAsync(db, 'INSERT INTO journal_entries (step_id, content, photo_uri, created_at) VALUES (?, ?, ?, ?)', [stepId, content ?? null, photoUri ?? null, Date.now()]);
	const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
	return rows[0]?.id;
}

export async function deleteJournal(id: number): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'DELETE FROM journal_entries WHERE id = ?', [id]);
}


