import crypto from 'node:crypto';

// Read ENCRYPTION_KEY from process.env
const encryptionKeyHex = process.env.ENCRYPTION_KEY;
if (!encryptionKeyHex) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

const key = Buffer.from(encryptionKeyHex, 'hex');
if (key.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Prepends the 12-byte IV (24 hex characters) and 16-byte auth tag (32 hex characters) to the ciphertext.
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Return format: iv (24 chars hex) + tag (32 chars hex) + encrypted
  return iv.toString('hex') + tag.toString('hex') + encrypted;
}

/**
 * Decrypts ciphertext using AES-256-GCM.
 * Extracts IV and tag from the prefix of the ciphertext.
 */
export function decrypt(ciphertext: string): string {
  if (ciphertext.length < 56) {
    throw new Error('Invalid ciphertext format: too short');
  }
  
  const ivHex = ciphertext.substring(0, 24);
  const tagHex = ciphertext.substring(24, 56);
  const encryptedHex = ciphertext.substring(56);
  
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
