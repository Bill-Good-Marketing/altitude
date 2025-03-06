// types/bcrypt.d.ts
declare module 'bcrypt' {
    /**
     * Synchronously generates a hash for the given string.
     * @param data The data to be encrypted.
     * @param saltOrRounds Either the number of rounds or a salt.
     */
    export function hashSync(data: string, saltOrRounds: number | string): string;
  
    /**
     * Synchronously compares the data with the given hash.
     * @param data The data to be compared.
     * @param encrypted The existing hash to compare against.
     */
    export function compareSync(data: string, encrypted: string): boolean;
  
    // ... add any other bcrypt functions you use, e.g. async variants:
    // export function hash(data: string, saltOrRounds: number | string): Promise<string>;
    // export function compare(data: string, encrypted: string): Promise<boolean>;
  }
  