import { executeAsync, getDatabase, queryAsync } from './db';

export type TripImage = {
  id: number;
  trip_id: number;
  image_uri: string;
  order_index: number;
  created_at: number;
};

export async function addTripImage(tripId: number, imageUri: string): Promise<number> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'INSERT INTO trip_images (trip_id, image_uri, order_index, created_at) VALUES (?, ?, ?, ?)',
    [tripId, imageUri, 0, Date.now()]
  );
  const rows = await queryAsync<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
  return rows[0]?.id;
}

export async function getTripImages(tripId: number): Promise<TripImage[]> {
  const db = await getDatabase();
  return await queryAsync<TripImage>(
    db,
    'SELECT * FROM trip_images WHERE trip_id = ? ORDER BY order_index ASC, created_at ASC',
    [tripId]
  );
}

export async function deleteTripImage(imageId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(db, 'DELETE FROM trip_images WHERE id = ?', [imageId]);
}

export async function updateTripImageOrder(imageId: number, newOrder: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE trip_images SET order_index = ? WHERE id = ?',
    [newOrder, imageId]
  );
}

export async function setTripCoverImage(tripId: number, imageUri: string): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE trips SET cover_uri = ? WHERE id = ?',
    [imageUri, tripId]
  );
}
