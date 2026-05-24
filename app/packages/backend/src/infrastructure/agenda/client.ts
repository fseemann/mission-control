import Agenda from 'agenda';

/**
 * Creates and returns a configured Agenda instance connected to MongoDB.
 * 
 * @param mongoUri MongoDB connection string
 * @returns Configured Agenda instance
 */
export function createAgenda(mongoUri: string): Agenda {
  return new Agenda({
    db: { address: mongoUri },
    defaultLockLifetime: 10 * 60 * 1000, // 10 minutes in milliseconds
  });
}
