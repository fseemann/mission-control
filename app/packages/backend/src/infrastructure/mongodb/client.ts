import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connects to MongoDB using the provided URI or MONGODB_URI environment variable.
 * Must be called and awaited at application startup.
 */
export async function connectDb(uri?: string): Promise<Db> {
  if (db) return db;

  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();
  return db;
}

/**
 * Returns the cached database instance.
 * Throws if connectDb() has not been successfully completed.
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return db;
}

/**
 * Closes the database connection.
 */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
