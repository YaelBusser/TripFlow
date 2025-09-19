import { executeAsync, getDatabase, queryAsync } from './db';

export type JournalEntry = {
  id: number;
  step_id: number;
  content: string;
  created_at: number;
};

export async function createJournalEntry(stepId: number, content: string): Promise<JournalEntry> {
  const db = await getDatabase();
  const createdAt = Date.now();
  
  await executeAsync(
    db,
    'INSERT INTO journal_entries (step_id, content, created_at) VALUES (?, ?, ?)',
    [stepId, content, createdAt]
  );
  
  const rows = await queryAsync<JournalEntry>(
    db,
    'SELECT * FROM journal_entries WHERE step_id = ? AND created_at = ?',
    [stepId, createdAt]
  );
  
  return rows[0];
}

export async function listJournal(stepId: number): Promise<JournalEntry[]> {
  const db = await getDatabase();
  return await queryAsync<JournalEntry>(
    db,
    'SELECT * FROM journal_entries WHERE step_id = ? ORDER BY created_at DESC',
    [stepId]
  );
}

export async function updateJournalEntry(entryId: number, content: string): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'UPDATE journal_entries SET content = ? WHERE id = ?',
    [content, entryId]
  );
}

export async function deleteJournalEntry(entryId: number): Promise<void> {
  const db = await getDatabase();
  await executeAsync(
    db,
    'DELETE FROM journal_entries WHERE id = ?',
    [entryId]
  );
}