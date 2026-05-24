import { describe, test, expect, beforeAll } from 'bun:test';

// Set up mock encryption key before importing the module dynamically
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('Symmetric encryption (AES-256-GCM)', () => {
  let encrypt: (plaintext: string) => string;
  let decrypt: (ciphertext: string) => string;

  beforeAll(async () => {
    const mod = await import('./index');
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  test('should encrypt and decrypt correctly', () => {
    const testCases = [
      'Hello World',
      '',
      'Some secrets with spaces and spec!@#$ characters',
      JSON.stringify({ key: 'val', nested: { arr: [1, 2, 3] } }),
    ];

    for (const original of testCases) {
      const encrypted = encrypt(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted.length).toBeGreaterThanOrEqual(56);
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    }
  });

  test('should fail if ciphertext is modified', () => {
    const original = 'secure message';
    const encrypted = encrypt(original);
    
    // Modify one character in the payload
    const modifiedEncrypted = encrypted.substring(0, encrypted.length - 1) + 
      (encrypted.charCodeAt(encrypted.length - 1) === 48 ? '1' : '0');
      
    expect(() => decrypt(modifiedEncrypted)).toThrow();
  });
});
