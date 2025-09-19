import { executeAsync, getDatabase, queryAsync } from './db';

export type ChecklistItem = {
  id: number;
  trip_id: number;
  text: string;
  is_checked: number;
  created_at: number;
};

export async function createChecklistItem(tripId: number, text: string): Promise<ChecklistItem> {
  const db = await getDatabase();
  const createdAt = Date.now();
  
  await executeAsync(
    db,
    'INSERT INTO checklist_items (trip_id, text, is_checked, created_at) VALUES (?, ?, ?, ?)',
    [tripId, text, 0, createdAt]
  );
  
  const rows = await queryAsync<ChecklistItem>(
    db,
    'SELECT * FROM checklist_items WHERE trip_id = ? AND created_at = ?',
    [tripId, createdAt]
  );
  
  return rows[0];
}

export async function listChecklistItems(tripId: number): Promise<ChecklistItem[]> {
  const db = await getDatabase();
  return await queryAsync<ChecklistItem>(
    db,
    'SELECT * FROM checklist_items WHERE trip_id = ? ORDER BY created_at ASC',
    [tripId]
  );
}

export async function toggleChecklistItem(itemId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE checklist_items SET is_checked = NOT is_checked WHERE id = ?',
    [itemId]
  );
}

export async function updateChecklistItem(itemId: number, text: string): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE checklist_items SET text = ? WHERE id = ?',
    [text, itemId]
  );
}

export async function deleteChecklistItem(itemId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'DELETE FROM checklist_items WHERE id = ?',
    [itemId]
  );
}