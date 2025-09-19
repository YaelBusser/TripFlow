import * as SQLite from 'expo-sqlite';

export type DatabaseConnection = any;

let dbInstance: DatabaseConnection | null = null;

export async function getDatabase(): Promise<DatabaseConnection> {
	if (dbInstance) return dbInstance;
	const sqliteAny: any = SQLite as any;
	let db: DatabaseConnection | null = null;
	if (typeof sqliteAny.openDatabaseAsync === 'function') {
		// New async API (SDK 50+)
		db = await sqliteAny.openDatabaseAsync('tripflow.db');
	} else if (typeof sqliteAny.openDatabase === 'function') {
		// Legacy WebSQL API
		db = sqliteAny.openDatabase('tripflow.db');
	} else if (typeof sqliteAny.openDatabaseSync === 'function') {
		// Sync API
		db = sqliteAny.openDatabaseSync('tripflow.db');
	}
	if (!db) {
		throw new Error('expo-sqlite introuvable. Installez-le: npx expo install expo-sqlite');
	}

	await runMigrations(db);
	dbInstance = db;
	return dbInstance;
}

async function runMigrations(db: DatabaseConnection): Promise<void> {
	await executeAsync(
		db,
		`PRAGMA foreign_keys = ON;`
	);

	// users
	await executeAsync(
		db,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			salt TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);`
	);

	// trips
	await executeAsync(
		db,
		`CREATE TABLE IF NOT EXISTS trips (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			destination TEXT,
			description TEXT,
			start_date INTEGER,
			end_date INTEGER,
			cover_uri TEXT,
			created_at INTEGER NOT NULL,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);`
	);

	// steps
	await executeAsync(
		db,
		`CREATE TABLE IF NOT EXISTS steps (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			trip_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			latitude REAL NOT NULL,
			longitude REAL NOT NULL,
			start_date INTEGER,
			end_date INTEGER,
			description TEXT,
			order_index INTEGER DEFAULT 0,
			FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
		);`
	);

	// journal entries (text/photo uri per step)
	await executeAsync(
		db,
		`CREATE TABLE IF NOT EXISTS journal_entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			step_id INTEGER NOT NULL,
			content TEXT,
			photo_uri TEXT,
			created_at INTEGER NOT NULL,
			FOREIGN KEY(step_id) REFERENCES steps(id) ON DELETE CASCADE
		);`
	);

	// checklist items (per trip)
	await executeAsync(
		db,
		`CREATE TABLE IF NOT EXISTS checklist_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			trip_id INTEGER NOT NULL,
			text TEXT NOT NULL,
			is_checked INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
		);`
	);

	// Add new columns to trips table if they don't exist
	try {
		await executeAsync(db, 'ALTER TABLE trips ADD COLUMN destination TEXT;');
	} catch (e) {
		// Column already exists, ignore
	}
	
	try {
		await executeAsync(db, 'ALTER TABLE trips ADD COLUMN description TEXT;');
	} catch (e) {
		// Column already exists, ignore
	}

	// Add created_at column to checklist_items if it doesn't exist
	try {
		await executeAsync(db, 'ALTER TABLE checklist_items ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;');
	} catch (e) {
		// Column already exists, ignore
	}

	// Migrate checklist_items columns if needed
	try {
		await executeAsync(db, 'ALTER TABLE checklist_items ADD COLUMN text TEXT;');
		await executeAsync(db, 'UPDATE checklist_items SET text = title WHERE text IS NULL;');
		await executeAsync(db, 'ALTER TABLE checklist_items DROP COLUMN title;');
	} catch (e) {
		// Migration already done or not needed
	}

	try {
		await executeAsync(db, 'ALTER TABLE checklist_items ADD COLUMN is_checked INTEGER;');
		await executeAsync(db, 'UPDATE checklist_items SET is_checked = is_done WHERE is_checked IS NULL;');
		await executeAsync(db, 'ALTER TABLE checklist_items DROP COLUMN is_done;');
	} catch (e) {
		// Migration already done or not needed
	}

	// simple session table to persist current logged-in user
	await executeAsync(
		db,
		`CREATE TABLE IF NOT EXISTS session (
			current_user_id INTEGER
		);`
	);
}

export function executeAsync(db: DatabaseConnection, sql: string, params: any[] = []): Promise<void> {
	// Support async API (runAsync) and WebSQL tx API
	if (typeof db.runAsync === 'function') {
		return db.runAsync(sql, params).then(() => undefined);
	}
	return new Promise((resolve, reject) => {
		db.transaction((tx: any) => {
			tx.executeSql(
				sql,
				params,
				() => resolve(),
				(_txObj: any, error: any) => {
					reject(error);
					return true;
				}
			);
		});
	});
}

export function queryAsync<T = any>(db: DatabaseConnection, sql: string, params: any[] = []): Promise<T[]> {
	if (typeof db.getAllAsync === 'function') {
		return db.getAllAsync(sql, params) as Promise<T[]>;
	}
	return new Promise((resolve, reject) => {
		db.transaction((tx: any) => {
			tx.executeSql(
				sql,
				params,
				(_tx: any, result: any) => {
					const rows: T[] = [];
					for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
					resolve(rows);
				},
				(_txObj: any, error: any) => {
					reject(error);
					return true;
				}
			);
		});
	});
}


