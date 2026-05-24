import type { Widget, Edge } from '@mc/shared';
import { ObjectId } from 'mongodb';
import { getDb } from './client';

export const widgetsCol = () =>
  getDb().collection<Omit<Widget, '_id'> & { _id: ObjectId }>('widgets');

export const edgesCol = () =>
  getDb().collection<Edge>('edges');
