import { executeAsync, getDatabase, queryAsync } from './db';

export type TripParticipant = {
	id: number;
	trip_id: number;
	name: string;
	email?: string | null;
	phone?: string | null;
	created_at: number;
};

export async function addTripParticipant(
	tripId: number, 
	name: string, 
	email?: string | null, 
	phone?: string | null
): Promise<number> {
	const db = await getDatabase();
	await executeAsync(
		db, 
		'INSERT INTO trip_participants (trip_id, name, email, phone, created_at) VALUES (?, ?, ?, ?, ?)', 
		[tripId, name, email ?? null, phone ?? null, Date.now()]
	);
	const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
	return rows[0]?.id;
}

export async function getTripParticipants(tripId: number): Promise<TripParticipant[]> {
	const db = await getDatabase();
	return await queryAsync<TripParticipant>(
		db, 
		'SELECT id, trip_id, name, email, phone, created_at FROM trip_participants WHERE trip_id = ? ORDER BY created_at ASC', 
		[tripId]
	);
}

export async function deleteTripParticipant(id: number): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'DELETE FROM trip_participants WHERE id = ?', [id]);
}

export async function updateTripParticipant(
	id: number, 
	name: string, 
	email?: string | null, 
	phone?: string | null
): Promise<void> {
	const db = await getDatabase();
	await executeAsync(
		db, 
		'UPDATE trip_participants SET name = ?, email = ?, phone = ? WHERE id = ?', 
		[name, email ?? null, phone ?? null, id]
	);
}
