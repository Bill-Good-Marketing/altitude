//import 'server-only';
import crypto from "crypto";

/**
 * Generates a GUID (Globally Unique Identifier) using a cryptographically secure random number generator.
 * Uses 32 bytes of random data to generate a GUID.
 */
export function generateGuid(): Buffer {
    return crypto.randomBytes(12);
}

/**
 * Generates a random 7 digit verification code. Used for password resets.
 */
export function verificationCode(): string {
    return crypto.randomInt(10 ** 7).toString(10).padStart(7, '0');
}