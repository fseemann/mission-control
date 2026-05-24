import { Collection } from 'mongodb';
import type { Edge } from '@mc/shared';
import type { IEdgeRepository } from '../../application/edge-repository';

export class MongoEdgeRepository implements IEdgeRepository {
  constructor(
    private col: Collection<Edge>
  ) {}

  async findAll(): Promise<Edge[]> {
    const docs = await this.col.find({}).toArray();
    return docs.map(doc => ({
      id: doc.id,
      source: doc.source,
      target: doc.target,
      label: doc.label
    }));
  }

  async create(edge: Edge): Promise<Edge> {
    await this.col.insertOne({ ...edge } as any);
    return edge;
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ id } as any);
  }
}
