import type { Edge } from '@mc/shared';

export interface IEdgeRepository {
  findAll(): Promise<Edge[]>;
  create(edge: Edge): Promise<Edge>;
  delete(id: string): Promise<void>;
}
