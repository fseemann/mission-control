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
      label: doc.label,
      undirected: doc.undirected,
      sourceHandle: doc.sourceHandle,
      targetHandle: doc.targetHandle
    }));
  }

  async create(edge: Edge): Promise<Edge> {
    await this.col.insertOne({ ...edge } as any);
    return edge;
  }

  async update(id: string, payload: Partial<Pick<Edge, 'label' | 'undirected'>>): Promise<Edge> {
    await this.col.updateOne({ id } as any, { $set: payload } as any);
    const updated = await this.col.findOne({ id } as any);
    if (!updated) {
      throw new Error(`Edge with ID ${id} not found`);
    }
    return {
      id: updated.id,
      source: updated.source,
      target: updated.target,
      label: updated.label,
      undirected: updated.undirected,
      sourceHandle: updated.sourceHandle,
      targetHandle: updated.targetHandle
    };
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ id } as any);
  }
}
