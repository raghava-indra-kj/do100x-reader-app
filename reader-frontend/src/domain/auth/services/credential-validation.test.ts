import { describe, expect, it } from 'vitest';
import { validateCredentials } from './credential-validation';

describe('credential validation', () => {
    it('accepts email-length usernames and ordinary passwords', () => {
        expect(validateCredentials({ username: 'reader.user@example.com', password: 'a longer password' })).toBeNull();
        expect(validateCredentials({ username: 'u'.repeat(255), password: 'p'.repeat(255) })).toBeNull();
    });
    it('rejects empty and oversized credentials with field-specific errors', () => {
        expect(validateCredentials({ username: ' ', password: 'valid' })?.message).toBe('Username is required');
        expect(validateCredentials({ username: 'user', password: ' ' })?.message).toBe('Password is required');
        expect(validateCredentials({ username: 'u'.repeat(256), password: 'valid' })?.message).toContain('Username must be 255');
        expect(validateCredentials({ username: 'user', password: 'p'.repeat(256) })?.message).toContain('Password must be 255');
    });
});
