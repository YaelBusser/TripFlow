import { executeAsync, getDatabase, queryAsync } from './db';

export type Trip = {
	id: number;
	user_id: number;
	title: string;
	destination?: string | null;
	description?: string | null;
	adventure_started?: number | null;
	completed?: number | null;
	is_favorite?: number | null;
	start_date?: number | null;
	end_date?: number | null;
	cover_uri?: string | null;
};

export async function listTrips(userId: number): Promise<Trip[]> {
	const db = await getDatabase();
	const trips = await queryAsync<Trip>(db, 'SELECT id, user_id, title, destination, description, adventure_started, completed, is_favorite, start_date, end_date, cover_uri FROM trips WHERE user_id = ? ORDER BY created_at DESC', [userId]);
	console.log('listTrips récupérés:', trips.map(t => ({ id: t.id, title: t.title, completed: t.completed, adventure_started: t.adventure_started, is_favorite: t.is_favorite })));
	return trips;
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
	const rows = await queryAsync<Trip>(db, 'SELECT id, user_id, title, destination, description, adventure_started, completed, is_favorite, start_date, end_date, cover_uri FROM trips WHERE id = ?', [id]);
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

export async function setTripCompleted(id: number, completed: boolean): Promise<void> {
	const db = await getDatabase();
	console.log('setTripCompleted appelé:', { id, completed });
	
	try {
		await executeAsync(db, 'UPDATE trips SET completed = ? WHERE id = ?', [completed ? 1 : 0, id]);
		console.log('setTripCompleted réussi');
		
		// Vérifier que la mise à jour a bien eu lieu
		const updatedTrip = await queryAsync<Trip>(db, 'SELECT id, completed FROM trips WHERE id = ?', [id]);
		console.log('Voyage après mise à jour:', updatedTrip[0]);
	} catch (error) {
		console.error('Erreur setTripCompleted:', error);
		throw error;
	}
}

export async function setTripFavorite(id: number, isFavorite: boolean): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'UPDATE trips SET is_favorite = ? WHERE id = ?', [isFavorite ? 1 : 0, id]);
}

export async function toggleTripFavorite(id: number): Promise<boolean> {
	const db = await getDatabase();
	
	// Récupérer l'état actuel
	const currentTrip = await queryAsync<{ is_favorite: number }>(db, 'SELECT is_favorite FROM trips WHERE id = ?', [id]);
	if (currentTrip.length === 0) {
		throw new Error('Voyage non trouvé');
	}
	
	console.log('toggleTripFavorite - État actuel:', { id, currentFavorite: currentTrip[0].is_favorite });
	
	const newFavoriteState = currentTrip[0].is_favorite ? 0 : 1;
	await executeAsync(db, 'UPDATE trips SET is_favorite = ? WHERE id = ?', [newFavoriteState, id]);
	
	console.log('toggleTripFavorite - Nouvel état:', { id, newFavoriteState });
	
	return newFavoriteState === 1;
}

export async function getFavoriteTrips(userId: number): Promise<Trip[]> {
	const db = await getDatabase();
	const trips = await queryAsync<Trip>(db, 'SELECT id, user_id, title, destination, description, adventure_started, completed, is_favorite, start_date, end_date, cover_uri FROM trips WHERE user_id = ? AND is_favorite = 1 ORDER BY created_at DESC', [userId]);
	return trips;
}


