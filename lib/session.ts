import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from './auth';
import { executeAsync, getDatabase, queryAsync } from './db';

const SESSION_KEY = 'tripflow_session';

export async function getCurrentUser(): Promise<AuthUser | null> {
	try {
		// D'abord, essayer de récupérer depuis AsyncStorage
		const storedSession = await AsyncStorage.getItem(SESSION_KEY);
		if (storedSession) {
			const sessionData = JSON.parse(storedSession);
			if (sessionData.userId) {
				const db = await getDatabase();
				const users = await queryAsync<AuthUser>(db, 'SELECT id, email FROM users WHERE id = ?', [sessionData.userId]);
				if (users[0]) {
					// Synchroniser avec la base de données
					await setCurrentUser(sessionData.userId);
					return users[0];
				}
			}
		}

		// Fallback sur la base de données
		const db = await getDatabase();
		const s = await queryAsync<{ current_user_id: number }>(db, 'SELECT current_user_id FROM session LIMIT 1');
		if (s.length === 0 || s[0].current_user_id == null) return null;
		const users = await queryAsync<AuthUser>(db, 'SELECT id, email FROM users WHERE id = ?', [s[0].current_user_id]);
		return users[0] ?? null;
	} catch (error) {
		console.error('Erreur lors de la récupération de la session:', error);
		return null;
	}
}

export async function setCurrentUser(userId: number | null): Promise<void> {
	try {
		// Sauvegarder dans AsyncStorage
		if (userId) {
			await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ 
				userId, 
				timestamp: Date.now() 
			}));
		} else {
			await AsyncStorage.removeItem(SESSION_KEY);
		}

		// Sauvegarder dans la base de données
		const db = await getDatabase();
		const s = await queryAsync<{ current_user_id: number }>(db, 'SELECT current_user_id FROM session LIMIT 1');
		if (s.length === 0) {
			await executeAsync(db, 'INSERT INTO session (current_user_id) VALUES (?)', [userId]);
			return;
		}
		await executeAsync(db, 'UPDATE session SET current_user_id = ?', [userId]);
	} catch (error) {
		console.error('Erreur lors de la sauvegarde de la session:', error);
	}
}

export async function clearSession(): Promise<void> {
	try {
		await AsyncStorage.removeItem(SESSION_KEY);
		await setCurrentUser(null);
	} catch (error) {
		console.error('Erreur lors de la suppression de la session:', error);
	}
}

export async function isSessionValid(): Promise<boolean> {
	try {
		const storedSession = await AsyncStorage.getItem(SESSION_KEY);
		if (!storedSession) return false;
		
		const sessionData = JSON.parse(storedSession);
		const now = Date.now();
		const sessionAge = now - sessionData.timestamp;
		
		// Session valide pendant 30 jours
		const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes
		
		if (sessionAge > maxAge) {
			await clearSession();
			return false;
		}
		
		return true;
	} catch (error) {
		console.error('Erreur lors de la vérification de la session:', error);
		return false;
	}
}



