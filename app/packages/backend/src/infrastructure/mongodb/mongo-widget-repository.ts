import { Collection, ObjectId } from 'mongodb';
import type { Widget, ExecutionResult, WidgetStatus } from '@mc/shared';
import type { IWidgetRepository, NewWidget } from '../../application/widget-repository';

export class MongoWidgetRepository implements IWidgetRepository {
  constructor(
    private col: Collection<Omit<Widget, '_id'> & { _id: ObjectId }>,
    private crypto: { encrypt: (plaintext: string) => string; decrypt: (ciphertext: string) => string }
  ) {}

  async findAll(): Promise<Widget[]> {
    const docs = await this.col.find({}).toArray();
    return docs.map(doc => this.mapDocToWidget(doc));
  }

  async findById(id: string): Promise<Widget | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.col.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.mapDocToWidget(doc);
  }

  async create(data: NewWidget): Promise<Widget> {
    const encryptedEnvVars = (data.envVars || []).map(ev => ({
      key: ev.key,
      value: this.crypto.encrypt(ev.value)
    }));

    const doc = {
      type: data.type || 'widget',
      label: data.label,
      code: data.code || '',
      envVars: encryptedEnvVars,
      cronExpression: data.cronExpression,
      timeoutMs: data.timeoutMs ?? 10_000,
      position: data.position,
      style: data.style,
      status: 'idle' as const,
      updatedAt: new Date().toISOString(),
      milestoneItems: data.milestoneItems || []
    };

    const result = await this.col.insertOne(doc as any);

    return {
      _id: result.insertedId.toHexString(),
      ...doc,
      envVars: data.envVars || [] // Return decrypted (plaintext) envVars
    };
  }

  async update(id: string, patch: Partial<Widget>): Promise<Widget> {
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid widget ID format: ${id}`);
    }

    const updateDoc: any = {};

    if (patch.envVars !== undefined) {
      updateDoc.envVars = patch.envVars.map(ev => ({
        key: ev.key,
        value: this.crypto.encrypt(ev.value)
      }));
    }

    // Copy other fields if defined
    const fields: Array<keyof Widget> = [
      'type',
      'label',
      'code',
      'timeoutMs',
      'position',
      'style',
      'status',
      'lastResult',
      'milestoneItems'
    ];

    for (const field of fields) {
      if (patch[field] !== undefined) {
        updateDoc[field] = patch[field];
      }
    }

    const unsetDoc: any = {};
    if (patch.cronExpression !== undefined) {
      if (patch.cronExpression && patch.cronExpression.trim() !== '') {
        updateDoc.cronExpression = patch.cronExpression;
      } else {
        unsetDoc.cronExpression = '';
      }
    }

    updateDoc.updatedAt = new Date().toISOString();

    const updateQuery: any = { $set: updateDoc };
    if (Object.keys(unsetDoc).length > 0) {
      updateQuery.$unset = unsetDoc;
    }

    const result = await this.col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      updateQuery,
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error(`Widget with ID ${id} not found`);
    }

    return this.mapDocToWidget(result);
  }

  async delete(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.col.deleteOne({ _id: new ObjectId(id) });
  }

  async saveResult(
    id: string,
    result: ExecutionResult,
    status: WidgetStatus
  ): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid widget ID format: ${id}`);
    }

    await this.col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          lastResult: result,
          status,
          updatedAt: new Date().toISOString()
        }
      }
    );
  }

  private mapDocToWidget(doc: any): Widget {
    const decryptedEnvVars = (doc.envVars || []).map((ev: any) => ({
      key: ev.key,
      value: this.crypto.decrypt(ev.value)
    }));

    return {
      _id: doc._id.toHexString(),
      type: doc.type || 'widget',
      label: doc.label,
      code: doc.code,
      envVars: decryptedEnvVars,
      cronExpression: doc.cronExpression,
      timeoutMs: doc.timeoutMs,
      position: doc.position,
      style: doc.style,
      status: doc.status,
      lastResult: doc.lastResult,
      updatedAt: doc.updatedAt,
      milestoneItems: doc.milestoneItems || []
    };
  }
}
