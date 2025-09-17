import type { AuthUser } from './auth';
import { executeAsync, getDatabase, queryAsync } from './db';

export async function getCurrentUser(): Promise<AuthUser | null> {
	const db = await getDatabase();
	const s = await queryAsync<{ current_user_id: number }>(db, 'SELECT current_user_id FROM session LIMIT 1');
	if (s.length === 0 || s[0].current_user_id == null) return null;
	const users = await queryAsync<AuthUser>(db, 'SELECT id, email FROM users WHERE id = ?', [s[0].current_user_id]);
	return users[0] ?? null;
}

export async function setCurrentUser(userId: number | null): Promise<void> {
	const db = await getDatabase();
	const s = await queryAsync<{ current_user_id: number }>(db, 'SELECT current_user_id FROM session LIMIT 1');
	if (s.length === 0) {
		await executeAsync(db, 'INSERT INTO session (current_user_id) VALUES (?)', [userId]);
		return;
	}
	await executeAsync(db, 'UPDATE session SET current_user_id = ?', [userId]);
}



