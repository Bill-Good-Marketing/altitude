//import 'server-only';
import bcrypt from 'bcrypt';
import crypto from "crypto";

/**
 * Hashes a password with a given difficulty
 * @param password The plaintext password
 * @param difficulty The difficulty of the hash, defaults to 10. For hashing admin passwords, use 12 or higher
 */
export function hashPassword(password: string, difficulty: number = 10): string {
    return bcrypt.hashSync(password, difficulty);
}

/**
 * Compares a plaintext password to a hash
 * @param password The plaintext password
 * @param hash The hash to compare to
 *
 */
export function comparePassword(password: string, hash?: string): boolean {
    if (hash == null) {
        return false;
    }
    return bcrypt.compareSync(password, hash);
}

const algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
const key = crypto
    .createHash('sha512')
    .update(process.env.ENCRYPTION_SECRET || 'default')
    .digest('hex')
    .substring(0, 32)
const encryptionIV = crypto
    .createHash('sha512')
    .update(process.env.ENCRYPTION_IV || 'default')
    .digest('hex')
    .substring(0, 16)

if (process.env.NODE_ENV === 'production') {
    if (process.env.ENCRYPTION_SECRET == null) {
        throw new Error('ENCRYPTION_SECRET is not set')
    }
    if (process.env.ENCRYPTION_IV == null) {
        throw new Error('ENCRYPTION_IV is not set')
    }
}

/**
 * Encrypts data of different types
 * @param data The data to encrypt
 * @param append The data to append to the IV before encrypting. Creates a unique encryption output.
 */
export function encryptData(data: string | number | Date | boolean | number[] | string[], append: string = '') {
    let cypherIv = encryptionIV

    if (append !== '') {
        cypherIv = crypto.createHash('sha512').update(process.env.ENCRYPTION_IV || 'default' + append).digest('hex').substring(0, 16)
    }

    switch (typeof data) {
        case 'number':
            data = data.toString()
            break
        case 'boolean':
            data = data.toString()
            break
        case 'object':
            if (data instanceof Date) {
                data = data.toISOString()
            } else if (Array.isArray(data)) {
                data = JSON.stringify(data)
            } else {
                throw new Error('Invalid data type')
            }
            break
    }

    const cipher = crypto.createCipheriv(algorithm, key, cypherIv)
    return Buffer.from(
        cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
    ).toString('base64') // Encrypts data and converts to hex and base64
}

export declare type EncryptionDType = 'date' | 'number' | 'string' | 'string[]' | 'number[]' | 'boolean'

/**
 * Decrypts data of different types
 * @param encryptedData The encrypted data
 * @param dtype The type of the data to decrypt
 * @param append The data to append to the IV before decrypting
 */
export function decryptData(encryptedData: string, dtype: EncryptionDType = 'string', append: string = '') {
    let cypherIv = encryptionIV

    if (append !== '') {
        cypherIv = crypto.createHash('sha512').update(process.env.ENCRYPTION_IV || 'default' + append).digest('hex').substring(0, 16)
    }


    const buff = Buffer.from(encryptedData, 'base64')
    const decipher = crypto.createDecipheriv(algorithm, key, cypherIv)
    try {
        const raw = (
            decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
            decipher.final('utf8')
        ) // Decrypts data and converts to utf8

        switch (dtype) {
            case 'number':
                return parseFloat(raw)
            case 'date':
                return new Date(raw)
            case 'string':
                return raw
            case 'string[]':
                return JSON.parse(raw)
            case 'number[]':
                return JSON.parse(raw)
            case 'boolean':
                return raw === 'true'
        }
    } catch (e) {
        if ((e as Error).message.includes('Provider routines::bad decrypt')) {
            return 'Bad Decryption Key'
        }
    }
}