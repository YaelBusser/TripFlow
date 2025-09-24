import { executeAsync, getDatabase, queryAsync } from './db';
import { deleteStepImagesFromTripGallery } from './trip-images';

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
	arrived_at?: number | null;
};

export type StepImage = {
  id: number;
  step_id: number;
  image_uri: string;
  order_index: number;
  created_at: number;
};

export type StepChecklistItem = {
  id: number;
  step_id: number;
  text: string;
  is_checked: number;
  created_at: number;
};

export async function listSteps(tripId: number): Promise<Step[]> {
	const db = await getDatabase();
	return await queryAsync<Step>(
		db,
		`SELECT id, trip_id, name, latitude, longitude, start_date, end_date, description, order_index, arrived_at
		 FROM steps WHERE trip_id = ? ORDER BY COALESCE(order_index, 0), start_date ASC, id ASC`,
		[tripId]
	);
}

export async function getStep(stepId: number): Promise<Step> {
	const db = await getDatabase();
	const rows = await queryAsync<Step>(
		db,
		`SELECT * FROM steps WHERE id = ?`,
		[stepId]
	);
	if (rows.length === 0) {
		throw new Error('Étape non trouvée');
	}
	return rows[0];
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
	
	// Récupérer le trip_id avant de supprimer l'étape
	const stepRows = await queryAsync<{ trip_id: number }>(db, 'SELECT trip_id FROM steps WHERE id = ?', [stepId]);
	const tripId = stepRows[0]?.trip_id;
	
	// Supprimer toutes les images de l'étape de la galerie du voyage
	if (tripId) {
		await deleteStepImagesFromTripGallery(tripId, stepId);
	}
	
	// Supprimer toutes les images liées à cette étape
	await executeAsync(db, 'DELETE FROM step_images WHERE step_id = ?', [stepId]);
	
	// Supprimer tous les éléments de checklist liés à cette étape
	await executeAsync(db, 'DELETE FROM step_checklist_items WHERE step_id = ?', [stepId]);
	
	// Enfin, supprimer l'étape elle-même
	await executeAsync(db, 'DELETE FROM steps WHERE id = ?', [stepId]);
}

// Récupère toutes les images d'étapes d'un voyage avec le nom de l'étape
export async function getTripStepImagesWithSteps(tripId: number): Promise<Array<{ image_uri: string; step_id: number; step_name: string; latitude: number; longitude: number }>> {
  const db = await getDatabase();
  const rows = await queryAsync<{ image_uri: string; step_id: number; step_name: string; latitude: number; longitude: number }>(
    db,
    `SELECT si.image_uri as image_uri, si.step_id as step_id, s.name as step_name, s.latitude as latitude, s.longitude as longitude
     FROM step_images si
     JOIN steps s ON s.id = si.step_id
     WHERE s.trip_id = ?
     ORDER BY si.created_at ASC` ,
    [tripId]
  );
  return rows;
}


// Images par étape
export async function addStepImage(stepId: number, imageUri: string): Promise<number> {
  const db = await getDatabase();
  // Calculer le prochain order_index pour append à la fin des images de cette étape
  const rowsMax = await queryAsync<{ maxIndex: number | null }>(
    db,
    'SELECT MAX(order_index) as maxIndex FROM step_images WHERE step_id = ?',
    [stepId]
  );
  const nextIndex = (rowsMax[0]?.maxIndex ?? -1) + 1;
  await executeAsync(
    db,
    'INSERT INTO step_images (step_id, image_uri, order_index, created_at) VALUES (?, ?, ?, ?)',
    [stepId, imageUri, nextIndex, Date.now()]
  );
  const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
  return rows[0]?.id;
}

export async function getStepImages(stepId: number): Promise<StepImage[]> {
  const db = await getDatabase();
  return await queryAsync<StepImage>(
    db,
    'SELECT * FROM step_images WHERE step_id = ? ORDER BY order_index ASC, created_at ASC',
    [stepId]
  );
}

export async function deleteStepImage(imageId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(db, 'DELETE FROM step_images WHERE id = ?', [imageId]);
}

export async function updateStepImageOrder(imageId: number, newOrder: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(db, 'UPDATE step_images SET order_index = ? WHERE id = ?', [newOrder, imageId]);
}


// Supprime toutes les images d'étapes d'un voyage données une URI
export async function deleteStepImagesByUriForTrip(tripId: number, imageUri: string): Promise<void> {
  if (!imageUri) return;
  const db = await getDatabase();
  // Supprimer via sous-requête pour cibler uniquement les steps du trip
  await executeAsync(
    db,
    `DELETE FROM step_images 
     WHERE id IN (
       SELECT si.id FROM step_images si
       JOIN steps s ON s.id = si.step_id
       WHERE s.trip_id = ? AND si.image_uri = ?
     )`,
    [tripId, imageUri]
  );
}

// Checklist des étapes
export async function createStepChecklistItem(stepId: number, text: string): Promise<StepChecklistItem> {
  const db = await getDatabase();
  const createdAt = Date.now();
  
  await executeAsync(
    db,
    'INSERT INTO step_checklist_items (step_id, text, is_checked, created_at) VALUES (?, ?, ?, ?)',
    [stepId, text, 0, createdAt]
  );
  
  const rows = await queryAsync<StepChecklistItem>(
    db,
    'SELECT * FROM step_checklist_items WHERE step_id = ? AND created_at = ?',
    [stepId, createdAt]
  );
  
  return rows[0];
}

export async function listStepChecklistItems(stepId: number): Promise<StepChecklistItem[]> {
  const db = await getDatabase();
  return await queryAsync<StepChecklistItem>(
    db,
    'SELECT * FROM step_checklist_items WHERE step_id = ? ORDER BY created_at ASC',
    [stepId]
  );
}

export async function toggleStepChecklistItem(itemId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE step_checklist_items SET is_checked = NOT is_checked WHERE id = ?',
    [itemId]
  );
}

export async function deleteStepChecklistItem(itemId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(db, 'DELETE FROM step_checklist_items WHERE id = ?', [itemId]);
}

export async function updateStepChecklistItem(itemId: number, text: string): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE step_checklist_items SET text = ? WHERE id = ?',
    [text, itemId]
  );
}

// Marquer une étape comme atteinte
export async function markStepAsArrived(stepId: number): Promise<void> {
  const db = await getDatabase();
  const arrivedAt = Date.now();
  await executeAsync(
    db,
    'UPDATE steps SET arrived_at = ? WHERE id = ?',
    [arrivedAt, stepId]
  );
}

// Marquer une étape comme non atteinte
export async function markStepAsNotArrived(stepId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE steps SET arrived_at = NULL WHERE id = ?',
    [stepId]
  );
}



