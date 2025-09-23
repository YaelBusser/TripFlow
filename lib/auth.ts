import * as Crypto from 'expo-crypto';
import { executeAsync, getDatabase, queryAsync } from './db';

export type AuthUser = {
	id: number;
	email: string;
	name?: string;
	profile_photo_uri?: string;
};

function generateSalt(): string {
	// 16 bytes hex salt
	const array = new Uint8Array(16);
	for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
	return Array.from(array)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
	// hash = SHA-256(salt + password)
	return await Crypto.digestStringAsync(
		Crypto.CryptoDigestAlgorithm.SHA256,
		`${salt}${password}`,
		{ encoding: Crypto.CryptoEncoding.HEX }
	);
}

export async function signUp(email: string, password: string, name?: string): Promise<AuthUser> {
	const db = await getDatabase();
	const existing = await queryAsync<{ id: number }>(db, 'SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
	if (existing.length > 0) {
		throw new Error('Email déjà utilisé');
	}
	const salt = generateSalt();
	const passwordHash = await hashPassword(password, salt);
	const createdAt = Date.now();
	await executeAsync(
		db,
		'INSERT INTO users (email, password_hash, salt, name, created_at) VALUES (?, ?, ?, ?, ?)',
		[email.trim().toLowerCase(), passwordHash, salt, name || null, createdAt]
	);
	const rows = await queryAsync<AuthUser>(db, 'SELECT id, email, name, profile_photo_uri FROM users WHERE email = ?', [email.trim().toLowerCase()]);
	return rows[0];
}

export async function login(email: string, password: string): Promise<AuthUser> {
	const db = await getDatabase();
	const rows = await queryAsync<{ id: number; email: string; salt: string; password_hash: string; name: string; profile_photo_uri: string }>(
		db,
		'SELECT id, email, salt, password_hash, name, profile_photo_uri FROM users WHERE email = ?',
		[email.trim().toLowerCase()]
	);
	if (rows.length === 0) throw new Error('Identifiants invalides');
	const user = rows[0];
	const hash = await hashPassword(password, user.salt);
	if (hash !== user.password_hash) throw new Error('Identifiants invalides');
	return { id: user.id, email: user.email, name: user.name, profile_photo_uri: user.profile_photo_uri };
}

export async function updateUserProfile(userId: number, updates: { name?: string; email?: string; profile_photo_uri?: string | null }): Promise<AuthUser> {
	const db = await getDatabase();
	
	// Vérifier si l'email est déjà utilisé par un autre utilisateur
	if (updates.email) {
		const existing = await queryAsync<{ id: number }>(db, 'SELECT id FROM users WHERE email = ? AND id != ?', [updates.email.trim().toLowerCase(), userId]);
		if (existing.length > 0) {
			throw new Error('Email déjà utilisé');
		}
	}
	
	// Construire la requête de mise à jour
	const updateFields = [];
	const updateValues = [];
	
	if (updates.name !== undefined) {
		updateFields.push('name = ?');
		updateValues.push(updates.name || null);
	}
	
	if (updates.email !== undefined) {
		updateFields.push('email = ?');
		updateValues.push(updates.email.trim().toLowerCase());
	}
	
	if (updates.profile_photo_uri !== undefined) {
		updateFields.push('profile_photo_uri = ?');
		updateValues.push(updates.profile_photo_uri || null);
	}
	
	if (updateFields.length === 0) {
		throw new Error('Aucune modification à apporter');
	}
	
	updateValues.push(userId);
	
	await executeAsync(
		db,
		`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
		updateValues
	);
	
	// Récupérer l'utilisateur mis à jour
	const rows = await queryAsync<AuthUser>(db, 'SELECT id, email, name, profile_photo_uri FROM users WHERE id = ?', [userId]);
	return rows[0];
}



