import { describe, test, expect } from 'bun:test';
import Agenda from 'agenda';
import { createAgenda } from './client';

describe('Agenda client factory', () => {
  test('should construct Agenda instance with specified options', () => {
    const mongoUri = 'mongodb://localhost:27017/test-agenda';
    const agenda = createAgenda(mongoUri);
    
    expect(agenda).toBeInstanceOf(Agenda);
    expect((agenda as any)._defaultLockLifetime).toBe(600000);
  });
});
