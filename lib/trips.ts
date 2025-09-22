import { executeAsync, getDatabase, queryAsync } from './db';

export type Trip = {
	id: number;
	user_id: number;
	title: string;
	destination?: string | null;
	description?: string | null;
	adventure_started?: number | null;
	start_date?: number | null;
	end_date?: number | null;
	cover_uri?: string | null;
};

export async function listTrips(userId: number): Promise<Trip[]> {
	const db = await getDatabase();
	return await queryAsync<Trip>(db, 'SELECT id, user_id, title, destination, description, adventure_started, start_date, end_date, cover_uri FROM trips WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

export async function createTrip(userId: number, title: string, destination?: string | null, description?: string | null, startDate?: number | null, endDate?: number | null, coverUri?: string | null): Promise<number> {
	const db = await getDatabase();
	await executeAsync(db, 'INSERT INTO trips (user_id, title, destination, description, start_date, end_date, cover_uri, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [userId, title, destination ?? null, description ?? null, startDate ?? null, endDate ?? null, coverUri ?? null, Date.now()]);
	const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
	return rows[0]?.id;
}

export async function deleteTrip(id: number): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'DELETE FROM trips WHERE id = ?', [id]);
}

export async function getTrip(id: number): Promise<Trip | null> {
	const db = await getDatabase();
	const rows = await queryAsync<Trip>(db, 'SELECT id, user_id, title, destination, description, adventure_started, start_date, end_date, cover_uri FROM trips WHERE id = ?', [id]);
	return rows[0] ?? null;
}

export async function updateTripCover(id: number, coverUri: string): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'UPDATE trips SET cover_uri = ? WHERE id = ?', [coverUri, id]);
}

export async function updateTrip(
	id: number, 
	title: string, 
	destination?: string | null, 
	description?: string | null, 
	startDate?: number | null, 
	endDate?: number | null, 
	coverUri?: string | null
): Promise<void> {
	const db = await getDatabase();
	await executeAsync(
		db, 
		'UPDATE trips SET title = ?, destination = ?, description = ?, start_date = ?, end_date = ?, cover_uri = ? WHERE id = ?', 
		[title, destination ?? null, description ?? null, startDate ?? null, endDate ?? null, coverUri ?? null, id]
	);
}

export async function setTripAdventureStarted(id: number, started: boolean): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'UPDATE trips SET adventure_started = ? WHERE id = ?', [started ? 1 : 0, id]);
}



