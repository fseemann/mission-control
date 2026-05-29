import type { Edge } from '@mc/shared';

export interface IEdgeRepository {
  findAll(): Promise<Edge[]>;
  create(edge: Edge): Promise<Edge>;
  update(id: string, payload: Partial<Pick<Edge, 'label' | 'undirected'>>): Promise<Edge>;
  delete(id: string): Promise<void>;
}
