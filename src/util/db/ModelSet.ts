//import 'server-only';

export interface ModelSetData {
    guid: Buffer;
    isDeleted: () => boolean;
    isNew: () => boolean;
    setKey: () => string;
    className: () => string;
    dirty: boolean;
    dirtyFromDiff: (other: any) => void;
}

export default class ModelSet<T extends ModelSetData> {
    private _set: { [key: string]: T } = {};

    private identifier: string = 'ModelSet';

    constructor(initial?: T[]) {
        if (initial) {
            for (const val of initial) {
                this.add(val);
            }
        }
    }

    add(item: T) {
        this._set[item.setKey()] = item;
    }

    remove(item: T) {
        delete this._set[item.setKey()];
    }

    has(item: T | string | Buffer) {
        if (typeof item === 'string' || Buffer.isBuffer(item)) {
            return this.containsHash(item);
        }
        return this._set[item.setKey()] !== undefined;
    }

    get(item: string | Buffer) {
        if (Buffer.isBuffer(item)) {
            item = item.toString('hex');
        }
        return this._set[item];
    }

    private containsHash(hash: Buffer | string) {
        if (Buffer.isBuffer(hash)) {
            hash = hash.toString('hex');
        }
        return this._set[hash] !== undefined;
    }

    clear() {
        this._set = {};
    }

    size() {
        return Object.keys(this._set).length;
    }

    toArray() {
        return Object.values(this._set);
    }

    empty() {
        return this.size() === 0;
    }

    find(predicate: (item: T) => boolean) {
        for (const item of this) {
            if (predicate(item)) {
                return item;
            }
        }
        return undefined;
    }

    toString() {
        return JSON.stringify(this._set);
    }

    first() {
        return this.toArray()[0];
    }

    forEach(callback: (item: T) => void) {
        for (const item of this.toArray()) {
            callback(item);
        }
    }

    map<U>(callback: (item: T, index: number) => U) {
        return this.toArray().map(callback);
    }

    some(callback: (item: T) => boolean) {
        for (const item of this.toArray()) {
            if (callback(item)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns a new ModelSet containing only the items that return true from the callback
     * @param callback The callback to filter the items
     */
    filter(callback: (item: T) => boolean) {
        const set = new ModelSet<T>();
        for (const item of this.toArray()) {
            if (callback(item)) {
                set.add(item);
            }
        }
        return set;
    }

    static fromArray<T extends ModelSetData>(array: T[]) {
        const set = new ModelSet<T>();
        for (const item of array) {
            set.add(item);
        }
        return set;
    }

    static isModelSet<T extends ModelSetData>(obj: unknown): obj is ModelSet<T> {
        return obj != null && (obj as object).hasOwnProperty('_set') && (obj as object).hasOwnProperty('first')
    }

    [Symbol.iterator](): Iterator<T> {
        return this.toArray()[Symbol.iterator]();
    }

    keys() {
        return Object.keys(this._set);
    }

    // Unchanged elements, returns the values in the other set
    intersection(other: ModelSet<T>) {
        const intersection = new ModelSet<T>();
        for (const key in this._set) {
            if (other.has(key)) {
                intersection.add(other._set[key]);
            }
        }
        return intersection;
    }
    
    // Gets the elements that were removed from this set. Essentially, these are the elements that ARE in this set but NOT in the other set.
    removed(other: ModelSet<T>) {
        const removed = new ModelSet<T>();
        for (const key in this._set) {
            if (!other.has(key)) {
                removed.add(this._set[key]);
            }
        }
        return removed;
    }

    // Gets the elements that were added to this set. Essentially, these are the elements that ARE in the other set but NOT in this set.
    addedTo(other: ModelSet<T>) {
        const added = new ModelSet<T>();
        for (const key in other._set) {
            if (!this.has(key)) {
                added.add(other._set[key]);
            }
        }
        return added;
    }

    isDifferent(other: ModelSet<T>) {
        if (this.size !== other.size) return true;
        const intersection = this.intersection(other);
        if (intersection.size !== this.size) return true;
        // Check if each element in this set is not different from the other set
        let _dirty = false;
        for (const id in this._set) {
            const _other = other.get(id);
            const _this = this.get(id);
            if (_other == null) return true;
            _this.dirtyFromDiff(_other);
            if (_this.dirty) {
                _dirty = true;
            }
        }
        return _dirty;
    }
}

// For many-to-many relationships. Stores the properties of the relationship. Links one object to another object, with multiple relationships.
export class RelationshipModelSet<T extends ModelSetData> extends ModelSet<T> {
    private _relationship: { [key: string]: RecordSet<string, any> } = {};

    constructor(initial?: T[]) {
        super(initial);
    }

    addRelationship(item: T, properties: { [key: string]: any }) {
        super.add(item);
        if (!this._relationship[item.setKey()]) {
            this._relationship[item.setKey()] = new RecordSet();
        }
        this._relationship[item.setKey()].add(properties);
    }

    getRelationships(item: T) {
        return this._relationship[item.setKey()];
    }

    remove(item: T) {
        super.remove(item);
        delete this._relationship[item.setKey()];
    }

    static is(obj: unknown): obj is RelationshipModelSet<any> {
        return ModelSet.isModelSet(obj) && obj.hasOwnProperty('_properties');
    }
}

export class RecordSet<K extends string, V> {
    private _set: { [key: string]: Record<K, V> } = {};

    createKey(record: Record<string, any>) {
        const orderedKeys = Object.keys(record).sort();
        const keyParts = orderedKeys.map(key => `${key}:${record[key]}`);
        return keyParts.join(';');
    }

    constructor(initial?: Record<string, any>[]) {
        if (initial) {
            for (const record of initial) {
                this.add(record);
            }
        }
    }

    add(record: Record<string, any>) {
        const key = this.createKey(record);
        this._set[key] = record;
    }

    map<U>(callback: (record: Record<string, any>, index: number) => U) {
        return Object.values(this._set).map(callback);
    }
}