import { describe, test, expect, beforeAll } from 'bun:test';
import { ObjectId, Collection } from 'mongodb';
import { MongoWidgetRepository } from './mongo-widget-repository';
import { MongoEdgeRepository } from './mongo-edge-repository';
import type { Edge, Widget } from '@mc/shared';
import type { NewWidget } from '../../application/widget-repository';

// Set up mock encryption key before loading crypto
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('Mongo Repositories', () => {
  let cryptoMod: { encrypt: (s: string) => string; decrypt: (s: string) => string };
  
  beforeAll(async () => {
    cryptoMod = await import('../crypto');
  });

  // Simple in-memory mock collection
  function createMockCollection<T>() {
    const data = new Map<string, any>();
    return {
      data,
      find: () => ({
        toArray: async () => Array.from(data.values())
      }),
      findOne: async (filter: any) => {
        return data.get(filter._id.toHexString()) || null;
      },
      insertOne: async (doc: any) => {
        const _id = doc._id || new ObjectId();
        const newDoc = { ...doc, _id };
        data.set(_id.toHexString(), newDoc);
        return { insertedId: _id };
      },
      findOneAndUpdate: async (filter: any, update: any) => {
        const key = filter._id.toHexString();
        const doc = data.get(key);
        if (!doc) return null;
        const updated = { ...doc, ...update.$set };
        if (update.$unset) {
          for (const k of Object.keys(update.$unset)) {
            delete updated[k];
          }
        }
        data.set(key, updated);
        return updated;
      },
      deleteOne: async (filter: any) => {
        if (filter._id) {
          data.delete(filter._id.toHexString());
        } else if (filter.id) {
          for (const [key, value] of data.entries()) {
            if (value.id === filter.id) {
              data.delete(key);
              break;
            }
          }
        }
      },
      updateOne: async (filter: any, update: any) => {
        const key = filter._id.toHexString();
        const doc = data.get(key);
        if (doc) {
          data.set(key, { ...doc, ...update.$set });
        }
      }
    } as unknown as Collection<T>;
  }

  describe('MongoWidgetRepository', () => {
    test('should insert and encrypt env vars in DB, but return decrypted on CRUD operations', async () => {
      const mockCol = createMockCollection<any>();
      const repo = new MongoWidgetRepository(mockCol, cryptoMod);
      
      const newWidget: NewWidget = {
        label: 'Test Widget',
        code: 'console.log("hello")',
        envVars: [
          { key: 'API_KEY', value: 'secret-token' },
          { key: 'PORT', value: '8080' }
        ],
        position: { x: 10, y: 20 },
        cronExpression: '*/5 * * * *',
        timeoutMs: 5000
      };

      // 1. Create
      const created = await repo.create(newWidget);
      expect(created._id).toBeDefined();
      expect(created.label).toBe(newWidget.label);
      expect(created.envVars).toEqual(newWidget.envVars); // plaintext returned
      expect(created.timeoutMs).toBe(5000);
      expect(created.status).toBe('idle');
      
      // Verify stored document is encrypted
      const rawDoc = (mockCol as any).data.get(created._id);
      expect(rawDoc).toBeDefined();
      expect(rawDoc.envVars[0].value).not.toBe('secret-token'); // encrypted
      expect(cryptoMod.decrypt(rawDoc.envVars[0].value)).toBe('secret-token');

      // 2. FindById
      const found = await repo.findById(created._id);
      expect(found).not.toBeNull();
      expect(found!.envVars).toEqual(newWidget.envVars); // decrypted

      // 3. Update env vars
      const updated = await repo.update(created._id, {
        envVars: [{ key: 'API_KEY', value: 'new-token' }]
      });
      expect(updated.envVars[0].value).toBe('new-token');
      
      // Verify DB has new encrypted value
      const rawDoc2 = (mockCol as any).data.get(created._id);
      expect(cryptoMod.decrypt(rawDoc2.envVars[0].value)).toBe('new-token');

      // 3.5. Update and unset cronExpression
      const updatedCron = await repo.update(created._id, {
        cronExpression: ''
      });
      expect(updatedCron.cronExpression).toBeUndefined();
      const rawDocCron = (mockCol as any).data.get(created._id);
      expect(rawDocCron.cronExpression).toBeUndefined();

      // 4. Save result
      await repo.saveResult(created._id, { status: 'ok', durationMs: 120, ranAt: new Date().toISOString() }, 'ok');
      const foundAfterResult = await repo.findById(created._id);
      expect(foundAfterResult!.status).toBe('ok');
      expect(foundAfterResult!.lastResult!.status).toBe('ok');

      // 5. Delete
      await repo.delete(created._id);
      const foundAfterDelete = await repo.findById(created._id);
      expect(foundAfterDelete).toBeNull();
    });
  });

  describe('MongoEdgeRepository', () => {
    test('should insert, retrieve and delete edges', async () => {
      const mockCol = createMockCollection<Edge>();
      const repo = new MongoEdgeRepository(mockCol);

      const edge: Edge = {
        id: 'edge-1',
        source: 'widget-a',
        target: 'widget-b',
        label: 'flow'
      };

      // Create
      const created = await repo.create(edge);
      expect(created).toEqual(edge);

      // Find all
      const all = await repo.findAll();
      expect(all.length).toBe(1);
      expect(all[0]).toEqual(edge);

      // Delete
      await repo.delete('edge-1');
      const allAfterDelete = await repo.findAll();
      expect(allAfterDelete.length).toBe(0);
    });
  });
});
