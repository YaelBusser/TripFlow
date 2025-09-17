import { executeAsync, getDatabase, queryAsync } from './db';

export type Trip = {
	id: number;
	user_id: number;
	title: string;
	start_date?: number | null;
	end_date?: number | null;
	cover_uri?: string | null;
};

export async function listTrips(userId: number): Promise<Trip[]> {
	const db = await getDatabase();
	return await queryAsync<Trip>(db, 'SELECT id, user_id, title, start_date, end_date, cover_uri FROM trips WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

export async function createTrip(userId: number, title: string, startDate?: number | null, endDate?: number | null, coverUri?: string | null): Promise<number> {
	const db = await getDatabase();
	await executeAsync(db, 'INSERT INTO trips (user_id, title, start_date, end_date, cover_uri, created_at) VALUES (?, ?, ?, ?, ?, ?)', [userId, title, startDate ?? null, endDate ?? null, coverUri ?? null, Date.now()]);
	const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
	return rows[0]?.id;
}

export async function deleteTrip(id: number): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'DELETE FROM trips WHERE id = ?', [id]);
}



