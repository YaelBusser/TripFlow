import { executeAsync, getDatabase, queryAsync } from './db';

export type Step = {
	id: number;
	trip_id: number;
	name: string;
	latitude: number;
	longitude: number;
	start_date?: number | null;
	end_date?: number | null;
	description?: string | null;
	order_index?: number | null;
};

export async function listSteps(tripId: number): Promise<Step[]> {
	const db = await getDatabase();
	return await queryAsync<Step>(
		db,
		`SELECT id, trip_id, name, latitude, longitude, start_date, end_date, description, order_index
		 FROM steps WHERE trip_id = ? ORDER BY COALESCE(order_index, 0), start_date ASC, id ASC`,
		[tripId]
	);
}

export async function createStep(step: Omit<Step, 'id'>): Promise<number> {
	const db = await getDatabase();
	await executeAsync(
		db,
		`INSERT INTO steps (trip_id, name, latitude, longitude, start_date, end_date, description, order_index)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			step.trip_id,
			step.name,
			step.latitude,
			step.longitude,
			step.start_date ?? null,
			step.end_date ?? null,
			step.description ?? null,
			step.order_index ?? 0,
		]
	);
	const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
	return rows[0]?.id;
}

export async function updateStep(stepId: number, updates: Partial<Omit<Step, 'id' | 'trip_id'>>): Promise<void> {
	const db = await getDatabase();
	// Build dynamic query
	const keys = Object.keys(updates) as (keyof typeof updates)[];
	if (keys.length === 0) return;
	const setClause = keys.map((k) => `${k} = ?`).join(', ');
	const values = keys.map((k) => (updates as any)[k]);
	await executeAsync(db, `UPDATE steps SET ${setClause} WHERE id = ?`, [...values, stepId]);
}

export async function deleteStep(stepId: number): Promise<void> {
	const db = await getDatabase();
	await executeAsync(db, 'DELETE FROM steps WHERE id = ?', [stepId]);
}



