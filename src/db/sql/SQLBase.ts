/**
 * @fileoverview Database wrapper for the application, includes all the database related functions, and the database connection.
 */
//import 'server-only';
import {Prisma, PrismaClient, PrismaPromise} from "@prisma/client";
import {
    DeletedObjectError,
    NonGenericServerError,
    ProgrammingError,
    ReadOnlyError,
    RequiredPropertyError,
    UncommitedObjectError,
    UniqueConstraintViolationError,
    UnsupportedOperationError,
    ValidationError
} from "~/common/errors";
import {generateGuid} from "~/util/db/guid";
import {decryptData, encryptData} from "~/util/db/datamanagement";
import ModelSet from "~/util/db/ModelSet";
import {LogLevel} from "~/common/enum/serverenums";
import {
    _calculatedAttributes,
    _calculatedPropertyDependencies,
    _computedAttributes,
    _computedPropertyDependencies,
    _defaults,
    _encryptedProperties,
    _graphProperties,
    _idsToWrapped,
    _joinedFields,
    _jointables,
    _jointablesReverse,
    _onload,
    _persistedProperties,
    _relationships,
    _requiredProperties,
    _reverseGraphProps,
    _reverseJoinedFields,
    _uniqueEncryptedProperties,
    _wrappers,
    hooks,
} from "~/db/sql/decorators";
import {currentTsx} from "~/db/sql/transaction";
import {ModelKeys, SoftDeleteModels} from "~/db/sql/keys";
// import {ongdb} from "~/db/graph/ONgDB";
import {quickTrace} from "~/util/tracing";
import {ModelArrayWhere, ReadWhere} from "~/db/sql/types/where";
import {ArrayReadAttributes, ReadAttributes, ReadAttributesObject} from "~/db/sql/types/select";
import {
    Counts,
    IModel,
    ModelAttributes,
    ModelQueryable,
    ReadOptions,
    ReadOrder,
    ReadResult,
    ReadUniqueOptions
} from "~/db/sql/types/model";
import {QueryStrategy, ValueType} from "~/db/sql/types/utility";
import {englishList} from "~/util/strings";
import {ClassNameMapping} from "~/common/enum/enumerations";
import {BatchResult} from "~/db/sql/types/hooks";
import {Logger} from "~/util/Logger";
import PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;

const Reset = "\x1b[0m"
const Bright = "\x1b[1m"

const FgRed = "\x1b[31m"
const FgYellow = "\x1b[33m"
const FgCyan = "\x1b[36m"

const prismaClientSingleton = () => {
    const client = new PrismaClient({
        log: [
            {
                emit: 'event',
                level: 'query',
            },
            {
                emit: 'stdout',
                level: 'error',
            },
            {
                emit: 'stdout',
                level: 'info',
            },
            {
                emit: 'stdout',
                level: 'warn',
            },
        ],
    });

    if (process.env.NODE_ENV === 'development') {
        client.$on('query', (e) => {
            const _params = e.params.slice(1, e.params.length - 1)
            const regex = /(?:'((?:[^']|\\')*)'|"((?:[^"]|\\")*)"|([^,]+))(?:,|$)/g
            let query = e.query
            let param;

            let i = 1

            while ((param = regex.exec(_params)) !== null) {
                // Push the first non-null capturing group
                let _param = param[3]
                if (_param === undefined) {
                    _param = `"${param[1] || param[2]}"`
                }
                _param = _param.slice(0, 80) // first 80 chars
                query = query.replace(`$${i}`, `${FgYellow}${_param}${Reset}`)
                i++
            }

            console.log(`${FgCyan}prisma:query${Reset} ${query} ${Reset}(${Bright + FgRed}${e.duration}${Reset})`);
        })
    }

    return client
}

declare global {
    // eslint-disable-next-line no-var
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}
export const dbClient = globalThis.prismaGlobal ?? prismaClientSingleton()
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = dbClient;

const _initialized: { [key: string]: boolean } = {};
type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>

function isBatchResult(result: boolean | LogLevel | BatchResult | undefined | void): result is BatchResult {
    return result != null && (result as BatchResult).internal_isBatchMarker;
}

// function isPrismaPromiseArray(result: Array<PrismaPromise<any>> | Array<GraphQuery>): result is Array<PrismaPromise<any>> {
//     return isPromise(result[0]);
// }

function isPromise(result: unknown): result is Promise<any> {
    return result != null && typeof result === 'object' && typeof (result as Promise<any>).then === 'function';
}

type ArrayMethod = 'push' | 'pop' | 'shift' | 'unshift' | 'splice' | 'set';

// Callback is called BEFORE the mutation is made so the passed state reflect the state BEFORE the mutation
function ArrayMutationProxy<T extends Model<any>>(arr: Array<T>, callback: (method: ArrayMethod, args: any[], arr: Array<T>) => void) {
    return new Proxy(arr, {
        get(target, prop: string, receiver) {
            // Intercept method calls (push, pop, shift, etc.)
            if (['push', 'pop', 'shift', 'unshift', 'splice'].includes(prop)) {
                return function (...args: any[]) {
                    callback(prop as ArrayMethod, args, target); // Notify about mutation
                    // Call the original method
                    return Array.prototype[prop as any].apply(target, args);
                };
            }
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop: string, value, receiver) {
            if (!isNaN(parseInt(prop as string))) { // Detect direct index assignments (arr[0] = 'newValue')
                callback('set', [prop, value], target);
            }
            return Reflect.set(target, prop, value, receiver);
        },
    });
}


type MutationType = 'dirty' | 'commit' | 'delete';

// When a mutation is made to a sub-model (or even within an array), the listener updates the dirtyness of that property.
// If the property is newly dirty, the current value is stored in the parent model's _old property.
// Different types of mutations are handled differently
type MutationListener = (model: Model<any>, type: MutationType, property?: string) => void;

const LOGGER = new Logger('Model')

export abstract class Model<T extends Model<T>> {
    protected _guid: Buffer;
    private _deleted: boolean;

    /**
     * A readonly object cannot be updated. All loaded properties are also readonly.
     */
    private _readonly: boolean;

    // Should be used to update properties in this class when _load() or the constructor is called
    protected overrideSetFunctionality: boolean | 'preventMutationDetection';

    // When running batch operations, it's important to know if async operations are being performed on the object (such as relationship CRUD, data loading, etc.)
    protected warnOnRemoteOperation: boolean;

    /**
     * Prevents the object from recomputing any computed properties when its dependencies are updated (inside of the computed property's update function).
     */
    public preventRecompute: boolean;
    protected _dirty: PartialRecord<ModelAttributes<T>, any>;
    protected _dirtySubModels: Set<ModelAttributes<T>> = new Set();
    protected _old: PartialRecord<ModelAttributes<T>, any>; // Old values of properties, used for update hooks and rollback
    protected _new: boolean = false;

    // When a mutation is made, the listeners are called to update the dirtyness of the parent models
    protected _mutationListeners: Record<string, MutationListener> = {};

    public _cache: PartialRecord<ModelAttributes<T>, any>;
    protected _loadedProperties: Set<string>;

    public counts: Counts<T> = {};

    protected logger: Logger;

    // The object ID is used to differentiate between different instances of the same object for debugging purposes
    private oid: string;
    // When cloned, this points to the original model
    private _referencedModel?: Model<T>;

    // Not explicitly set on the model, but used to store the reverse relationship for validation purposes
    protected reverse: PartialRecord<ModelAttributes<T>, Model<any> | Model<any>[]> = {};

    protected constructor(id?: Buffer | string | Uint8Array, data?: any, compute: ModelAttributes<T>[] = [], isNew?: boolean) {
        this.oid = generateGuid().toString('hex');
        if (typeof id === 'string') {
            id = Buffer.from(id, 'hex');
        } else if (id == null) {
            id = generateGuid();
            this._new = true
        } else if (isNew) {
            this._new = true;
        }

        if (!Buffer.isBuffer(id)) {
            // It's a Uint8Array
            id = Buffer.from(id);
        }

        this.logger = new Logger(this.className().charAt(0).toUpperCase() + this.className().slice(1));

        this._guid = id as Buffer;

        // Set properties
        this._loadedProperties = new Set<string>();
        this._cache = {};
        this._old = {};
        this._dirty = {}
        this.preventRecompute = false;
        this.overrideSetFunctionality = false;
        this._readonly = false;
        this._deleted = false;
        this.warnOnRemoteOperation = false;

        if (!_initialized[this.className()]) {
            Model.initializeProperties(this.className());
        }

        if (data) {
            this.setData(data)
        }

        if (this.isNew()) {
            this.setDefaults();
        }

        for (const computedProperty of compute) {
            const computeDef = _computedAttributes[this.className()][computedProperty];
            const computeFunc = computeDef.func;
            const dependencies = computeDef.dependencies;
            const args: any[] = [];
            const unloadedDependency: ModelAttributes<T>[] = [];
            for (const dep of dependencies) {
                const prop = dep as ModelAttributes<T>;
                if (!this.isLoaded(prop)) {
                    unloadedDependency.push(prop)
                    continue;
                }
                args.push(this.get(prop));
            }

            if (unloadedDependency.length > 0) {
                throw new UnsupportedOperationError(`Attempted to compute property ${computedProperty} with unloaded dependencies (${unloadedDependency.join(', ')}). Please use add them to the initial data object.`);
            }

            const val = computeFunc(this, ...args);

            Reflect.set(this, `~${computedProperty}`, val);
            this._loadedProperties.add(computedProperty);
            this._dirty[computedProperty as ModelAttributes<T>] = val;
        }

        if (!this.isNew()) {
            this._dirty = {};
            this._dirtySubModels = new Set();
            this._old = {}
        }
    }

    protected setDefaults() {
        if (this.className() in _defaults) {
            for (const property in _defaults[this.className()]) {
                const val = _defaults[this.className()][property];
                if (!this.isLoaded(property as ModelAttributes<T>)) {
                    // If the property is unset, set it to the default value (assuming we have a new instance)
                    this.set(property as ModelAttributes<T>, val);
                }
            }
        }
    }

    public isReadOnly(): boolean {
        return this._readonly;
    }

    public setReadOnly(): void {
        this._readonly = true;
    }

    public static getPrisma() {
        return currentTsx ? currentTsx.transaction : dbClient;
    }

    static initializeProperties(name: string) {
        if (_persistedProperties[name] === undefined) {
            _persistedProperties[name] = new Set();
        }
        if (_requiredProperties[name] === undefined) {
            _requiredProperties[name] = new Set();
        }
        if (_calculatedPropertyDependencies[name] === undefined) {
            _calculatedPropertyDependencies[name] = {};
        }
        if (_wrappers[name] === undefined) {
            _wrappers[name] = {};
        }
        if (_jointables[name] === undefined) {
            _jointables[name] = {};
        }
        if (hooks[name] === undefined) {
            hooks[name] = {
                update: {
                    before: [],
                    after: []
                },
                create: {
                    before: [],
                    after: []
                },
                delete: {
                    before: [],
                    after: []
                },
                read: {
                    before: [],
                    after: []
                }
            };
        }
        if (_relationships[name] === undefined) {
            _relationships[name] = {};
        }
        if (_graphProperties[name] === undefined) {
            _graphProperties[name] = new Set();
        }
        if (_reverseGraphProps[name] === undefined) {
            _reverseGraphProps[name] = {};
        }
        if (_onload[name] === undefined) {
            _onload[name] = {};
        }
        if (_calculatedAttributes[name] === undefined) {
            _calculatedAttributes[name] = {}
        }
        if (_encryptedProperties[name] === undefined) {
            _encryptedProperties[name] = {};
        }
        if (_uniqueEncryptedProperties[name] === undefined) {
            _uniqueEncryptedProperties[name] = {};
        }
        if (_computedPropertyDependencies[name] === undefined) {
            _computedPropertyDependencies[name] = {};
        }
        if (_computedAttributes[name] === undefined) {
            _computedAttributes[name] = {}
        }
        if (_joinedFields[name] === undefined) {
            _joinedFields[name] = {};
        }
        if (_jointablesReverse[name] === undefined) {
            _jointablesReverse[name] = {};
        }
        if (_reverseJoinedFields[name] === undefined) {
            _reverseJoinedFields[name] = {};
        }
        if (_idsToWrapped[name] === undefined) {
            _idsToWrapped[name] = {};
        }
        _initialized[name] = true;
    }

    toJSON() {
        const obj: any = {};
        for (const property of this._loadedProperties) {
            let data: any = this.get(property as ModelAttributes<T>);
            if (Model.isInstance(data)) {
                data = data.toJSON();
            } else if (Model.isModelArray(data)) {
                data = data.map((val) => {
                    return val.toJSON();
                });
            }
            obj[property] = data;
        }
        obj.className = this.className();
        obj.guid = this.guid;
        obj._cache = this._cache;
        return obj;
    }

    clientSafeJson(include?: ModelAttributes<T>[], tzOffset?: number) {
        const obj: any = {}
        for (const property of this._loadedProperties) {
            if (property === 'tenet' || property === 'tenetId' || property === 'id') {
                continue;
            }
            let data: any = this.get(property as ModelAttributes<T>);
            if (Model.isInstance(data)) {
                data = data.clientSafeJson();
            } else if (Model.isModelArray(data)) {
                data = data.map((val) => {
                    return val.clientSafeJson();
                });
            } else if (Buffer.isBuffer(data)) {
                data = data.toString('hex');
            } else if (data instanceof Date && tzOffset != null) {
                data.setMinutes(data.getMinutes() - tzOffset);
                data = data.toISOString().replace('Z', '');
            }
            obj[property] = data;
        }
        obj.guid = this.guid.toString('hex');
        for (const cacheKey in this._cache) {
            obj[cacheKey] = this._cache[cacheKey as keyof typeof this._cache];
        }
        // Calculate properties if needed
        for (const key of include ?? []) {
            if (this.isCalculated(key)) {
                obj[key] = this.get(key as ModelAttributes<T>);
            }
        }
        return obj;
    }

    public async validate(): Promise<{
        msg: string,
        result: boolean
    }> {
        if (this.isNew()) {
            for (const property of _requiredProperties[this.className()]) {
                if (!(property in this) || this.get(property as ModelAttributes<T>) == null) {
                    return {
                        msg: `Invalid {0}, required property ${property} is not set.`,
                        result: false
                    }
                }
            }
        }

        return {
            msg: "Passed",
            result: true
        };
    }

    protected setData(data: { [key: string]: any }) {
        if (this.overrideSetFunctionality !== 'preventMutationDetection') {
            this.overrideSetFunctionality = true;
        }
        this.preventRecompute = true;
        let cacheVal = {}
        for (const property in data) {
            const _prop = property as ModelAttributes<T>;
            if (property === '_cache') {
                cacheVal = data[property];
            } else {
                this.set(_prop, data[_prop]);
                this._loadedProperties.add(_prop);

                if (this.isPersisted(_prop) || this.isRequired(_prop)) {
                    this._dirty[_prop] = data[_prop];
                }
            }
        }
        this.preventRecompute = false;
        if (this.overrideSetFunctionality === true) {
            this.overrideSetFunctionality = false;
        }
        this._cache = cacheVal;
    }

    get guid(): Buffer {
        return this._guid;
    }

    private _set(property: ModelAttributes<T>, value: any) {
        this.set(property, value);
    }

    private addMutationListener(parent: Model<any>, listener: MutationListener) {
        if (parent.isReadOnly()) {
            console.trace()
            return;
        }
        this._mutationListeners[parent.oid] = listener;
    }

    private removeMutationListener(parent: Model<any>) {
        delete this._mutationListeners[parent.oid];
    }

    protected onMutate<T extends MutationType>(type: T, property?: string) {
        Object.values(this._mutationListeners).forEach(listener => listener(this, type, property));
    }

    // All primitive data and references to other models (NOT deep clone)
    protected oldAssignmentCloneData() {
        const data = {} as any;

        for (const key of this.enumerableProperties()) {
            const _key = key as ModelAttributes<T>;
            let value = this.get(_key);
            if (_key in this._old) {
                value = this._old[_key];
            }
            if (Model.isInstance(value)) {
                data[key] = value
            } else if (Model.isModelArray(value)) {
                data[key] = [...value]
            } else if (value instanceof Date) {
                data[key] = new Date(value);
            } else if (Array.isArray(value)) {
                data[key] = [...value];
            } else {
                // Primitive
                // TODO: If i ever manually manipulate a buffer, i will need to do something here instead of just setting a reference
                data[key] = value;
            }
        }

        return data;
    }

    private cloneForOldAssignment(): Model<any> {
        const model: Model<any> = new (this.constructor as IModel<T>)(this.guid);
        model.overrideSetFunctionality = 'preventMutationDetection';
        model.preventRecompute = true;
        model.setData(this.oldAssignmentCloneData());
        model.preventRecompute = false;
        model.overrideSetFunctionality = false;
        model.setReadOnly();
        model.setReferencedModel(this);
        return model;
    };

    private setReferencedModel(model: Model<any>) {
        this._referencedModel = model;
    }

    private MutationCallback(property: ModelAttributes<T>): MutationListener {
        return (model: Model<any>, type: MutationType, _property?: string) => {
            if (this.isReadOnly()) return; // Read only models won't update
            let isArray = this.isJointable(property);
            if (this.isWrapped(property)) {
                const wrapperDef = _wrappers[this.className()][property];
                if (wrapperDef.isArray || !wrapperDef.isRelationRoot) {
                    isArray = true;
                }
            }
            if (type === 'dirty') {
                if (_property == null) {
                    throw new ProgrammingError('Somehow dirty mutation was called without a property');
                }
                if (!this.isDirty(property)) {
                    // If not dirty, make sure to add the property to the old list, no need to add to dirty data as that's handled by the commit/create function
                    const _model = model.cloneForOldAssignment();
                    _model.setReadOnly()
                    if (_model.get(_property) === undefined) {
                        Reflect.set(_model, `~${_property}`, model.get(_property));
                        _model._loadedProperties.add(_property);
                    }
                    if (isArray) {
                        this._old[property] = (this.get(property) as Model<any>[] | undefined)?.map(val => {
                            const _val = val.cloneForOldAssignment();
                            if (_val.guid.equals(_model.guid)) {
                                return _model;
                            }
                            _val.setReadOnly();
                            return _val;
                        }) ?? [];
                    } else {
                        this._old[property] = _model;
                    }
                    this._dirtySubModels.add(property);
                }
            } else if (type === 'commit') {
                // Update with current state
                const _model = model.cloneForOldAssignment();
                _model.setReadOnly()
                if (isArray) {
                    // Find the model within the old array and update it
                    if (this._old[property] == null) {
                        this._old[property] = [];
                    }
                    const oldModelIndex = (this._old[property] as Model<any>[]).findIndex(_model => _model.guid.equals(model.guid));
                    if (oldModelIndex === -1) {
                        this._old[property].push(_model);
                    } else {
                        this._old[property][oldModelIndex] = _model;
                    }
                } else {
                    this._old[property] = _model;
                }
            } else if (type === 'delete') {
                // Remove state
                delete this._old[property];
            }
        }
    }

    private PrimitiveArrayMutationCallback(property: ModelAttributes<T>) {
        return (method: ArrayMethod, args: any[], array: any[]) => {
            const cur = Reflect.get(this, `~${property}`);
            if (cur === array && !this.isDirty(property)) {
                this._old[property] = [...array]
            }
        }
    }

    private ModelArrayMutationCallback(property: ModelAttributes<T>) {
        return (method: ArrayMethod, args: any[], array: Model<any>[]) => {
            const cur = Reflect.get(this, `~${property}`);
            if (cur === array && !this.isDirty(property)) {
                this._old[property] = array.map(val => val.cloneForOldAssignment());
            }
        }
    }

    addReverse(prop: ModelAttributes<T>, value: Model<any> | Model<any>[]) {
        this.reverse[prop] = value;
        this._loadedProperties.add(prop);
    }

    set<K extends ModelAttributes<T>>(property: K, value: ValueType<K, T>) {
        if (this.overrideSetFunctionality) {
            const _oldValue = Reflect.get(this, `~${property}`);

            if (Model.isInstance(_oldValue)) {
                _oldValue.removeMutationListener(this);
            } else if (Model.isModelArray(_oldValue)) {
                (_oldValue as Model<any>[])?.forEach(val => val.removeMutationListener(this));
            }

            if (this.overrideSetFunctionality !== 'preventMutationDetection') {
                if (Model.isInstance(value)) {
                    value.addMutationListener(this, this.MutationCallback(property));
                } else if (Model.isModelArray(value)) {
                    value = ArrayMutationProxy(value, this.ModelArrayMutationCallback(property)) as typeof value;
                    (value as Model<any>[])?.forEach(val => val.addMutationListener(this, this.MutationCallback(property)));
                } else if (Array.isArray(value)) {
                    value = ArrayMutationProxy(value, this.PrimitiveArrayMutationCallback(property)) as typeof value;
                }
            }

            Reflect.set(this, `~${property}`, value)
            this._loadedProperties.add(property);

            if (this.isComputed(property)) {
                this.preventRecompute = true;
                const updateFunc = _computedAttributes[this.className()][property].update;
                if (updateFunc) {
                    updateFunc(this, value);
                }
                this.preventRecompute = false;
            } else if (this.isPersisted(property) && !this.preventRecompute) {
                this.recompute(property);
            } else if (this.isWrapped(property)) {
                // Set id property
                const wrapper = _wrappers[this.className()][property];
                if (wrapper.isRelationRoot) {
                    const val = value as Model<any>;
                    const idProp = wrapper.idProperty as ModelAttributes<T>;
                    if (value == null) {
                        this._set(idProp, null);
                    } else {
                        this._set(idProp, val.guid);
                    }
                    this._loadedProperties.add(idProp);
                }
            }
            return;
        }
        if (this.isDeleted()) {
            throw new DeletedObjectError('Attempted to modify deleted object')
        }

        if (this.isReadOnly()) {
            throw new ReadOnlyError(`Attempted to modify a readonly ${this.className()}`)
        }

        const old = this.get(property as ModelAttributes<T>);

        if (old === value && typeof old !== 'object') {
            return;
        } else if (old == null && value == null) {
            return;
        } else if (typeof old === 'object') {
            if (Buffer.isBuffer(old) && Buffer.isBuffer(value) && old.equals(value)) {
                return;
            }
        }

        if (Model.isInstance(old)) {
            old.removeMutationListener(this);
        } else if (Model.isModelArray(old)) {
            old.forEach(val => val.removeMutationListener(this));
        }

        if (!(property in this._old)) {
            this._old[property] = old;
        }

        this.invalidateCache(property)

        if (Model.isInstance(value)) {
            value.addMutationListener(this, this.MutationCallback(property));
        } else if (Model.isModelArray(value)) {
            value.forEach(val => val.addMutationListener(this, this.MutationCallback(property)));
            value = ArrayMutationProxy(value, this.ModelArrayMutationCallback(property)) as typeof value;
        } else if (Array.isArray(value)) {
            value.forEach(val => this.addMutationListener(val, this.MutationCallback(property)));
            value = ArrayMutationProxy(value, this.PrimitiveArrayMutationCallback(property)) as typeof value;
        }

        this.onMutate('dirty', property)

        Reflect.set(this, `~${property}`, value)
        if (this.isPersisted(property)) {
            if (!this.preventRecompute) {
                this.recompute(property); // Recompute computed fields that depend on this property
            }
            this._dirty[property] = value;
            this._loadedProperties.add(property);
        } else if (this.isWrapped(property) /*|| this.isRelation(property)*/ || this.isJoinedProperty(property) || this.isJointable(property)) {
            this._loadedProperties.add(property);
            if (this.isWrapped(property) || this.isJointable(property)) {
                this._dirtySubModels.add(property);
            }

            if (this.isWrapped(property) && Model.isInstance(value)) {
                const val = value as Model<any>;
                // Set id property
                const wrapper = _wrappers[this.className()][property];
                if (wrapper.isRelationRoot) {
                    const idProp = wrapper.idProperty as ModelAttributes<T>;
                    if (value == null) {
                        this._set(idProp, null);
                    } else {
                        this._set(idProp, val.guid);
                    }
                }
            }
        } else if (this.isComputed(property) && !this.preventRecompute) {
            const updateFunc = _computedAttributes[this.className()][property].update;
            if (updateFunc) {
                this.preventRecompute = true;
                updateFunc(this, value);
                this.preventRecompute = false;
            }
            this._loadedProperties.add(property);
            this._dirty[property] = value;
        }
    }

    protected invalidateCache(property: string) {
        // Invalidate cache for calculated properties that depend on this property
        if (property in _calculatedPropertyDependencies[this.className()]) {
            for (const calculatedProperty of _calculatedPropertyDependencies[this.className()][property]) {
                const prop = calculatedProperty as ModelAttributes<T>;
                delete this._cache[prop];
            }
        }
    }

    /** NOTE: MUST BE CALLED <i>AFTER</i> property is set. */
    protected recompute(property: string) {
        // Recomputes all persisted computed fields that depend on this property
        if (property in _computedPropertyDependencies[this.className()]) {
            for (const computedProperty of _computedPropertyDependencies[this.className()][property]) {
                const computeDef = _computedAttributes[this.className()][computedProperty];
                const computeFunc = computeDef.func;
                const dependencies = computeDef.dependencies;
                const args: any[] = [];
                for (const dep of dependencies) {
                    const prop = dep as ModelAttributes<T>;
                    if (!this.isLoaded(prop)) {
                        return;
                    }
                    args.push(this.get(prop));
                }

                const val = computeFunc(this, ...args);

                Reflect.set(this, `~${computedProperty}`, val);
                this._loadedProperties.add(computedProperty);
                this._dirty[computedProperty as ModelAttributes<T>] = val;
            }
        }
    }

    public async asyncSet<K extends ModelAttributes<T>>(property: K, value: ValueType<K, T>) {
        if (this.isDeleted()) {
            throw new DeletedObjectError('Attempted to modify deleted object')
        }

        if (this.isNew()) {
            throw new UncommitedObjectError('Attempted to set database property of uncommitted object')
        }

        this.set(property, value);

        if (this.isPersisted(property)) {
            await this.commit();
        }
    }

    get<K extends ModelAttributes<T>>(property: K): ValueType<K, T> {
        let value: any = undefined
        if (this.isCalculated(property)) {
            if (this.isLoaded(property)) {
                return this._cache[property];
            } else {
                const dependencies: ModelAttributes<T>[] = _calculatedAttributes[this.className()][property].dependencies as ModelAttributes<T>[]
                const unloadedDependency: ModelAttributes<T>[] = [];

                const args: any[] = dependencies.map((dependency) => {
                    if (!this.isLoaded(dependency)) {
                        unloadedDependency.push(dependency)
                        return undefined;
                    }
                    return this.get(dependency);
                });

                if (unloadedDependency.length > 0) {
                    throw new UnsupportedOperationError(`Attempted to access calculated property ${property} with unloaded dependencies (${unloadedDependency}), please use asyncGet instead`);
                }

                const value = _calculatedAttributes[this.className()][property].func(this, ...args)
                if (_calculatedAttributes[this.className()][property].options.cache) {
                    this._cache[property] = value;
                }
                return value;
            }
        }
        else if (this.isLoaded(property)) {
            // @ts-expect-error - TS doesn't like it when you try to access an object's property like this, especially when it's not defined in the class.
            value = this[`~${property}`]
        } else if (this.isComputed(property)) {
            // @ts-expect-error - TS doesn't like it when you try to access an object's property like this, especially when it's not defined in the class.
            value = this[`~${property}`];
            // Check if the property can be computed, because it is unloaded
            this.recompute(property);
        } else if (property in this.reverse) {
            return this.reverse[property] as ValueType<K, T>;
        }
        return value;
    }

    protected set new(newVal: boolean) {
        if (!newVal && this._new) {
            this._dirty = {};
            this._dirtySubModels = new Set();
        }

        this._new = newVal;
    }

    public async asyncGet<K extends ModelAttributes<T>>(property: K): Promise<ValueType<K, T>> {
        if (this.isNew()) {
            throw new UncommitedObjectError('Attempted to get database property of uncommitted object')
        }
        if (this.isDeleted()) {
            throw new DeletedObjectError('Attempted to get database property of deleted object')
        }

        if (this.isCalculated(property)) {
            if (this.isLoaded(property)) {
                return this._cache[property];
            }

            const args: any[] = []
            // Calculated property, we want to load any attributes it depends on that haven't been loaded yet
            for (const dependency of _calculatedAttributes[this.className()][property].dependencies) {
                const dep = dependency as ModelAttributes<T>;
                const depsToLoad: ModelAttributes<T>[] = [];
                if (!this.isLoaded(dep)) {
                    depsToLoad.push(dep);
                }

                if (depsToLoad.length > 0) {
                    await this.load(depsToLoad);
                }

                args.push(this.get(dep))
            }

            const value = _calculatedAttributes[this.className()][property].func(this, ...args)
            if (_calculatedAttributes[this.className()][property].options.cache) {
                this._cache[property] = value
            }
            return value;
        } else if (!this.isLoaded(property)) {
            await this.load(property);
        }
        // @ts-expect-error - TS doesn't like it when you try to access an object's property like this, especially when it's not defined in the class.
        return this[property];
    }

    /**
     * Ensures that the object is committed to the database before loading attributes from the db.
     * This should be used in a context where the object may not be committed to the database yet (such as validate and update/create hooks).
     * @param properties Properties to load
     * @param options Options for the load like `force` and the `transaction`
     */
    protected async safeLoad(properties: ModelAttributes<T>[] | ModelAttributes<T>, options: {
        force?: boolean,
        queryStrategy?: QueryStrategy
    } = {}) {
        if (!this.isNew()) {
            await this.load(properties, options);
        }
    }

    public async load(properties: ModelAttributes<T>[] | ModelAttributes<T>, options: {
        force?: boolean,
        queryStrategy?: QueryStrategy
    } = {}) {
        await this._load(options, properties);
    }

    public async selectLoad(select: ReadAttributes<T>, queryStrategy: QueryStrategy = 'join') {
        await this._selectLoad(select, queryStrategy);
    }

    protected async _selectLoad(select: ReadAttributes<T>, queryStrategy: QueryStrategy = 'join') {
        if (this.warnOnRemoteOperation) {
            this.logger.warn(`${this.className()} is loading properties (${englishList(Object.keys(select))}) in a batch operation. This is not recommend. Please load them in a read operation instead.`)
        }

        await quickTrace(`${this.className()}#load`, async (span) => {
            if (this.isNew()) {
                span.setAttribute('wrapper.failureFlag', 'uncommittedObject');
                throw new UncommitedObjectError('Attempted to load database property of uncommitted object')
            }
            if (this.isDeleted()) {
                span.setAttribute('wrapper.failureFlag', 'deletedObject');
                throw new DeletedObjectError('Attempted to load deleted object')
            }

            // console.log('Load', this.className(), select);

            let useInclude = false;
            const include: {
                [key: string]: boolean | ReadAttributesObject<Model<any>> | ArrayReadAttributes<Model<any>[]>
            } = {};

            const client = Model.getPrisma();

            for (const attribute in select) {
                const prop = attribute as ModelAttributes<T>;
                if (attribute in _joinedFields[this.className()]) {
                    const join = _joinedFields[this.className()][attribute];
                    const tables = Array.isArray(join.joinField)
                        ? join.joinField.map(field => _jointables[this.className()][_jointablesReverse[this.className()][field]])
                        : [_jointables[this.className()][_jointablesReverse[this.className()][join.joinField]]];
                    throw new UnsupportedOperationError(`Attempted to select joined field ${this.className()}.${attribute} directly. This field must be queried through a join using ${englishList(
                        tables.map(jointable => `${jointable.model}.${join.joinField}`),
                        'or'
                    )}.`);
                } else if (!(prop in _onload[this.className()]) && this.isWrapped(prop)) {
                    useInclude = true;
                    include[prop] = select[prop as keyof typeof select]!;
                }
            }

            span.setAttribute('wrapper.useInclude', useInclude);
            span.setAttribute('wrapper.tsx', currentTsx != null);

            // @ts-expect-error - We will just hope that the prisma client has this class in it.
            const data = await client[this.className()].findUnique({
                relationLoadStrategy: queryStrategy,
                where: {
                    id: this._guid
                },
                select: useInclude ? undefined : await Model.prepareSelect(this.constructor as IModel<T>, select),
                include: useInclude ? await Model.prepareSelect(this.constructor as IModel<T>, include as ReadAttributes<T>, true) : undefined
            });

            this.overrideSetFunctionality = true;
            await quickTrace('Data Wrapping', async () => {
                for (const property in data) {
                    const prop = property as ModelAttributes<T>;
                    let value = data[prop];
                    if (this.isWrapped(prop) && value != null) {
                        if (Array.isArray(data[prop])) {
                            value = await Promise.all(data[prop].map(async (val: any) => {
                                const wrapper = _wrappers[this.className()][prop].model;
                                if (typeof wrapper === 'string') {
                                    return await Model._wrap(this.isReadOnly(), await Model.getModel(wrapper), val, Object.keys(val) as ModelAttributes<any>[]);
                                } else {
                                    return await Model._wrap(this.isReadOnly(), wrapper, val, Object.keys(val) as ModelAttributes<any>[]);
                                }
                            }))
                        } else {
                            const wrapper = _wrappers[this.className()][prop].model;
                            if (typeof wrapper === 'string') {
                                value = await Model._wrap(this.isReadOnly(), await Model.getModel(wrapper), value, Object.keys(value) as ModelAttributes<any>[]);
                            } else {
                                value = await Model._wrap(this.isReadOnly(), wrapper, value, Object.keys(value) as ModelAttributes<any>[]);
                            }
                        }
                        this.set(prop, value);
                        this._loadedProperties.add(property);
                    } else if (this.isEncrypted(prop)) {
                        value = this.decryptData(prop, value);
                        this.set(prop, value);
                        this._loadedProperties.add(property);
                    } else if (property in _computedPropertyDependencies[this.className()]) {
                        this.set(prop, value);
                        this._loadedProperties.add(property);
                        this.recompute(property);
                    } else {
                        this.set(prop, value);
                        this._loadedProperties.add(property);
                    }
                }
            })
            this.overrideSetFunctionality = false;

            const readHooks = hooks[this.className()].read;
            await quickTrace('After Read Hooks', async () => {
                readHooks.after.map(hook => hook(Object.keys(select), this, false));
            });
        });
    }

    public async _load(options: {
        force?: boolean,
        queryStrategy?: QueryStrategy
    } = {}, properties: ModelAttributes<T>[] | ModelAttributes<T>) {
        if (this.isNew()) {
            throw new UncommitedObjectError('Attempted to load database property of uncommitted object')
        }
        if (this.isDeleted()) {
            throw new DeletedObjectError('Attempted to load deleted object')
        }

        const {force, queryStrategy = 'join'} = options;
        const propertiesToLoad: { [key: string]: boolean } = {};
        let props: string[] = [];
        if (!Array.isArray(properties)) {
            props.push(properties);
        } else {
            props = properties;
        }

        if (!props.includes('id')) {
            props.push('id');
        }

        for (const property of props) {
            const prop = property as ModelAttributes<T>;
            if ((this.isPersisted(prop) || this.isWrapped(prop) || this.isComputed(prop))
                && (!this.isLoaded(prop) || force) && !(property in _onload[this.className()])) {
                propertiesToLoad[property] = true;
            } else if (property in _onload[this.className()]) {
                await _onload[this.className()][property].call(this);
                this._loadedProperties.add(property)
            } else if (this.isCalculated(prop)) {
                for (const depedency of _calculatedAttributes[this.className()][property].dependencies) {
                    propertiesToLoad[depedency] = true;
                }
            }
        }

        if (Object.keys(propertiesToLoad).length === 0) {
            return;
        }

        await this._selectLoad(propertiesToLoad as ReadAttributes<T>, queryStrategy);
    }

    public static isQueryable(model: IModel<any>, property: string): property is ModelQueryable<any> {
        if (!_initialized[model.className()]) {
            Model.initializeProperties(model.className());
        }

        // Is persisted, required, calculated, computed, or wrapped property
        return _persistedProperties[model.className()].has(property) || _requiredProperties[model.className()].has(property) || property in _calculatedAttributes[model.className()] || property in _wrappers[model.className()] || property in _computedAttributes[model.className()];
    }

    public static async getModel<T extends ModelKeys>(model: T): Promise<NonNullable<typeof models[T]>> {
        let _model = models[model];
        if (_model == undefined) {
            switch (model) {
                /* BEGIN GENERATED MODELS: DO NOT MODIFY OR REMOVE THIS COMMENT */
                case 'tenet':
                    await import('~/db/sql/models/Tenet');
                    _model = models[model];
                    break;
                case 'user':
                    await import('~/db/sql/models/User');
                    _model = models[model];
                    break;
                case 'contact':
                    await import('~/db/sql/models/Contact');
                    _model = models[model];
                    break;
                case 'activityStep':
                    await import('~/db/sql/models/ActivityStep');
                    _model = models[model];
                    break;
                case 'activityWaypoint':
                    await import('~/db/sql/models/ActivityWaypoint');
                    _model = models[model];
                    break;
                case 'templateAssignment':
                    await import('~/db/sql/models/TemplateAssignment');
                    _model = models[model];
                    break;
                case 'activityWaypointTemplate':
                    await import('~/db/sql/models/ActivityWaypointTemplate');
                    _model = models[model];
                    break;
                case 'activityTemplateStep':
                    await import('~/db/sql/models/ActivityTemplateStep');
                    _model = models[model];
                    break;
                case 'activityTemplateStepAssignment':
                    await import('~/db/sql/models/ActivityTemplateStepAssignment');
                    _model = models[model];
                    break;
                case 'activityTemplate':
                    await import('~/db/sql/models/ActivityTemplate');
                    _model = models[model];
                    break;
                case 'activity':
                    await import('~/db/sql/models/Activity');
                    _model = models[model];
                    break;
                case 'contactTimelineEvent':
                    await import('~/db/sql/models/ContactTimelineEvent');
                    _model = models[model];
                    break;
                case 'auditEvent':
                    await import('~/db/sql/models/AuditEvent');
                    _model = models[model];
                    break;
                case 'note':
                    await import('~/db/sql/models/Note');
                    _model = models[model];
                    break;
                case 'attachment':
                    await import('~/db/sql/models/Attachment');
                    _model = models[model];
                    break;
                case 'contactEmail':
                    await import('~/db/sql/models/ContactEmail');
                    _model = models[model];
                    break;
                case 'contactPhone':
                    await import('~/db/sql/models/ContactPhone');
                    _model = models[model];
                    break;
                case 'address':
                    await import('~/db/sql/models/Address');
                    _model = models[model];
                    break;
                case 'configOption':
                    await import('~/db/sql/models/ConfigOption');
                    _model = models[model];
                    break;
                case 'importantDate':
                    await import('~/db/sql/models/ImportantDate');
                    _model = models[model];
                    break;
                case 'opportunity':
                    await import('~/db/sql/models/Opportunity');
                    _model = models[model];
                    break;
                case 'opportunityProduct':
                    await import('~/db/sql/models/OpportunityProduct');
                    _model = models[model];
                    break;
                case 'productType':
                    await import('~/db/sql/models/ProductType');
                    _model = models[model];
                    break;
                case 'log':
                    await import('~/db/sql/models/Log');
                    _model = models[model];
                    break;
                case 'token':
                    await import('~/db/sql/models/Token');
                    _model = models[model];
                    break;
                case 'testObject':
                    await import('~/db/sql/models/TestObject');
                    _model = models[model];
                    break;
                case 'wrappedObject':
                    await import('~/db/sql/models/WrappedObject');
                    _model = models[model];
                    break;
                case 'joinedObject1':
                    await import('~/db/sql/models/JoinedObject1');
                    _model = models[model];
                    break;
                case 'joinedObject2':
                    await import('~/db/sql/models/JoinedObject2');
                    _model = models[model];
                    break;
                case 'selfReferencialJoinModel':
                    await import('~/db/sql/models/SelfReferencialJoinModel');
                    _model = models[model];
                    break;
                /* END GENERATED MODELS: DO NOT MODIFY OR REMOVE THIS COMMENT */
                default:
                    throw new ProgrammingError(`Model ${model} is not included in the switch statement. Please re-run generateModels.ts to include it.`);
            }
            _model = models[model];
            if (_model == undefined) {
                throw new ProgrammingError(`Model ${model} is not registered. Please add model.${model} = $ModelClass at the bottom of the file defining the model.`);
            }
        }
        return _model;
    }

    public isLoaded(property: ModelAttributes<T>) {
        if (this.isCalculated(property)) {
            return property in this._cache;
        }
        return this._loadedProperties.has(property);
    }

    public isDirty(property?: ModelAttributes<T>) {
        if (property) {
            return property in this._dirty || this._dirtySubModels.has(property);
        }
        return Object.keys(this._dirty).length > 0 || this._dirtySubModels.size > 0;
    }

    public getOld<K extends ModelAttributes<T>>(property: K): ValueType<K, T> | undefined {
        return this._old[property];
    }

    // Updates THIS object's dirty properties based on the old object's properties
    // If a property in the new object is different from the old object, it will be marked as dirty
    public dirtyFromDiff(old: T) {
        if (!old.guid.equals(this.guid)) {
            throw new Error('The same object was NOT passed in');
        }

        const _dirty: typeof this._dirty = {};
        const _old: typeof this._old = this._old;

        for (const property of this.enumerableProperties()) {
            const prop = property as ModelAttributes<T>;
            if (!old.isLoaded(prop)) {
                throw new ProgrammingError(`Property ${this.className()}.${prop} was not loaded in compared object`);
            }
            const different = this.isDifferent(prop, old.get(prop));
            if (different) {
                _dirty[prop] = this.get(prop);
                _old[prop] = old.get(prop)

                if (different === 'submodel') {
                    this._dirtySubModels.add(prop);
                }
            }
        }

        this._dirty = _dirty;
        this._old = _old;
    }

    // Checks if the object's data has changed compared to the other object
    // public hasChanged(other: T) {
    //     if (!other.guid.equals(this.guid)) {
    //         throw new Error('The same object was NOT passed in');
    //     }
    //
    //     for (const property of this._loadedProperties) {
    //         const prop = property as ModelAttributes<T>;
    //         if (!other.isLoaded(prop)) {
    //             throw new ProgrammingError(`Property ${prop} was not loaded in compared object`);
    //         }
    //
    //         if (this.isPersisted(property as ModelAttributes<T>) || this.isRequired(property as ModelAttributes<T>)) {
    //             if (this.isDifferent(property as ModelAttributes<T>, other.get(property as ModelAttributes<T>))) {
    //                 return true;
    //             }
    //         } /*else if (this.isWrapped(property as ModelAttributes<T>)) {
    //             const old = this._old[prop]
    //             if (old === undefined) {
    //                 throw new ProgrammingError(`Wrapped property ${this.className()}.${prop} was not read in model object, so an old value cannot be determined`);
    //             }
    //
    //             if (Model.isModelArray(old)) {
    //                 if (old.length !== other.get(prop).length) {
    //                     return true;
    //                 }
    //             }
    //         }*/
    //         // If it becomes necessary to deeply compare the objects, this is where it would go
    //     }
    // }

    /**
     * Calculates whether the value is different from the current value
     * Returns false if the value is the same, or if the value is a different submodel (i.e. different id, which is handled by the id property unless the model is new)
     * Returns 'submodel' if the value is a different submodel (which sets the `_dirtySubModels` flag)
     */
    public isDifferent<K extends ModelAttributes<T>>(property: K, value: ValueType<K, T>) {
        const thisVal = this.get(property);
        if (thisVal === value) return false;
        else if (thisVal == null && value == null) return false
        else if (typeof value === 'object' && 'equals' in value! && typeof value['equals'] === 'function' && value['equals'](thisVal as any)) return false;
        else if (value instanceof Date && thisVal instanceof Date && value.getTime() === thisVal.getTime()) return false;
        else if (Model.isInstance(value)) {
            const _value = value as Model<any>;
            if (!_value.guid.equals((thisVal as Model<any>).guid)) {
                return _value.isNew() ? 'submodel' : false;
            } else {
                _value.dirtyFromDiff(thisVal);
                return _value.isDirty() ? 'submodel' : false;
            }
        } else if (Model.isModelArray(value)) {
            if (!Array.isArray(thisVal) && thisVal != null) {
                this.logger.fatal(`Model.isDifferent: Model array is not an array for property ${this.className()}.${property}`);
            }
            const _set = new ModelSet(value as Model<any>[]);
            const _thisSet = new ModelSet(thisVal as Model<any>[]);
            return _set.isDifferent(_thisSet) ? 'submodel' : false;
        } else if (ModelSet.isModelSet(value)) {
            const _set = value as ModelSet<Model<any>>;
            const _thisSet = thisVal as ModelSet<Model<any>>;
            return _set.isDifferent(_thisSet) ? 'submodel' : false;
        }

        return true;
    }

    public isDeleted() {
        return this._deleted;
    }

    public isNew() {
        return this._new;
    }

    get dirty() {
        return this.isDirty();
    }

    /** Persisted in the database but not required */
    public isPersisted(property: ModelAttributes<T>) {
        return _persistedProperties[this.className()].has(property);
    }

    /** Persisted in the database AND required */
    public isRequired(property: ModelAttributes<T>) {
        return _requiredProperties[this.className()].has(property);
    }

    /** Server-side calculated field, not persisted */
    public isCalculated(property: ModelAttributes<T>) {
        return property in _calculatedAttributes[this.className()];
    }

    /** Server-side calculated field, persisted in the database */
    public isComputed(property: ModelAttributes<T>) {
        return property in _computedAttributes[this.className()];
    }

    /** Relationship/Foreign key object(s) field */
    public isWrapped(property: ModelAttributes<T>) {
        return property in _wrappers[this.className()];
    }

    public isEncrypted(property: ModelAttributes<T>) {
        return property in _encryptedProperties[this.className()] || property in _uniqueEncryptedProperties[this.className()];
    }

    public isUniqueEncrypted(property: ModelAttributes<T>) {
        return property in _uniqueEncryptedProperties[this.className()];
    }

    /** GraphDB relation field */
    // public isRelation(property: ModelAttributes<T>) {
    //     return property in _relationships[this.className()];
    // }

    public isJoinedProperty(property: ModelAttributes<T>) {
        return property in _joinedFields[this.className()];
    }

    public isJointable(property: ModelAttributes<T>) {
        return property in _jointables[this.className()];
    }

    public enumerableProperties() {
        // Intersection of loaded properties and persisted/required properties
        return Array.from(this._loadedProperties).filter(prop => this.isPersisted(prop as ModelAttributes<T>) || this.isRequired(prop as ModelAttributes<T>)
            || this.isJoinedProperty(prop as ModelAttributes<T>) || this.isWrapped(prop as ModelAttributes<T>) || this.isJointable(prop as ModelAttributes<T>));
    }

    public encrypt(property: ModelAttributes<T>) {
        if (!this.isEncrypted(property)) {
            throw new Error(`Attempted to encrypt non-encrypted property ${property}`)
        }
        const value = this.get(property) as string | number | boolean | Date | number[] | string[];
        if (value == undefined) {
            return value;
        } else if (!Model.isInstance(value) && !Model.isModelArray(value) && !Buffer.isBuffer(value)) {
            if (this.isUniqueEncrypted(property)) {
                return encryptData(value, this.guid.toString('hex'))
            }
            return encryptData(value);
        }
        throw new Error(`Attempted to encrypt invalid property ${property} of type ${value.constructor.name}`)
    }

    private static async executeDBCalls(calls: PrismaPromise<any>[]) {
        if (currentTsx != null) {
            return Promise.all(calls);
        }
        return dbClient.$transaction(calls);
    }

    public decryptData(property: ModelAttributes<T>, value: any) {
        if (!this.isEncrypted(property)) {
            throw new Error(`Attempted to decrypt non-encrypted property ${property}`)
        }
        if (value == undefined) {
            return value;
        }
        if (this.isUniqueEncrypted(property)) {
            const idHex = this.guid.toString('hex');
            return decryptData(value, _uniqueEncryptedProperties[this.className()][property], idHex);
        }
        return decryptData(value, _encryptedProperties[this.className()][property]);
    }

    /**
     * Commits the object to the database, creating a new record if it doesn't exist.
     * @param ignoreTransaction If true, the object will be committed without a transaction.
     * This is important for things like logging, which must be committed outside of a transaction in case of rollbacks.
     */
    public async commit(ignoreTransaction?: boolean) {
        await quickTrace(`${this.className()}#commit`, async (span) => {
            if (this.isDeleted()) {
                span.setAttribute('wrapper.failureFlag', 'deletedObject');
                throw new DeletedObjectError('Attempted to commit deleted object')
            }

            const _prevWarnOnLoad = this.warnOnRemoteOperation;

            this.warnOnRemoteOperation = process.env.NODE_ENV === 'development';
            // Validation can have a lot of load operations so we want to minimize them to read operations
            const validate = await quickTrace(`${this.className()}#validate`, async () => {
                return await this.validate();
            });
            this.warnOnRemoteOperation = _prevWarnOnLoad;

            // Validate
            if (!validate.result) {
                span.setAttribute('wrapper.failureFlag', 'validationError');
                throw new ValidationError(validate.msg, ClassNameMapping[this.className()])
            }

            span.setAttribute('wrapper.tsx', currentTsx != null);
            let client = Model.getPrisma()
            if (ignoreTransaction) {
                span.setAttribute('wrapper.tsx.ignored', true)
                client = dbClient;
            }
            if (this.isNew()) {
                await this.create(ignoreTransaction);
            } else {
                const toRunUpdateHooksOn: Model<any>[] = [this];
                const toRunCreateHooksOn: Model<any>[] = [];
                const toRunDeleteHooksOn: Model<any>[] = [];

                function processDirty(model: Model<any>, reverse?: string[]) {
                    model.prepareDirty()
                    const updateData: Record<string, any> = model._dirty
                    for (const property of model._loadedProperties) {
                        if (reverse?.includes(property)) continue;
                        const prop = property as ModelAttributes<T>;

                        if (model.get(prop) === undefined) {
                            delete updateData[prop];
                            continue;
                        }

                        if (model.isWrapped(prop)) {
                            if (model.get(prop) === null) {
                                delete updateData[prop];
                                continue;
                            }
                            const val = model.get(prop);
                            const wrapper = _wrappers[model.className()][prop];

                            if (Model.isModelArray(val) || (Array.isArray(val) && (val as Array<any>).length === 0)) {
                                if (val.length === 0 && model.getOld(prop) === undefined) {
                                    delete updateData[prop];
                                    model.logger.warn(`Skipping checking ${model.className()}.${prop} for updates since it is empty and the old value is not loaded`)
                                    continue;
                                }
                                let doUpdate = true;
                                if (!(prop in model._old) && !model.isNew()) {
                                    doUpdate = false;
                                    throw new ProgrammingError(`${model.className()}.${prop} was not loaded on read before updating. Cannot properly update this property if this is not done.`)
                                }
                                const old = new ModelSet<Model<any>>(model._old[prop] ?? [] as Model<any>[])
                                const newVals = new ModelSet<Model<any>>(val as Model<any>[]);

                                const _create: any[] = []
                                const _connect: { id: Buffer }[] = []
                                const _removed: { id: Buffer }[] = []
                                const _updated: any[] = []

                                for (const _v of old.addedTo(newVals)) {
                                    if (_v.isDeleted()) continue; // Deleted through the delete method, so we ignore it
                                    if (_v.isNew()) {
                                        const _dirty = _v._dirty;

                                        // In case validation relies on the id/object, we need to set it
                                        if (!_v.isLoaded(wrapper.idProperty) || _v.get(wrapper.idProperty) == null) {
                                            _v.overrideSetFunctionality = 'preventMutationDetection';
                                            _v.set(wrapper.idProperty, model.guid)
                                            _v.overrideSetFunctionality = false;
                                        }

                                        if (!_v.isLoaded(wrapper.reverseProperty) || _v.get(wrapper.reverseProperty) == null) {
                                            _v.overrideSetFunctionality = 'preventMutationDetection';
                                            _v.set(wrapper.reverseProperty, model)
                                            _v.overrideSetFunctionality = false;
                                        }

                                        delete _dirty[wrapper.reverseProperty]
                                        delete _dirty[wrapper.idProperty]

                                        _create.push(processDirty(_v, [wrapper.reverseProperty, wrapper.idProperty]));
                                        _dirty.id = _v.guid;
                                        toRunCreateHooksOn.push(_v)
                                    } else {
                                        if (_v.dirty) {
                                            if (!doUpdate) {
                                                throw new ProgrammingError(`Cannot update a dirty sub-model on ${model.className()}.${prop} without first knowing the old values. Please read them first.`)
                                            }
                                            throw new ProgrammingError(`Cannot connect a dirty sub-model on ${model.className()}.${prop}. Please commit it first.`)
                                        }
                                        // If not in, then we will add
                                        _connect.push({
                                            id: _v.guid
                                        })
                                    }
                                }

                                for (const _v of old.removed(newVals)) {
                                    if (_v.isDeleted()) continue; // Deleted through the delete method, so we ignore it
                                    toRunDeleteHooksOn.push(_v)
                                    if (SoftDeleteModels.includes(_v.className())) {
                                        _updated.push({
                                            where: {id: _v.guid},
                                            data: {deleted: true, deletedAt: new Date()}
                                        })
                                    } else {
                                        _removed.push({
                                            id: _v.guid
                                        })
                                    }
                                }

                                for (const _v of old.intersection(newVals)) {
                                    if (_v.isDeleted()) continue; // Deleted through the delete method, so we ignore it
                                    const vOld = old.get(_v.guid);

                                    _v.dirtyFromDiff(vOld)
                                    if (!_v.dirty) {
                                        continue;
                                    }

                                    const _dirty = _v._dirty;

                                    delete _dirty[wrapper.reverseProperty]
                                    if (wrapper.isRelationRoot) {
                                        delete _dirty[wrapper.idProperty]
                                    }

                                    _updated.push({
                                        where: {id: _v.guid},
                                        data: processDirty(_v, [wrapper.reverseProperty, wrapper.idProperty])
                                    })
                                    toRunUpdateHooksOn.push(_v)
                                }

                                const connection: any = {}

                                if (_create.length > 0) {
                                    connection.create = _create;
                                }
                                if (_connect.length > 0) {
                                    connection.connect = _connect;
                                }
                                if (_removed.length > 0) {
                                    connection.delete = _removed
                                }
                                if (_updated.length > 0) {
                                    connection.update = _updated
                                }

                                if (val.length > 0 || _removed.length > 0) {
                                    updateData[prop] = connection
                                }
                            }
                            else if (Model.isInstance(val)) {
                                const _v = val as Model<any>
                                if (_v.isDeleted()) {
                                    delete updateData[prop];
                                    continue;
                                } // Deleted through the delete method, so we ignore it
                                if (_v.isNew()) {
                                    let _dirty = _v._dirty;

                                    // In case validation relies on the id, we need to set it
                                    if (!_v.isLoaded(wrapper.idProperty) || _v.get(wrapper.idProperty) == null) {
                                        _v.overrideSetFunctionality = 'preventMutationDetection';
                                        _v.set(wrapper.idProperty, model.guid)
                                        _v.overrideSetFunctionality = false;
                                    }

                                    if (!_v.isLoaded(wrapper.reverseProperty) || _v.get(wrapper.reverseProperty) == null) {
                                        _v.overrideSetFunctionality = 'preventMutationDetection';
                                        _v.set(wrapper.reverseProperty, model)
                                        _v.overrideSetFunctionality = false;
                                    }

                                    delete _dirty[wrapper.reverseProperty]
                                    delete _dirty[wrapper.idProperty]

                                    delete updateData[wrapper.idProperty]
                                    _dirty = processDirty(_v, [wrapper.reverseProperty, wrapper.idProperty])
                                    _dirty.id = _v.guid;
                                    updateData[prop] = {
                                        create: _dirty
                                    }
                                    toRunCreateHooksOn.push(_v)
                                }
                                else {
                                    const vOld = model._old[prop];
                                    if (!vOld.guid.equals(_v.guid)) {
                                        if (_v.isDirty()) {
                                            model.logger.warn(`Cannot simultaneously change ${model.className()}.${prop} to another model and update that new model.`)
                                        } else if (!_v.guid.equals(model.get(wrapper.idProperty))) {
                                            model.logger.fatal(`Somehow ${model.className()}.${wrapper.idProperty} does not match ${_v.className()}.guid (${model.get(wrapper.idProperty).toString('hex')} != ${_v.guid.toString('hex')})`)
                                            delete updateData[prop]
                                            delete updateData[wrapper.idProperty]
                                            continue
                                        }
                                        updateData[prop] = {
                                            connect: {
                                                id: _v.guid
                                            }
                                        }
                                        continue // Let them update the data
                                    }
                                    _v.dirtyFromDiff(vOld)
                                    if (_v.dirty && !model.isDirty(wrapper.idProperty)) {
                                        // Update model
                                        const _dirty = _v._dirty;

                                        delete _dirty[wrapper.reverseProperty]
                                        if (wrapper.isRelationRoot) {
                                            delete _dirty[wrapper.idProperty]
                                        }

                                        delete updateData[wrapper.idProperty]
                                        updateData[prop] = {
                                            update: {
                                                where: {id: _v.guid},
                                                data: processDirty(_v, [wrapper.reverseProperty, wrapper.idProperty])
                                            }
                                        }
                                        toRunUpdateHooksOn.push(_v)
                                    } else {
                                        delete updateData[prop]
                                        delete updateData[wrapper.idProperty]
                                    }
                                }
                            }
                        } else if (model.isJointable(prop)) {
                            if (model.get(prop) === null) {
                                delete updateData[prop];
                                continue;
                            } else if (model.get(prop).length === 0) {
                                delete updateData[prop];
                                continue;
                            }
                            const jtDef = _jointables[model.className()][prop];
                            const val = model.get(prop) as Model<any>[];
                            if (val != null && val.length > 0) {
                                if (!(prop in model._old) && !model.isNew()) {
                                    throw new ProgrammingError(`${model.className()}.${prop} was not loaded on read before updating. Cannot properly update this property if this is not done.` +
                                        `If you are simply adding a new join, specify ${prop} = [] first. Otherwise, please load the property first.`)
                                }

                                if (jtDef.intermediateId === true) {
                                    function getId(m: Model<any>, allowNew = false) {
                                        const joinField = _reverseJoinedFields[m.className()][model.className()][prop].id;
                                        if (m.isLoaded(joinField) && m.get(joinField) != null) {
                                            return (m.get(joinField) as Buffer).toString('hex');
                                        } else if (!allowNew) {
                                            throw new Error(`Intermediate model id not loaded for ${m.className()}.${prop}. This should never happen!`);
                                        } else {
                                            m.overrideSetFunctionality = 'preventMutationDetection';
                                            m.set(joinField, generateGuid());
                                            m.overrideSetFunctionality = false;
                                            if (m._referencedModel) {
                                                const refModel = m._referencedModel;
                                                refModel.overrideSetFunctionality = 'preventMutationDetection';
                                                refModel.set(joinField, m.get(joinField));
                                                refModel.overrideSetFunctionality = false;
                                                refModel._loadedProperties.add(joinField);
                                            }
                                            m._loadedProperties.add(joinField);
                                            return (m.get(joinField) as Buffer).toString('hex');
                                        }
                                    }

                                    const oldIds = new Set<string>(model._old[prop]?.map(getId) ?? []);
                                    const assignedIds = val.map(m => getId(m, true))
                                    const newIds = new Set<string>(assignedIds);

                                    const oldModels: Record<string, Model<any>> = {};
                                    const newModels: Record<string, Model<any>> = {};

                                    for (const m of model._old[prop] ?? []) {
                                        oldModels[getId(m)] = m;
                                    }
                                    for (let idx = 0; idx < assignedIds.length; idx++) {
                                        newModels[assignedIds[idx]] = val[idx];
                                    }

                                    const _created = newIds.difference(oldIds); // Gets the values in newIds but not in oldIds
                                    const _removed = oldIds.difference(newIds); // Gets the values in oldIds but not in newIds
                                    const _updated = newIds.intersection(oldIds); // Gets the values in both oldIds and newIds, which may or may not have changed

                                    const queryCreated = []
                                    const queryRemoved = []
                                    const queryUpdated = []

                                    for (const _id of _removed) {
                                        queryRemoved.push({
                                            id: _id
                                        })
                                    }

                                    for (const _id of _created) {
                                        const _v = newModels[_id]
                                        if (_v.isDeleted()) continue; // Deleted through the delete method, so we ignore it
                                        const _join: any = {
                                            id: _id
                                        }
                                        if (_v.isNew()) {
                                            let _dirty = _v._dirty;
                                            const reverse = _jointablesReverse[_v.className()][prop];

                                            if (!_v.isLoaded(reverse) || _v.get(reverse) == null || _v.get(reverse).length === 0) {
                                                _v.overrideSetFunctionality = 'preventMutationDetection';
                                                _v.addReverse(reverse, [model])
                                                _v.overrideSetFunctionality = false;
                                            }

                                            delete _dirty[reverse];

                                            _dirty = processDirty(_v, [reverse]);
                                            _dirty.id = _v.guid;
                                            _join[jtDef.joinField] = {
                                                create: _dirty
                                            }
                                        } else {
                                            _join[jtDef.intermediateOtherIdProperty] = _v.guid
                                        }

                                        if (_reverseJoinedFields[_v.className()][model.className()] && prop in _reverseJoinedFields[_v.className()][model.className()]) {
                                            for (const joinedField in _reverseJoinedFields[_v.className()][model.className()][prop]) {
                                                const joinField = _reverseJoinedFields[_v.className()][model.className()][prop][joinedField];
                                                const definition = _joinedFields[_v.className()][joinField];

                                                if (_v.isLoaded(joinField)) {
                                                    if (_v.isNew()) {
                                                        delete _join[jtDef.joinField].create[joinField]
                                                    }
                                                    _join[definition.targetedProperty] = _v.get(joinField);
                                                }
                                            }
                                        }

                                        toRunCreateHooksOn.push(_v)
                                        queryCreated.push(_join)
                                    }

                                    for (const _id of _updated) {
                                        const _v = newModels[_id];
                                        if (_v.isDeleted()) continue; // skip deleted
                                        const _old = oldModels[_id];
                                        const _join: any = {};

                                        _v.dirtyFromDiff(_old)

                                        if (_v.dirty) {
                                            let _dirty = _v._dirty;
                                            const reverse = _jointablesReverse[_v.className()][prop];

                                            if (!_v.isLoaded(reverse) || _v.get(reverse) == null || _v.get(reverse).length === 0) {
                                                _v.overrideSetFunctionality = 'preventMutationDetection';
                                                _v.addReverse(reverse, [model])
                                                _v.overrideSetFunctionality = false;
                                            }

                                            delete _dirty[reverse];

                                            _dirty = processDirty(_v, [reverse]);
                                            _dirty.id = _v.guid;
                                            _join[jtDef.joinField] = {
                                                update: _dirty
                                            }
                                        }

                                        if (_reverseJoinedFields[_v.className()][model.className()] && prop in _reverseJoinedFields[_v.className()][model.className()]) {
                                            for (const joinedField in _reverseJoinedFields[_v.className()][model.className()][prop]) {
                                                const joinField = _reverseJoinedFields[_v.className()][model.className()][prop][joinedField];
                                                const definition = _joinedFields[_v.className()][joinField];

                                                if (_v.isLoaded(joinField) && _v.isDirty(joinField)) {
                                                    if (_v.dirty) {
                                                        delete _join[jtDef.joinField].update[joinField]
                                                    }
                                                    _join[definition.targetedProperty] = _v.get(joinField);
                                                } else if (definition.targetedProperty === 'id') {
                                                    if (!_v.isLoaded(joinField)) {
                                                        throw new ProgrammingError(`Intermediate model id not loaded for ${model.className()}.${prop}. This should never happen!`);
                                                    }
                                                    _join.id = _v.get(joinField);
                                                }
                                            }
                                        }

                                        if (_join.id == null) {
                                            throw new ProgrammingError('Somehow the join id was not loaded')
                                        }

                                        toRunUpdateHooksOn.push(_v)
                                        queryUpdated.push({
                                            where: {
                                                id: _join.id
                                            },
                                            data: _join
                                        });

                                    }

                                    updateData[prop] = {} as { create?: any, delete?: any, update?: any }
                                    if (queryCreated.length === 0 && queryRemoved.length === 0 && queryUpdated.length === 0) {
                                        delete updateData[prop]
                                    } else {
                                        if (queryCreated.length > 0) {
                                            updateData[prop].create = queryCreated;
                                        }
                                        if (queryRemoved.length > 0) {
                                            updateData[prop].delete = queryRemoved;
                                        }
                                        if (queryUpdated.length > 0) {
                                            updateData[prop].update = queryUpdated;
                                        }
                                    }
                                } else {
                                    const old = new ModelSet(model._old[prop] ?? []);
                                    const newVals = new ModelSet(val);

                                    const _created: any[] = []
                                    const _removed: any[] = []
                                    const _updated: any[] = []

                                    // I don't want to support updating yet, doesn't seem it will be useful quite just yet.
                                    for (const _v of old.removed(newVals)) {
                                        if (_v.isDeleted()) continue; // Deleted through the delete method, so we ignore it
                                        _removed.push({
                                            [jtDef.intermediateId]: {
                                                [jtDef.intermediateOtherIdProperty]: _v.guid,
                                                [jtDef.intermediateThisIdProperty]: model.guid
                                            }
                                        })
                                    }

                                    for (const __v of old.addedTo(newVals)) {
                                        const _v = __v as Model<any>
                                        if (_v.isDeleted()) continue; // Deleted through the delete method, so we ignore it
                                        const _join: any = {}
                                        if (_v.isNew()) {
                                            let _dirty = _v._dirty;
                                            const reverse = _jointablesReverse[_v.className()][prop];

                                            if (!_v.isLoaded(reverse) || _v.get(reverse) == null || _v.get(reverse).length === 0) {
                                                _v.overrideSetFunctionality = 'preventMutationDetection';
                                                _v.addReverse(reverse, [model])
                                                _v.overrideSetFunctionality = false;
                                            }

                                            delete _dirty[reverse];

                                            _dirty = processDirty(_v, [reverse]);
                                            _dirty.id = _v.guid;
                                            _join[jtDef.joinField] = {
                                                create: _dirty
                                            }
                                        } else {
                                            _join[jtDef.intermediateOtherIdProperty] = _v.guid
                                        }

                                        if (_reverseJoinedFields[_v.className()][model.className()] && prop in _reverseJoinedFields[_v.className()][model.className()]) {
                                            for (const joinedField in _reverseJoinedFields[_v.className()][model.className()][prop]) {
                                                const joinField = _reverseJoinedFields[_v.className()][model.className()][prop][joinedField];
                                                const definition = _joinedFields[_v.className()][joinField];

                                                if (_v.isLoaded(joinField)) {
                                                    if (_v.isNew()) {
                                                        delete _join[jtDef.joinField].create[joinField]
                                                    }
                                                    _join[definition.targetedProperty] = _v.get(joinField);
                                                }
                                            }
                                        }

                                        _created.push(_join)
                                        toRunCreateHooksOn.push(_v)
                                    }

                                    for (const __v of old.intersection(newVals)) {
                                        const _v = __v as Model<any>
                                        if (_v.isDeleted()) continue; // Deleted through the delete method, so we ignore it
                                        const _join: any = {}
                                        const _old = old.get(_v.guid)

                                        _v.dirtyFromDiff(_old)

                                        if (_v.dirty) {
                                            let _dirty = _v._dirty;
                                            const reverse = _jointablesReverse[_v.className()][prop];

                                            if (!_v.isLoaded(reverse) || _v.get(reverse) == null || _v.get(reverse).length === 0) {
                                                _v.overrideSetFunctionality = 'preventMutationDetection';
                                                _v.addReverse(reverse, [model])
                                                _v.overrideSetFunctionality = false;
                                            }

                                            delete _dirty[reverse];

                                            _dirty = processDirty(_v, [reverse]);
                                            _dirty.id = _v.guid;
                                            _join[jtDef.joinField] = {
                                                update: _dirty
                                            }
                                        }

                                        if (_reverseJoinedFields[_v.className()][model.className()] && prop in _reverseJoinedFields[_v.className()][model.className()]) {
                                            for (const joinedField in _reverseJoinedFields[_v.className()][model.className()][prop]) {
                                                const joinField = _reverseJoinedFields[_v.className()][model.className()][prop][joinedField];
                                                const definition = _joinedFields[_v.className()][joinField];

                                                if (_v.isLoaded(joinField) && _v.isDirty(joinField)) {
                                                    if (_v.dirty) {
                                                        delete _join[jtDef.joinField].update[joinField]
                                                    }
                                                    _join[definition.targetedProperty] = _v.get(joinField);
                                                }
                                            }
                                        }

                                        toRunUpdateHooksOn.push(_v)
                                        _updated.push({
                                            where: {
                                                [jtDef.intermediateId]: {
                                                    [jtDef.intermediateOtherIdProperty]: _v.guid,
                                                    [jtDef.intermediateThisIdProperty]: model.guid
                                                }
                                            },
                                            data: _join
                                        });
                                    }

                                    updateData[prop] = {} as { create?: any, delete?: any, update?: any }
                                    if (_created.length === 0 && _removed.length === 0 && _updated.length === 0) {
                                        delete updateData[prop]
                                    } else {
                                        if (_created.length > 0) {
                                            updateData[prop].create = _created;
                                        }
                                        if (_removed.length > 0) {
                                            updateData[prop].delete = _removed;
                                        }
                                        if (_updated.length > 0) {
                                            updateData[prop].update = _updated;
                                        }
                                    }
                                }
                            }
                        } else if (model.isEncrypted(prop)) {
                            updateData._dirty[prop] = model.encrypt(prop);
                        } else if (prop in _idsToWrapped[model.className()]) {
                            delete updateData[prop]

                            const wrapper = _idsToWrapped[model.className()][prop];
                            if (!model.isLoaded(wrapper)) {
                                updateData[wrapper] = {
                                    connect: {
                                        id: model.get(prop)
                                    }
                                }
                            }
                        }
                    }

                    return updateData
                }

                const updateData = processDirty(this);

                // Run update hooks
                let highestSeverity: LogLevel | undefined = undefined;

                let updateFailed = false;
                const failureDetails: string[] = [];
                span.setAttribute('wrapper.update.numDeletions', toRunDeleteHooksOn.length);
                span.setAttribute('wrapper.update.numUpdates', toRunUpdateHooksOn.length);
                span.setAttribute('wrapper.update.numCreates', toRunCreateHooksOn.length);

                await quickTrace(`Before update hooks`, async () => {
                    let prismaPromises: Array<PrismaPromise<any>> = []
                    // let graphQueries: Array<GraphQuery> = [];
                    const promises: Array<Promise<any>> = [];

                    for (const model of toRunUpdateHooksOn) {
                        const validationResult = await model.validate();
                        if (!validationResult.result) {
                            span.setAttribute('wrapper.failureFlag', 'validationError');
                            throw new ValidationError(validationResult.msg, ClassNameMapping[model.className()])
                        }

                        const updateHooks = hooks[model.className()].update
                        for (const property in model._dirty) {
                            const prop = property as ModelAttributes<T>;
                            const old = model._old[prop];

                            if (updateHooks.before.length > 0) {
                                promises.push(...updateHooks.before.map(async hook => {
                                    await quickTrace(`${model.className()}.${property}#before`, async (_span) => {
                                        const result = await hook.call(model, property, model._dirty[prop], old, false);
                                        if (isBatchResult(result)) {
                                            const res = result.result;
                                            if (isPromise(res)) {
                                                prismaPromises.push(res)
                                            } else {
                                                prismaPromises = prismaPromises.concat(res)
                                            }
                                            /*
                                            else {
                                                if (Array.isArray(res)) {
                                                    if (isPrismaPromiseArray(res)) {
                                                        prismaPromises = prismaPromises.concat(res);
                                                    } else {
                                                        graphQueries = graphQueries.concat(res);
                                                    }
                                                } else {
                                                    graphQueries.push(res);
                                                }
                                            }
                                             */
                                        } else if (!result || Object.values(LogLevel).includes(result as LogLevel)) {
                                            this.logger.error(`Update hook ${hook.name} for ${model.className()}.${property}#before returned false, cancelling commit`);
                                            _span.setAttribute('wrapper.failure', true);
                                            failureDetails.push(`Update hook ${hook.name} for ${model.className()}.${property}#before returned false`);
                                            model.overrideSetFunctionality = true;
                                            model.set(property as ModelAttributes<T>, old);
                                            model.overrideSetFunctionality = false;
                                            updateFailed = true;

                                            if (Object.values(LogLevel).includes(result as LogLevel)) {
                                                if (highestSeverity === undefined || (result as LogLevel) > highestSeverity) {
                                                    highestSeverity = result as LogLevel;
                                                }
                                            }
                                        }
                                    })
                                }))
                            }
                        }
                    }

                    for (const model of toRunCreateHooksOn) {
                        const validationResult = await model.validate();
                        if (!validationResult.result) {
                            span.setAttribute('wrapper.failureFlag', 'validationError');
                            throw new ValidationError(validationResult.msg, ClassNameMapping[model.className()])
                        }

                        const createHooks = hooks[model.className()].create;
                        for (const hook of createHooks.before) {
                            promises.push(quickTrace(`${model.className()}.create#before`, async (_span) => {
                                _span.setAttribute('wrapper.hook', hook.name)
                                _span.setAttribute('wrapper.hook.model', model.className())
                                const result = await hook.call(model, false);
                                if (isBatchResult(result)) {
                                    const res = result.result;
                                    if (isPromise(res)) {
                                        prismaPromises.push(res)
                                    } else {
                                        prismaPromises.concat(res)
                                    }
                                    /*
                                    else {
                                        if (Array.isArray(res)) {
                                            if (isPrismaPromiseArray(res)) {
                                                prismaPromises = prismaPromises.concat(res);
                                            } else {
                                                graphQueries = graphQueries.concat(res);
                                            }
                                        } else {
                                            graphQueries.push(res);
                                        }
                                    }
                                     */
                                }
                            }))
                        }
                    }

                    for (const model of toRunDeleteHooksOn) {
                        const deleteHooks = hooks[model.className()]['delete'];
                        for (const hook of deleteHooks.before) {
                            promises.push(quickTrace(`${this.className()}.delete#before`, async (_span) => {
                                _span.setAttribute('wrapper.hook', hook.name)
                                _span.setAttribute('wrapper.hook.model', model.className())
                                const result = await hook.call(model);
                                if (!result) {
                                    this.logger.error(`Delete hook ${hook.name} for ${model.className()}#before returned false, cancelling commit`);
                                    _span.setAttribute('wrapper.failure', true);
                                    failureDetails.push(`Delete hook ${hook.name} for ${model.className()}#before returned false, cancelling commit`);
                                    updateFailed = true;
                                }
                            }))
                        }
                    }

                    await Promise.all(promises)

                    // if (!updateFailed && (prismaPromises.length > 0 || graphQueries.length > 0)) {
                    if (!updateFailed && prismaPromises.length > 0) {
                        // await quickTrace(`${this.className()}.commit#before/batchedCalls`, async () => {
                        // await Promise.all([
                        //     Model.executeDBCalls(prismaPromises)
                        // ongdb.batch(graphQueries)
                        // ]);
                        // })

                        await quickTrace(`${this.className()}.commit#before/batchedCalls`, async () => Model.executeDBCalls(prismaPromises));
                    }
                })

                if (updateFailed) {
                    const Log = (await import('~/db/sql/models/Log')).Log;
                    await Log.log(`Update failed for ${this.className()}`, highestSeverity || LogLevel.WARNING, undefined, undefined, `If this message is logged twice, it is most likely a UI/client specific error.\n\nSpecific Failures:\n${failureDetails.join('\n')}.`)
                    span.setAttribute('wrapper.failureFlag', 'beforeUpdateHookFailure');
                    throw new NonGenericServerError(this.className(), `Update failed for ${this.className()}`, highestSeverity || LogLevel.WARNING, undefined)
                }

                // await Promise.all([
                // this.commitGraph().catch(console.error),
                // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                await client[this.className()].update({
                    where: {
                        id: this._guid
                    },
                    data: updateData
                }).catch((e: unknown) => {
                    if (e instanceof PrismaClientKnownRequestError && e.message.includes('Unique constraint failed on the fields')) {
                        throw new UniqueConstraintViolationError(this.className(), e.meta!.target as string[], e)
                    } else {
                        throw new NonGenericServerError(this.className(), 'Prisma update failed', LogLevel.HIGH, e);
                    }
                })
                // ])

                await quickTrace(`After update hooks`, async () => {
                    let prismaPromises: Array<PrismaPromise<any>> = []
                    // let graphQueries: Array<GraphQuery> = [];
                    const promises: Array<Promise<any>> = [];

                    for (const model of toRunUpdateHooksOn) {
                        const updateHooks = hooks[model.className()].update
                        for (const property in model._dirty) {
                            const prop = property as ModelAttributes<T>;
                            const old = model._old[prop];

                            if (updateHooks.after.length > 0) {
                                promises.push(...updateHooks.after.map(async hook => {
                                    await quickTrace(`${model.className()}.${property}#before`, async () => {
                                        const result = await hook.call(model, property, model._dirty[prop], old, false);
                                        if (isBatchResult(result)) {
                                            const res = result.result;
                                            if (isPromise(res)) {
                                                prismaPromises.push(res)
                                            } else {
                                                prismaPromises = prismaPromises.concat(res);
                                            }
                                            /*
                                            else {
                                                if (Array.isArray(res)) {
                                                    if (isPrismaPromiseArray(res)) {
                                                        prismaPromises = prismaPromises.concat(res);
                                                    } else {
                                                        graphQueries = graphQueries.concat(res);
                                                    }
                                                } else {
                                                    graphQueries.push(res);
                                                }
                                            }
                                             */
                                        }
                                    })
                                }))
                            }

                            const val = model.get(prop);
                            this.setOld(prop, val);
                        }

                        model._dirty = {}
                        model._dirtySubModels = new Set();
                        model.onMutate('commit')
                    }

                    for (const model of toRunCreateHooksOn) {
                        const createHooks = hooks[model.className()].create;
                        for (const hook of createHooks.after) {
                            promises.push(quickTrace(`${model.className()}.create#before`, async (_span) => {
                                _span.setAttribute('wrapper.hook', hook.name)
                                _span.setAttribute('wrapper.hook.model', model.className())
                                const result = await hook.call(model, false);
                                if (isBatchResult(result)) {
                                    const res = result.result;
                                    if (isPromise(res)) {
                                        prismaPromises.push(res)
                                    } else {
                                        prismaPromises.concat(res)
                                    }
                                    /*
                                    else {
                                        if (Array.isArray(res)) {
                                            if (isPrismaPromiseArray(res)) {
                                                prismaPromises = prismaPromises.concat(res);
                                            } else {
                                                graphQueries = graphQueries.concat(res);
                                            }
                                        } else {
                                            graphQueries.push(res);
                                        }
                                    }
                                     */
                                }
                            }))
                        }

                        for (const prop of model._loadedProperties) {
                            const value = model.get(prop);
                            if (model.isPersisted(prop) || model.isRequired(prop) || model.isWrapped(prop) || model.isJointable(prop)) {
                                model.setOld(prop, value);
                            }
                        }

                        model._dirty = {};
                        model._dirtySubModels = new Set();
                        model._new = false;
                        model.onMutate('commit')
                    }

                    for (const model of toRunDeleteHooksOn) {
                        const deleteHooks = hooks[model.className()]['delete'];
                        for (const hook of deleteHooks.after) {
                            promises.push(quickTrace(`${this.className()}.delete#after`, async (_span) => {
                                _span.setAttribute('wrapper.hook', hook.name)
                                _span.setAttribute('wrapper.hook.model', model.className())
                                const result = await hook.call(model);

                                if (isBatchResult(result)) {
                                    const res = result.result;
                                    if (isPromise(res)) {
                                        prismaPromises.push(res)
                                    } else {
                                        prismaPromises.concat(res)
                                    }
                                    /*
                                    else {
                                        if (Array.isArray(res)) {
                                            if (isPrismaPromiseArray(res)) {
                                                prismaPromises = prismaPromises.concat(res);
                                            } else {
                                                graphQueries = graphQueries.concat(res);
                                            }
                                        } else {
                                            graphQueries.push(res);
                                        }
                                    }
                                     */
                                }
                            }))
                        }

                        model._deleted = true;
                        if (model._referencedModel) {
                            model._referencedModel._deleted = true
                        }


                        if (SoftDeleteModels.includes(model.className())) {
                            model.set('deleted', true)
                            if (model._referencedModel) {
                                model._referencedModel.set('deleted', true)
                            }
                        }
                    }

                    await Promise.all(promises)

                    // if (graphQueries.length > 0 || prismaPromises.length > 0) {
                    //     await quickTrace(`${this.className()}.commit#after/batchedCalls`, async () => {
                    //         await Promise.all([
                    //             Model.executeDBCalls(prismaPromises),
                    //             ongdb.batch(graphQueries)
                    //         ]);
                    //     })
                    // }

                    if (prismaPromises.length > 0) {
                        await quickTrace(`${this.className()}.commit#after/batchedCalls`, async () => {
                            await Model.executeDBCalls(prismaPromises);
                        })
                    }
                })
            }
        })
    }

    /**
     *  When processing dirty for creation/committing, we may need to run some pre-processing
     *  usually for assigning values or processing joins. (Hooks cannot add to joins, so this is necessary)
     *  @see ContactTimelineEvent.prepareDirty()
     */
    protected prepareDirty() {
    }

    // public async commitGraph() {
    //     await quickTrace(`${this.className()}#commitGraph`, async (span) => {
    //         if (this.isNew()) {
    //             span.setAttribute('wrapper.failureFlag', 'uncommittedObject');
    //             throw new UncommitedObjectError('Attempted to update graph object of uncommitted object')
    //         }
    //
    //         // Update graph db object
    //         const updateProps: { [key: string]: any } = {};
    //         for (const property of _graphProperties[this.className()]) {
    //             const prop = property as ModelAttributes<T>;
    //             if (this.isDirty(prop)) {
    //                 updateProps[prop] = this.get(prop);
    //             }
    //         }
    //
    //         if (ongdb.models.has(this.className())) {
    //             const graphObj = await ongdb.find(this.className(), this.guid.toString('hex'));
    //             if (!graphObj) {
    //                 span.setAttribute('wrapper.failureFlag', 'graphObjectMissing')
    //                 throw new ProgrammingError(`Graph object for ${this.className()} (${this._guid.toString('hex')}) not found, that means it was not created when running Model.create()`);
    //             }
    //             await graphObj.update(updateProps);
    //         }
    //     })
    // }

    // Skips validation and hooks, only use for unit tests.
    public async insecureForceCommitForUnittestsOnly() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Forcing commit in production environment is not allowed');
        } else if (process.env.NODE_ENV === 'development') {
            this.logger.warn('Forcing commit in development environment, this is probably not what you want to do');
            console.trace()
        }

        const client = Model.getPrisma();
        if (this.isNew()) {
            await this.create().catch(e => {
                throw new Error('Error in creation', {
                    cause: e
                });
            })
        } else {
            // Update graph db object
            // await this.commitGraph().catch(console.error);

            // @ts-expect-error - We'll just hope that the prisma client has this class in it.
            await client[this.className()].update({
                where: {
                    id: this._guid
                },
                data: this._dirty
            });

            this._dirty = {};
            this._dirtySubModels = new Set();
            this.onMutate('commit')
        }
    }

    /**
     * Creates multiple objects in one/two batches (2 if graph objects need to be created).
     * @param data The objects to create.
     * @param runHooks Whether to run the create hooks for the objects.
     * @param ignoreTransaction If true, the object will be committed without a transaction.
     * This is important for things like logging, which must be committed outside a transaction in case of rollbacks.
     */
    public static async createMany(data: Model<any>[], runHooks = false, ignoreTransaction?: boolean) {
        if (data.length === 0) {
            LOGGER.warn('Attempted to create 0 objects');
            return;
        }

        // Class name -> {property: value}[]
        const dataToCreate: Record<string, Record<string, any>[]> = {};

        // Class name -> {property: value}[]
        // const graphDataToCreate: Record<string, Record<string, any>[]> = {};
        let prismaQueries: PrismaPromise<any>[] = []
        // let graphQueries: Array<GraphQuery> = [];
        for (const obj of data) {
            obj.warnOnRemoteOperation = true;

            let _prismaQueries: PrismaPromise<any>[] = []
            // let _graphQueries: Array<GraphQuery> = [];

            // Run create hooks
            if (runHooks) {
                const createHooks = hooks[obj.className()].create;

                for (const property in obj._dirty) {
                    const prop = property as ModelAttributes<any>;
                    if (obj.isEncrypted(prop)) {
                        obj._dirty[prop] = obj.encrypt(prop);
                    }
                }

                for (const hook of createHooks.before) {
                    const result = await hook.call(obj, true);
                    if (isBatchResult(result)) {
                        const res = result.result;
                        if (isPromise(res)) {
                            _prismaQueries.push(res)
                        } else {
                           _prismaQueries = _prismaQueries.concat(res)
                        }
                        /*
                        else {
                            if (Array.isArray(res)) {
                                if (isPrismaPromiseArray(res)) {
                                    _prismaQueries = _prismaQueries.concat(res);
                                } else {
                                    _graphQueries = _graphQueries.concat(res);
                                }
                            } else {
                                _graphQueries.push(res);
                            }
                        }
                         */
                    }
                }
            }

            const validateResult = await obj.validate();

            if (!validateResult.result) {
                LOGGER.error(`Validation failed for ${obj.className()} with message ${validateResult.msg.replaceAll('{0}', obj.className())}`);
                continue;
            }

            if (!(obj.className() in dataToCreate)) {
                dataToCreate[obj.className()] = [];
            }

            dataToCreate[obj.className()].push({
                id: obj.guid,
                ...obj._dirty
            });

            // if (obj.isGraphObject()) {
            //     if (!(obj.className() in graphDataToCreate)) {
            //         graphDataToCreate[obj.className()] = [];
            //     }
            //
            //     const graphProps: { [key: string]: any } = {guid: obj._guid.toString('hex')};
            //     for (const property of _graphProperties[obj.className()]) {
            //         graphProps[property] = obj.get(property as ModelAttributes<any>) ?? null;
            //     }
            //
            //     graphDataToCreate[obj.className()].push(graphProps);
            // }

            prismaQueries = prismaQueries.concat(_prismaQueries);
            // graphQueries = graphQueries.concat(_graphQueries);
            obj.warnOnRemoteOperation = false;
        }

        await Model.executeDBCalls(prismaQueries);
        // await Promise.all([Model.executeDBCalls(prismaQueries), ongdb.batch(graphQueries)]);

        let client = currentTsx ? currentTsx.transaction : dbClient;
        if (ignoreTransaction) {
            client = dbClient;
        }

        // const queries: Array<GraphQuery> = [];

        // for (const className in graphDataToCreate) {
        //     const records = graphDataToCreate[className];
        //
        //     if (records.length === 0) {
        //         continue;
        //     }
        //
        //     for (const data of records) {
        //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        //         const {guid, ...dataWithoutGuid} = data;
        //         const committedData: Record<string, any> = {};
        //         for (const property in dataWithoutGuid) {
        //             if (dataWithoutGuid[property] != null) {
        //                 committedData[property] = dataWithoutGuid[property];
        //             }
        //         }
        //
        //         queries.push({
        //             query: `MERGE (n:${className} {guid: $guid}) ON CREATE\n${Object.entries(committedData).map(([key, value]) => {
        //                 if (value instanceof Date && !isNaN(value.getTime())) {
        //                     committedData[key] = value.toISOString();
        //                     return `SET n.${key} = datetime($data.${key})`;
        //                 } else {
        //                     return `SET n.${key} = $data.${key}`;
        //                 }
        //             }).join('\n')}`,
        //             params: {
        //                 guid: guid.toString('hex'),
        //                 data: committedData
        //             }
        //         });
        //     }
        // }

        const promises: PrismaPromise<any>[] = Object.keys(dataToCreate).map((className) => {
            const data = dataToCreate[className];

            if (data.length === 0) {
                return;
            }

            // @ts-expect-error - We'll just hope that the prisma client has this class in it.
            return client[className].createMany({
                data: data
            });
        }).filter((d) => d != null) as PrismaPromise<any>[];

        await Model.executeDBCalls(promises);
        // await Promise.all([Model.executeDBCalls(promises), ongdb.batch(queries)])

        if (runHooks) {
            prismaQueries = [];
            // graphQueries = [];
            for (const obj of data) {
                obj.warnOnRemoteOperation = true;
                obj._new = false;
                // Run create#after hooks
                const createHooks = hooks[obj.className()].create;

                for (const hook of createHooks.after) {
                    const result = await hook.call(obj, true);
                    let _prismaQueries: PrismaPromise<any>[] = [];
                    // let _graphQueries: GraphQuery[] = [];

                    if (isBatchResult(result)) {
                        const res = result.result;
                        if (isPromise(res)) {
                            _prismaQueries.push(res)
                        } else {
                            _prismaQueries = _prismaQueries.concat(res)
                        }
                        /*
                        else {
                            if (Array.isArray(res)) {
                                if (isPrismaPromiseArray(res)) {
                                    _prismaQueries = _prismaQueries.concat(res);
                                } else {
                                    _graphQueries = _graphQueries.concat(res);
                                }
                            } else {
                                _graphQueries.push(res);
                            }
                        }
                         */
                    }

                    prismaQueries = prismaQueries.concat(_prismaQueries);
                    // graphQueries = graphQueries.concat(_graphQueries)
                }

                obj.warnOnRemoteOperation = false;
            }

            await Model.executeDBCalls(prismaQueries);
            // await Promise.all([Model.executeDBCalls(prismaQueries), ongdb.batch(graphQueries)]);
        } else {
            for (const obj of data) {
                obj._new = false;
            }
        }
    }

    /**
     * Deletes multiple objects in one/two batches (2 if graph objects need to be deleted).
     * @param data The objects to delete.
     */
    public static async deleteMany(data: Model<any>[]) {
        if (data.length === 0) {
            LOGGER.warn('Attempted to delete 0 objects');
            return;
        }

        // Class name -> id[]
        const dataToDelete: { [key: string]: Buffer[] } = {};
        // const graphDataToDelete: { [key: string]: string[] } = {};

        for (const obj of data) {
            if (!(obj.className() in dataToDelete)) {
                dataToDelete[obj.className()] = [];
            }

            dataToDelete[obj.className()].push(obj.guid);

            // if (obj.isGraphObject()) {
            //     if (!(obj.className() in graphDataToDelete)) {
            //         graphDataToDelete[obj.className()] = [];
            //     }
            //     graphDataToDelete[obj.className()].push(obj.guid.toString('hex'));
            // }
        }

        const client = Model.getPrisma();

        // const queries: Array<{
        //     query: string,
        //     params: {
        //         ids: string[]
        //     }
        // }> = [];

        // for (const className in graphDataToDelete) {
        //     const ids = graphDataToDelete[className];
        //     if (ids.length === 0) {
        //         continue;
        //     }
        //
        //     queries.push({
        //         query: `MATCH (n:${className}) WHERE n.guid = IN $ids DETACH DELETE n`,
        //         params: {
        //             ids
        //         }
        //     });
        // }

        const promises: PrismaPromise<any>[] = Object.keys(dataToDelete).map((className) => {
            const data = dataToDelete[className];

            if (data.length === 0) {
                return;
            }

            // @ts-expect-error - We'll just hope that the prisma client has this class in it.
            return client[className].deleteMany({
                where: {
                    id: {
                        in: data
                    }
                }
            });
        }).filter((d) => d != null) as PrismaPromise<any>[];

        await Model.executeDBCalls(promises);
        data.forEach((obj) => {
            obj.onMutate('delete');
        });
        // await Promise.all([Model.executeDBCalls(promises), ongdb.batch(queries)])
    }

    public static async updateMany(data: Model<any>[], runHooks = false, ignoreTransaction?: boolean) {
        if (data.length === 0) {
            LOGGER.warn('Attempted to update 0 objects');
            return;
        }

        // Class name -> { property: value }[]
        const dataToUpdate: Record<string, Record<string, any>[]> = {};

        // Class name -> { property: value }[]
        // const graphDataToUpdate: Record<string, Record<string, any>[]> = {};

        let prismaQueries: PrismaPromise<any>[] = [];
        // let graphQueries: GraphQuery[] = [];
        for (const obj of data) {
            obj.warnOnRemoteOperation = true;


            let _prismaQueries: PrismaPromise<any>[] = [];
            // let _graphQueries: GraphQuery[] = [];

            // Run update hooks
            if (runHooks) {
                let updateFailed = false;

                await quickTrace('Model.batchUpdate#hooksBefore', async (span) => {
                    span.setAttribute('wrapper.object.className', obj.className());
                    span.setAttribute('wrapper.object.guid', obj._guid.toString('hex'));
                    const updateHooks = hooks[obj.className()].update;

                    for (const property in obj._dirty) {
                        const prop = property as ModelAttributes<any>;
                        if (obj.isEncrypted(prop)) {
                            obj._dirty[prop] = obj.encrypt(prop);
                        }

                        if (updateHooks.before.length > 0) {
                            for (const hook of updateHooks.before) {
                                const result = await hook.call(obj, prop, obj._dirty[prop], obj._old[prop], true);
                                if (isBatchResult(result)) {
                                    const res = result.result;
                                    if (isPromise(res)) {
                                        _prismaQueries.push(res)
                                    } else {
                                        _prismaQueries = _prismaQueries.concat(res)
                                    }
                                    /*
                                    else {
                                        if (Array.isArray(res)) {
                                            if (isPrismaPromiseArray(res)) {
                                                _prismaQueries = _prismaQueries.concat(res);
                                            } else {
                                                _graphQueries = _graphQueries.concat(res);
                                            }
                                        } else {
                                            _graphQueries.push(res);
                                        }
                                    }
                                     */
                                } else if (!result) {
                                    LOGGER.error(`Creation hook ${hook.name} for ${this.className()}#before returned false`);
                                    updateFailed = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (updateFailed) {
                        span.setAttribute('wrapper.failureFlag', 'beforeUpdateHookFailure');
                        LOGGER.error(`One or more Update hooks for ${this.className()}#before returned false, canceling update`);
                    }
                })

                if (updateFailed) {
                    continue;
                }
            }

            const validateResult = await obj.validate();

            if (!validateResult.result) {
                LOGGER.error(`Validation failed for ${obj.className()} with message ${validateResult.msg.replaceAll('{0}', obj.className())}`);
                continue;
            }

            if (!(obj.className() in dataToUpdate)) {
                dataToUpdate[obj.className()] = [];
            }

            dataToUpdate[obj.className()].push({
                id: obj.guid,
                ...obj._dirty
            });

            // if (obj.isGraphObject()) {
            //     if (!(obj.className() in graphDataToUpdate)) {
            //         graphDataToUpdate[obj.className()] = [];
            //     }
            //
            //     const graphProps: { [key: string]: any } = {guid: obj._guid.toString('hex')};
            //     for (const property of _graphProperties[obj.className()]) {
            //         graphProps[property] = obj.get(property as ModelAttributes<any>) ?? null;
            //     }
            //
            //     graphDataToUpdate[obj.className()].push(graphProps);
            // }

            prismaQueries = prismaQueries.concat(_prismaQueries);
            // graphQueries = graphQueries.concat(_graphQueries);

            obj.warnOnRemoteOperation = false;
        }

        let client = currentTsx ? currentTsx.transaction : dbClient;
        if (ignoreTransaction) {
            client = dbClient;
        }

        // const queries: Array<GraphQuery> = [];

        // for (const className in graphDataToUpdate) {
        //     const records = graphDataToUpdate[className];
        //
        //     if (records.length === 0) {
        //         continue;
        //     }
        //
        //     for (const data of records) {
        //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        //         const {guid, ...dataWithoutGuid} = data;
        //         const committedData: Record<string, any> = {};
        //         for (const property in dataWithoutGuid) {
        //             if (dataWithoutGuid[property] != null) {
        //                 committedData[property] = dataWithoutGuid[property];
        //             }
        //         }
        //
        //         queries.push({
        //             query: `MATCH (n:${className} {guid: $guid})\n${Object.entries(committedData).map(([key, value]) => {
        //                 if (value instanceof Date && !isNaN(value.getTime())) {
        //                     committedData[key] = value.toISOString();
        //                     return `SET n.${key} = datetime($data.${key})`;
        //                 } else {
        //                     return `SET n.${key} = $data.${key}`;
        //                 }
        //             }).join('\n')}`,
        //             params: {
        //                 guid: guid.toString('hex'),
        //                 data: committedData
        //             }
        //         });
        //     }
        // }

        const promises: PrismaPromise<any>[] = []
        Object.keys(dataToUpdate).forEach((className) => {
            const data = dataToUpdate[className];

            if (data.length === 0) {
                return;
            }

            promises.push(...data.map(datum => {
                const {id, ...rest} = {id: datum.id, ...datum};
                // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                return client[className].update({
                    where: {
                        id: id
                    },
                    data: rest,
                })
            }))
        });

        await quickTrace('Model.batchUpdate#execute', async () => {
            await Model.executeDBCalls(promises);
            // await Promise.all([Model.executeDBCalls(promises), ongdb.batch(queries)])
        })

        if (runHooks) {
            await quickTrace('Model.batchUpdate#hooksAfter', async () => {
                let prismaQueries: PrismaPromise<any>[] = [];
                // let graphQueries: GraphQuery[] = [];
                for (const obj of data) {
                    obj.warnOnRemoteOperation = true;
                    // Run create#after hooks
                    const updateHooks = hooks[obj.className()].update;

                    let _prismaQueries: PrismaPromise<any>[] = [];
                    // let _graphQueries: GraphQuery[] = [];

                    for (const property in obj._dirty) {
                        const prop = property as ModelAttributes<typeof obj>;

                        const old = obj._old[prop];
                        if (updateHooks.after.length > 0) {
                            for (const hook of updateHooks.after) {
                                const result = await hook.call(this, property, obj._dirty[prop], old, true);
                                if (isBatchResult(result)) {
                                    const res = result.result;
                                    if (isPromise(res)) {
                                        _prismaQueries.push(res)
                                    } else {
                                        _prismaQueries = _prismaQueries.concat(res)
                                    }
                                    /*
                                    else {
                                        if (Array.isArray(res)) {
                                            if (isPrismaPromiseArray(res)) {
                                                _prismaQueries = _prismaQueries.concat(res);
                                            } else {
                                                _graphQueries = _graphQueries.concat(res);
                                            }
                                        } else {
                                            _graphQueries.push(res);
                                        }
                                    }
                                     */
                                }
                            }
                        }
                    }

                    prismaQueries = prismaQueries.concat(_prismaQueries);
                    // graphQueries = graphQueries.concat(_graphQueries);

                    obj.warnOnRemoteOperation = false;
                }
            })
        }
    }

    protected setOld<K extends ModelAttributes<T>>(property: K, value: ValueType<K, T>) {
        if (Model.isInstance(value)) {
            const _val = value.cloneForOldAssignment();
            _val.setReadOnly();
            this._old[property] = _val
        } else if (Model.isModelArray(value)) {
            this._old[property] = value.map(v => {
                const _val = v.cloneForOldAssignment();
                _val.setReadOnly();
                return _val
            })
        } else {
            this._old[property] = value
        }
    }

    protected async create(ignoreTransaction?: boolean) {
        await quickTrace(`${this.className()}#create`, async (span) => {
            if (this.isDeleted()) {
                span.setAttribute('wrapper.failureFlag', 'deletedObject');
                throw new DeletedObjectError('Attempted to re-create deleted object')
            }
            if (!this.isNew()) {
                span.setAttribute('wrapper.failureFlag', 'committedObject');
                throw new UncommitedObjectError('This object has already been committed');
            }

            const toRunHooksOn: Model<any>[] = [];

            function processDirty(model: Model<any>, reverse?: string[]) {
                model.prepareDirty()
                const creationData: Record<string, any> = model._dirty;

                for (const property of model._loadedProperties) {
                    if (reverse?.includes(property)) continue;
                    const prop = property as ModelAttributes<T>;

                    if (model.get(prop) === undefined) {
                        continue;
                    }

                    if (model.isWrapped(prop)) {
                        if (model.get(prop) === null) {
                            delete creationData[prop];
                            continue;
                        }

                        const val = model.get(prop);
                        const wrapper = _wrappers[model.className()][prop];

                        if (Model.isModelArray(val)) {
                            if (val.length === 0) {
                                delete creationData[prop];
                                continue;
                            }
                            const _create: any[] = []
                            const _connect: { id: Buffer }[] = []

                            for (const _v of val as Model<any>[]) {
                                if (_v.isNew()) {
                                    let _dirty = _v._dirty;

                                    // In case validation relies on the id, we need to set it
                                    if (!_v.isLoaded(wrapper.idProperty) || _v.get(wrapper.idProperty) == null) {
                                        _v.overrideSetFunctionality = 'preventMutationDetection';
                                        _v.set(wrapper.idProperty, model.guid)
                                        _v.overrideSetFunctionality = false;
                                    }

                                    if (!_v.isLoaded(wrapper.reverseProperty) || _v.get(wrapper.reverseProperty) == null) {
                                        _v.overrideSetFunctionality = 'preventMutationDetection';
                                        _v.set(wrapper.reverseProperty, model)
                                        _v.overrideSetFunctionality = false;
                                    }

                                    // But we don't want it to be dirty
                                    delete _dirty[wrapper.reverseProperty]
                                    delete _dirty[wrapper.idProperty]

                                    toRunHooksOn.push(_v);

                                    _dirty = processDirty(_v, [wrapper.reverseProperty, wrapper.idProperty]);
                                    _dirty.id = _v.guid;
                                    _create.push(_dirty);
                                } else {
                                    if (_v.isDirty()) {
                                        model.logger.warn(`Connecting existing model to ${model.className()}.${prop}, but it is dirty. It will NOT update and must be committed separately (or using commit again with the original model)`)
                                    }
                                    _connect.push({
                                        id: _v.guid
                                    })
                                }
                            }

                            const connection: any = {}

                            if (_create.length > 0) {
                                connection.create = _create;
                            }
                            if (_connect.length > 0) {
                                connection.connect = _connect;
                            }

                            creationData[prop] = connection
                        } else if (Model.isInstance(val)) {
                            const _v = val as Model<any>
                            if (_v.isNew()) {
                                let _dirty = _v._dirty;

                                // In case validation relies on the id, we need to set it
                                if (!_v.isLoaded(wrapper.idProperty) || _v.get(wrapper.idProperty) == null) {
                                    _v.overrideSetFunctionality = 'preventMutationDetection';
                                    _v.set(wrapper.idProperty, model.guid)
                                    _v.overrideSetFunctionality = false;
                                }

                                if (!_v.isLoaded(wrapper.reverseProperty) || _v.get(wrapper.reverseProperty) == null) {
                                    _v.overrideSetFunctionality = 'preventMutationDetection';
                                    _v.set(wrapper.reverseProperty, model)
                                    _v.overrideSetFunctionality = false;
                                }

                                delete _dirty[wrapper.reverseProperty]
                                delete _dirty[wrapper.idProperty]

                                toRunHooksOn.push(_v);

                                _dirty = processDirty(_v, [wrapper.reverseProperty, wrapper.idProperty])
                                _dirty.id = _v.guid;
                                creationData[prop] = {
                                    create: _dirty
                                }
                                delete creationData[wrapper.idProperty]
                            } else {
                                if (_v.isDirty()) {
                                    model.logger.warn(`Connecting existing model to ${model.className()}.${prop}, but it is dirty. It will NOT update and must be committed separately (or using commit again with the original model)`)
                                }
                                delete creationData[prop]
                            }
                        }
                    } else if (model.isJointable(prop)) {
                        if (model.get(prop) === null) {
                            delete creationData[prop];
                            continue;
                        } else if (model.get(prop).length === 0) {
                            delete creationData[prop];
                            continue;
                        }

                        const jtDef = _jointables[model.className()][prop];
                        const val = model.get(prop) as Model<any>[];
                        if (val != null && val.length > 0) {
                            const _joins = []

                            for (const _v of val) {
                                if (_v == null) {
                                    model.logger.warn(`Something went wrong while loading ${model.className()}.${prop}. The array contains a null/undefined value which should not be possible.`);
                                    continue;
                                }
                                const _join: any = {}
                                if (_v.isNew()) {
                                    toRunHooksOn.push(_v);
                                    let _dirty = _v._dirty;
                                    const reverse = _jointablesReverse[_v.className()][prop];

                                    if (!_v.isLoaded(reverse) || _v.get(reverse) == null || _v.get(reverse).length === 0) {
                                        _v.overrideSetFunctionality = 'preventMutationDetection';
                                        // Check if there's an id property that needs to be set
                                        _v.addReverse(reverse, [model])
                                        _v.overrideSetFunctionality = false;
                                    }

                                    delete _dirty[reverse];

                                    _dirty = processDirty(_v, [reverse])
                                    _dirty.id = _v.guid;
                                    _join[jtDef.joinField] = {
                                        create: _dirty
                                    }
                                } else {
                                    _join[jtDef.intermediateOtherIdProperty] = _v.guid
                                }

                                if (_reverseJoinedFields[_v.className()][model.className()] && prop in _reverseJoinedFields[_v.className()][model.className()]) {
                                    for (const joinedField in _reverseJoinedFields[_v.className()][model.className()][prop]) {
                                        const joinField = _reverseJoinedFields[_v.className()][model.className()][prop][joinedField];
                                        const definition = _joinedFields[_v.className()][joinField];

                                        if (_v.isLoaded(joinField) && model.className() === definition.model && _v.get(joinField) !== undefined) {
                                            _join[definition.targetedProperty] = _v.get(joinField);
                                        }
                                    }
                                }

                                if (jtDef.intermediateId === true && _join.id == null) {
                                    _join.id = generateGuid();

                                    const joinField = _reverseJoinedFields[_v.className()][model.className()][prop].id;
                                    _v.overrideSetFunctionality = 'preventMutationDetection';
                                    _v.set(joinField, _join.id)
                                    _v.overrideSetFunctionality = false;
                                    _v._loadedProperties.add(joinField);
                                    if (_v._referencedModel) {
                                        _v._referencedModel.overrideSetFunctionality = 'preventMutationDetection';
                                        _v._referencedModel.set(joinField, _join.id)
                                        _v._referencedModel.overrideSetFunctionality = false;
                                        _v._referencedModel._loadedProperties.add(joinField);
                                    }
                                }

                                _joins.push(_join)
                            }

                            if (_joins.length > 0) {
                                creationData[prop] = {
                                    create: _joins
                                }
                            } else {
                                delete creationData[prop]
                            }
                        }

                    } else if (model.isEncrypted(prop)) {
                        creationData[prop] = model.encrypt(prop)
                    } else if (prop in _idsToWrapped[model.className()]) {
                        delete creationData[prop]

                        const wrapperProp = _idsToWrapped[model.className()][prop];

                        if (model.get(prop) === null || model.get(wrapperProp)?.isNew()) {
                            continue;
                        }

                        creationData[prop] = model.get(prop) as Buffer
                    } else if (model.isJoinedProperty(prop) || model.isCalculated(prop) /*|| model.isRelation(prop)*/) {
                        delete creationData[prop]
                    }
                }

                return creationData
            }

            const creationData = processDirty(this);

            toRunHooksOn.push(this);

            await quickTrace(`Before create hooks`, async (_span) => {
                const promises: Promise<any>[] = [];
                let prismaPromises: Array<PrismaPromise<any>> = []
                // let graphQueries: GraphQuery[] = [];
                _span.setAttribute('wrapper.hooks.onSubModels', true);
                _span.setAttribute('wrapper.hooks.modelCount', toRunHooksOn.length);
                for (const model of toRunHooksOn) {
                    if (!model.guid.equals(this.guid)) {
                        const validation = await model.validate();

                        if (!validation.result) {
                            span.setAttribute('wrapper.failureFlag', 'validationError');
                            throw new ValidationError(validation.msg, ClassNameMapping[model.className()])
                        }
                    }

                    const createHooks = hooks[model.className()]?.create;
                    if (createHooks.before.length > 0) {
                        for (const hook of createHooks.before) {
                            promises.push(quickTrace(`${model.className()}#before`, async () => {
                                const result = await hook.call(model, false);
                                if (isBatchResult(result)) {
                                    const res = result.result;
                                    if (isPromise(res)) {
                                        prismaPromises.push(res)
                                    } else {
                                        prismaPromises = prismaPromises.concat(res);
                                    }
                                    /*
                                    else {
                                        if (Array.isArray(res)) {
                                            if (isPrismaPromiseArray(res)) {
                                                prismaPromises = prismaPromises.concat(res);
                                            } else {
                                                graphQueries = graphQueries.concat(res);
                                            }
                                        } else {
                                            graphQueries.push(res);
                                        }
                                    }
                                     */
                                }
                            }))
                        }
                    }
                }

                await Promise.all(promises);

                // if (prismaPromises.length > 0 || graphQueries.length > 0) {
                //     await quickTrace(`${this.className()}.create#before/batchedCalls`, async () => {
                //         await Promise.all([
                //             Model.executeDBCalls(prismaPromises),
                //             ongdb.batch(graphQueries)
                //         ]);
                //     })
                // }

                if (prismaPromises.length > 0) {
                    await quickTrace(`${this.className()}.create#before/batchedCalls`, async () => {
                        await Model.executeDBCalls(prismaPromises);
                    })
                }
            })

            span.setAttribute('wrapper.tsx', currentTsx != null);
            let client = Model.getPrisma();
            if (ignoreTransaction) {
                span.setAttribute('wrapper.tsx.ignored', true)
                client = dbClient;
            }

            // Validate required properties
            for (const property of _requiredProperties[this.className()]) {
                if (!(property in this) || this.get(property as ModelAttributes<T>) === undefined) {
                    span.setAttribute('wrapper.failureFlag', 'requiredProperty');
                    throw new RequiredPropertyError(property);
                }
            }

            try {

                // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                await client[this.className()].create({
                    data: {
                        id: this._guid,
                        ...creationData
                    }
                });
                if (currentTsx != null) {
                    currentTsx.addCommitedObject(this);
                }

                this._dirty = {};
                this._dirtySubModels = new Set();
                this.onMutate('commit')
                this._new = false;

                const graphProps: { [key: string]: any } = {guid: this._guid.toString('hex')};
                for (const property of _graphProperties[this.className()]) {
                    graphProps[property] = this.get(property as ModelAttributes<T>) ?? null;
                }

                // Create graph db object
                // if (ongdb.models.has(this.className())) {
                //     await quickTrace(`${this.className()}#createGraph`, async () => await ongdb.create(this.className(), graphProps))
                // }

                const promises: Array<Promise<any>> = [];
                let prismaPromises: Array<PrismaPromise<any>> = []
                // let graphQueries: Array<GraphQuery> = [];
                await quickTrace(`After create hooks`, async (_span) => {
                    _span.setAttribute('wrapper.hooks.onSubModels', true);
                    _span.setAttribute('wrapper.hooks.modelCount', toRunHooksOn.length);
                    for (const model of toRunHooksOn) {
                        const createHooks = hooks[model.className()].create;

                        for (const prop of model._loadedProperties) {
                            const value = model.get(prop);
                            if (model.isPersisted(prop) || model.isRequired(prop) || model.isWrapped(prop) || model.isJointable(prop)) {
                                model.setOld(prop as ModelAttributes<T>, value);
                            }
                        }

                        // A dirty persisted model will not be saved when it is the child of a new (unpersisted) parent model
                        if (model.isNew()) {
                            model._dirty = {};
                            model._dirtySubModels = new Set();
                            model._new = false;
                            model.onMutate('commit')
                        }

                        if (createHooks.after.length > 0) {
                            for (const hook of createHooks.after) {
                                promises.push(quickTrace(`${model.className()}#after`, async () => {
                                    const result = await hook.call(model, false);
                                    if (isBatchResult(result)) {
                                        const res = result.result;
                                        if (isPromise(res)) {
                                            prismaPromises.push(res)
                                        } else {
                                            prismaPromises = prismaPromises.concat(res);
                                        }
                                        /*
                                        else {
                                            if (Array.isArray(res)) {
                                                if (isPrismaPromiseArray(res)) {
                                                    prismaPromises = prismaPromises.concat(res);
                                                } else {
                                                    graphQueries = graphQueries.concat(res);
                                                }
                                            } else {
                                                graphQueries.push(res);
                                            }
                                        }
                                         */
                                    }
                                }))
                            }
                        }
                    }

                    await Promise.all(promises);
                })

                // if (prismaPromises.length > 0 || graphQueries.length > 0) {
                //     await quickTrace(`${this.className()}.create#after/batchedCalls`, async () => {
                //         await Promise.all([
                //             Model.executeDBCalls(prismaPromises),
                //             ongdb.batch(graphQueries)
                //         ]);
                //     })
                // }

                if (prismaPromises.length > 0) {
                    await quickTrace(`${this.className()}.create#after/batchedCalls`, async () => {
                        await Model.executeDBCalls(prismaPromises);
                    })
                }
            } catch (e) {
                if (e instanceof PrismaClientKnownRequestError && e.message.includes('Unique constraint failed on the fields')) {
                    throw new UniqueConstraintViolationError(this.className(), e.meta!.target as string[], e)
                } else {
                    throw e;
                }
            }
        })
    }

    /**
     * @param forceDelete Deletes the object from the database even if it is a soft-delete object.
     * Very possible that it fails due to cascade deletion restrictions in the schema
     */
    public async delete(forceDelete = false) {
        await quickTrace(`${this.className()}#delete`, async (span) => {
            if (this.isDeleted()) {
                span.setAttribute('wrapper.failureFlag', 'deletedObject');
                throw new DeletedObjectError('Cannot delete deleted object')
            }

            span.setAttribute('wrapper.tsx', currentTsx != null);
            const client = Model.getPrisma();

            if (!this.isNew()) {
                try {
                    // Run delete hooks for before
                    const deleteHooks = hooks[this.className()].delete;

                    if (deleteHooks.before.length > 0) {
                        const promises: Promise<any>[] = [];
                        let shouldReturn = false;

                        await quickTrace('Before Delete Hooks', async () => {
                            for (const hook of deleteHooks.before) {
                                promises.push(quickTrace(`${this.className()}.${hook.name}`, async (_span) => {
                                    const result = await hook.call(this)
                                    if (!result) {
                                        this.logger.error(`Delete hook ${hook.name} for ${this.className()} failed, cancelling delete.`)
                                        _span.setAttribute('wrapper.failure', true);
                                        shouldReturn = true;
                                        return;
                                    }
                                }))
                                if (shouldReturn) {
                                    return;
                                }
                            }
                        })

                        await Promise.all(promises);

                        if (shouldReturn) {
                            return
                        }
                    }

                    const promises: Promise<any>[] = []

                    if (SoftDeleteModels.includes(this.className()) && !forceDelete) {
                        // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                        promises.push(client[this.className()].update({
                            where: {
                                id: this._guid
                            },
                            data: {
                                deleted: true,
                                deletedAt: new Date()
                            }
                        }))
                    } else {
                        // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                        promises.push(client[this.className()].delete({
                            where: {
                                id: this._guid
                            }
                        }))
                    }

                    // if (ongdb.models.has(this.className())) {
                    //     const graphObj = await ongdb.find(this.className(), this.guid.toString('hex'));
                    //     if (graphObj) {
                    //         promises.push(graphObj.delete());
                    //     } else {
                    //         await Promise.all(promises); // Still want to make sure the delete is committed
                    //         throw new ProgrammingError(`Graph object for ${this.className()} (${this._guid.toString('hex')}) not found, that means it was not created when running Model.create()`);
                    //     }
                    // }

                    await Promise.all(promises);

                    if (currentTsx != null) {
                        currentTsx.removeCommitedObject(this);
                    }

                    if (deleteHooks.after.length > 0) {
                        let prismaPromises: Array<PrismaPromise<any>> = []
                        // let graphQueries: Array<GraphQuery> = [];

                        for (const hook of deleteHooks.after) {
                            await quickTrace(`${this.className()}.${hook.name}`, async () => {
                                const result = await hook.call(this)

                                if (isBatchResult(result)) {
                                    const res = result.result;
                                    if (isPromise(res)) {
                                        prismaPromises.push(res)
                                    } else {
                                        prismaPromises = prismaPromises.concat(res);
                                    }
                                    /*
                                    else {
                                        if (Array.isArray(res)) {
                                            if (isPrismaPromiseArray(res)) {
                                                prismaPromises = prismaPromises.concat(res);
                                            } else {
                                                graphQueries = graphQueries.concat(res);
                                            }
                                        } else {
                                            graphQueries.push(res);
                                        }
                                    }
                                     */
                                }
                            })
                        }

                        // if (prismaPromises.length > 0 || graphQueries.length > 0) {
                        //     await Promise.all([
                        //         Model.executeDBCalls(prismaPromises),
                        //         ongdb.batch(graphQueries)
                        //     ])
                        // }

                        if (prismaPromises.length > 0) {
                            await Model.executeDBCalls(prismaPromises);
                        }

                        this.onMutate('delete')
                    }
                } catch (e) {
                    if (e instanceof PrismaClientKnownRequestError && e.message.includes('Record to delete does not exist.')) {
                        this.logger.warn('Attempted to delete object that does not exist in database. This is usually fine (e.g. cascading deletes), but if that\'s not supposed to be happening, you should check up on that.');
                        this.logger.warn(e);
                    } else {
                        throw e;
                    }
                }
            }

            this._deleted = true;
        })
    }

    /**
     * Prepares the where clause for the prisma read function.
     * Encrypts properties and processes jointables where needed.
     *
     * The where clause technically won't follow the types laid out because the intermediate model is never used
     * in wrapper files.
     * @param model The model to prepare the where clause for.
     * @param _where The where clause to prepare.
     */
    static async prepareWhere<T extends Model<T>>(model: IModel<T>, _where: ReadWhere<T>, instrument = true, forceReadDeleted = false): Promise<ReadWhere<T>> {
        async function _internalPrepareWhere(model: IModel<T>, _where: ReadWhere<T>): Promise<ReadWhere<T>> {
            if (!_initialized[model.className()]) {
                Model.initializeProperties(model.className());
            }

            const where = {..._where};

            for (const attr in where) {
                if (attr in _joinedFields[model.className()]) {
                    const join = _joinedFields[model.className()][attr];
                    const tables = Array.isArray(join.joinField)
                        ? join.joinField.map(field => _jointables[model.className()][_jointablesReverse[model.className()][field]])
                        : [_jointables[model.className()][_jointablesReverse[model.className()][join.joinField]]];
                    throw new UnsupportedOperationError(`Attempted to select joined field ${model.className()}.${attr} directly. This field must be queried through a join using ${englishList(
                        tables.map(jointable => `${jointable.model}.${join.joinField}`),
                        'or'
                    )}.`);
                }

                const prop = attr as ModelQueryable<T>
                if (_encryptedProperties[model.className()] != null && attr in _encryptedProperties[model.className()]) {
                    // @ts-expect-error - Encrypted fields are strings in DB
                    where[prop] = encryptData(where[prop])
                } else if (_uniqueEncryptedProperties[model.className()] != null && attr in _uniqueEncryptedProperties[model.className()]) {
                    throw new Error('Unique encrypted properties cannot be used in where clauses')
                } else if (_wrappers[model.className()] != null && attr in _wrappers[model.className()]) {
                    let _model: IModel<any>;
                    const wrapper = _wrappers[model.className()][attr].model;
                    if (typeof wrapper === 'string') {
                        _model = await Model.getModel(wrapper);
                    } else {
                        _model = wrapper;
                    }
                    const key = attr as keyof ReadWhere<T>; // The key of the where clause
                    const subWhere: ModelArrayWhere<Model<any>[]> | ReadWhere<Model<any>> = where[key]!;
                    if ('some' in subWhere || 'none' in subWhere || 'all' in subWhere) {
                        // ModelArrayWhere
                        const arrWhere = {...(subWhere as ModelArrayWhere<Model<any>[]>)} as ModelArrayWhere<Model<any>[]>;

                        for (const _key in arrWhere) {
                            if ((_key === 'some' || _key === 'none' || _key === 'all') && arrWhere[_key]) {
                                // Parse sub-where
                                arrWhere[_key] = await _internalPrepareWhere(_model, arrWhere[_key]);
                            }
                        }
                    } else {
                        // @ts-expect-error - Parse sub-where, don't know what the type is though (we just know that it's a subwhere because it's a wrapper)
                        where[key] = await _internalPrepareWhere(_model, subWhere);
                    }
                } else if (attr === 'OR' || attr === 'AND') {
                    if (where[attr] == null) continue
                    const subWhere: ModelArrayWhere<Model<any>[]> | ReadWhere<Model<any>> = [...where[attr]];
                    for (let i = 0; i < where[attr].length; i++) {
                        // @ts-expect-error - Valid keys
                        subWhere[i] = await _internalPrepareWhere(model, subWhere[i]);
                    }

                    // @ts-expect-error - Valid key
                    where[attr] = subWhere;
                } else if (attr === 'NOT') {
                    if (where[attr] == null) continue
                    if (Array.isArray(where[attr])) {
                        const subWhere: ReadWhere<T>[] = [...where[attr]];
                        for (let i = 0; i < subWhere.length; i++) {
                            subWhere[i] = await _internalPrepareWhere(model, subWhere[i]);
                        }
                        where[attr] = subWhere;
                    } else {
                        where[attr] = await _internalPrepareWhere(model, where[attr]);
                    }
                } else if (_jointables[model.className()] != null && attr in _jointables[model.className()]) {
                    const key = attr as keyof ReadWhere<T>;
                    const joinOnProp = _jointables[model.className()][key].joinField;
                    const _model = await Model.getModel(_jointables[model.className()][key].model);
                    const subWhere: ModelArrayWhere<Model<any>[]> = {...where[key] as ModelArrayWhere<Model<any>[]>};

                    const newSubWhere: ModelArrayWhere<Model<any>[]> = {}

                    for (const _key in subWhere) {
                        if ((_key === 'some' || _key === 'none' || _key === 'all') && subWhere[_key]) {
                            const whereOnModel: any = {}

                            for (const _attr in subWhere[_key]) {
                                const attr = _attr as keyof typeof subWhere[typeof _key];
                                if (_attr in _joinedFields[_model.className()]) {
                                    const join = _joinedFields[_model.className()][_attr]
                                    if (join.joinField === key || (Array.isArray(join.joinField) && join.joinField.includes(key))) {
                                        whereOnModel[join.targetedProperty] = subWhere[_key][attr];
                                        delete subWhere[_key][attr];
                                    }
                                }
                            }

                            const subWhereCopy: ReadWhere<Model<any>> = {...subWhere[_key]};
                            // Parse sub-where
                            newSubWhere[_key] = {};
                            newSubWhere[_key] = {[joinOnProp]: await _internalPrepareWhere(_model, subWhereCopy), ...whereOnModel};
                        }
                    }

                    // @ts-expect-error - Key is fine, TS just doesn't like it :/
                    where[key] = newSubWhere;
                }
            }

            if (!('deleted' in where) && SoftDeleteModels.includes(model.className()) && !forceReadDeleted) {
                // @ts-expect-error - Soft delete models are required to have a `deleted` attribute, so this is fine
                where['deleted'] = false;
            }

            return where;
        }

        if (instrument) {
            return await quickTrace(`${model.className()}#prepareWhere`, async () => {
                return _internalPrepareWhere(model, {..._where});
            })
        } else {
            return _internalPrepareWhere(model, {..._where});
        }
    }

    /**
     * Prepares the select clause for the prisma read function.
     * Unwraps any jointables and adds id to the select clause (if not already specified).
     * @param model The model to prepare the select clause for.
     * @param _select The select clause to prepare.
     * @param isInclude Whether the select clause is for an include or a select.
     */
    static async prepareSelect<T extends Model<T>>(model: IModel<T>, _select: ReadAttributes<T>, isInclude: boolean = false, forceReadDeleted = false): Promise<ReadAttributes<T>> {
        const instrumentWhere = process.env.DEEP_INSTRUMENTATION === 'true'

        function _prepareOrderBy<T2>(orderBy: ReadOrder<T2> | ReadOrder<T2>[]) {
            if (Array.isArray(orderBy)) {
                return orderBy
            }

            const orders: ReadOrder<T2>[] = [];

            for (const attribute in orderBy) {
                const attr = attribute as keyof ReadOrder<T2>;

                if (model.className() in _jointables && attribute in _jointables[model.className()]) {
                    const joinDef = _jointables[model.className()][attribute];
                    // @ts-expect-error Valid order by in prisma
                    orders.push({
                        [attr]: {
                            [joinDef.joinField]: orderBy[attr] as 'asc' | 'desc'
                        }
                    })
                } else {
                    orders.push({
                        [attr]: orderBy[attr]
                    } as ReadOrder<T2>)
                }
            }

            if (orders.length > 1) {
                return orders
            }
            return orders[0] || {};
        }

        async function _internalPrepareSelect<T1 extends Model<T1>>(model: IModel<T1>, _select: ReadAttributes<T1>, isInclude: boolean = false): Promise<ReadAttributes<T1>> {
            if (!_initialized[model.className()]) {
                Model.initializeProperties(model.className());
            }

            const select = {..._select};

            if (!('id' in select) && !isInclude) {
                select['id'] = true;
            }
            if (!isInclude && SoftDeleteModels.includes(model.className())) {
                // @ts-expect-error - Soft delete models are required to have a `deleted` attribute, so this is fine
                select['deleted'] = true;
            }

            for (const attribute in select) {
                if (attribute === '_count') {
                    continue;
                }
                const attr = attribute as keyof typeof select;

                if (_calculatedAttributes[model.className()] != null && attr in _calculatedAttributes[model.className()]) {
                    const calculateDef = _calculatedAttributes[model.className()][attr];
                    if (calculateDef.dependencies.length > 0) {
                        for (const dependency of calculateDef.dependencies) {
                            if (!(dependency in select)) {
                                if (isInclude && (dependency in _wrappers[model.className()] || dependency in _jointables[model.className()])) {
                                    // @ts-expect-error - Key is fine, TS just doesn't like it :/
                                    select[dependency] = true;
                                } else if (!isInclude) {
                                    // @ts-expect-error - Key is fine, TS just doesn't like it :/
                                    select[dependency] = true;
                                }
                            }
                        }
                    }

                    delete select[attr];
                } else if (attribute in _joinedFields[model.className()]) {
                    const join = _joinedFields[model.className()][attribute];
                    const tables = Array.isArray(join.joinField)
                        ? join.joinField.map(field => _jointables[model.className()][_jointablesReverse[model.className()][field]])
                        : [_jointables[model.className()][_jointablesReverse[model.className()][join.joinField]]];
                    throw new UnsupportedOperationError(`Attempted to select joined field ${model.className()}.${attribute} directly. This field must be queried through a join using ${englishList(
                        tables.map(jointable => `${jointable.model}.${join.joinField}`),
                        'or'
                    )}.`);
                }
            }

            for (const attribute in select) {
                if (attribute === '_count') {
                    continue;
                }
                const attr = attribute as keyof typeof select;
                if (_wrappers[model.className()] != null && attr in _wrappers[model.className()]) {
                    let subSelect = select[attr] as ReadAttributesObject<Model<any>> | ArrayReadAttributes<Model<any>[]> | boolean;
                    if (typeof subSelect === 'boolean') {
                        continue;
                    }
                    subSelect = {...subSelect};
                    const wrapper = _wrappers[model.className()][attr].model;
                    let _model: IModel<any>;
                    if (typeof wrapper === 'string') {
                        _model = await Model.getModel(wrapper);
                    } else {
                        _model = wrapper;
                    }
                    if ('select' in subSelect) {
                        subSelect.select = await _internalPrepareSelect(_model, {...subSelect.select!});
                    } else if ('include' in subSelect) {
                        subSelect.include = await _internalPrepareSelect(_model, {...subSelect.include!}, true);
                    }
                    if ('where' in subSelect) {
                        subSelect.where = await Model.prepareWhere(_model, {...subSelect.where!}, instrumentWhere, forceReadDeleted);
                    } else if (!forceReadDeleted && SoftDeleteModels.includes(_model.className()) && _wrappers[model.className()][attr].isArray) {
                        subSelect.where = {
                            // @ts-expect-error - Deleted SHOULD be a valid key in a soft-delete model
                            deleted: false
                        }
                    }

                    if ('orderBy' in subSelect) {
                        subSelect.orderBy = _prepareOrderBy(subSelect.orderBy!);
                    }

                    // @ts-expect-error - Weird type bullshit going on under the hood that I don't really understand. Remove this and found out lol.
                    select[attr] = subSelect;
                } else if (_jointables[model.className()] != null && attr in _jointables[model.className()]) {
                    const jtDef = _jointables[model.className()][attr];
                    const joinOnProp = jtDef.joinField;
                    const _model = await Model.getModel(_jointables[model.className()][attr].model);
                    let subSelect = select[attr] as ArrayReadAttributes<Model<any>[]> | boolean;
                    if (typeof subSelect !== 'boolean') {
                        const selectOnModel: any = {}; // Values selected directly on the intermediate model (join table)
                        const whereOnModel: any = {}; // Where clauses on the intermediate model (join table)
                        subSelect = {...subSelect};
                        if ('where' in subSelect) {
                            for (const _attr in subSelect.where) {
                                if (_attr in _joinedFields[_model.className()]) {
                                    const join = _joinedFields[_model.className()][_attr]
                                    if (join.joinField === attr || (Array.isArray(join.joinField) && join.joinField.includes(attr))) {
                                        selectOnModel[join.targetedProperty] = subSelect.where[_attr as keyof typeof subSelect.where];
                                        delete subSelect.where[_attr as keyof typeof subSelect.where];
                                    }
                                }
                            }

                            subSelect.where = await Model.prepareWhere(_model, {...subSelect.where!}, instrumentWhere, forceReadDeleted);
                        }

                        if ('include' in subSelect) {
                            const include = {...subSelect.include};
                            for (const _attr in include) {
                                if (_attr in _joinedFields[_model.className()]) {
                                    const join = _joinedFields[_model.className()][_attr]
                                    if (join.joinField === attr || (Array.isArray(join.joinField) && join.joinField.includes(attr))) {
                                        selectOnModel[join.targetedProperty] = include[_attr as keyof typeof include];
                                        delete include[_attr as keyof typeof include];
                                    }
                                }
                            }

                            subSelect.include = await _internalPrepareSelect(_model, include, true);
                        } else if ('select' in subSelect) {
                            const select = {...subSelect.select};
                            for (const _attr in select) {
                                if (_attr in _joinedFields[_model.className()]) {
                                    const join = _joinedFields[_model.className()][_attr]
                                    if (join.joinField === attr || (Array.isArray(join.joinField) && join.joinField.includes(attr))) {
                                        selectOnModel[join.targetedProperty] = select[_attr as keyof typeof select];
                                        delete select[_attr as keyof typeof select];
                                    }
                                }
                            }

                            subSelect.select = await _internalPrepareSelect(_model, select);
                        }

                        if ('include' in subSelect) {
                            const include = subSelect.include;
                            // TODO: If necessary implement object joins, not just scalar joins
                            subSelect.include = {
                                // ...selectOnModel,
                                [joinOnProp]: {
                                    include
                                }
                            }
                        } else if ('select' in subSelect) {
                            const select = subSelect.select;
                            subSelect.select = {
                                ...selectOnModel,
                                [joinOnProp]: {
                                    select
                                }
                            }

                            if (jtDef.intermediateId === true) {
                                subSelect.select!.id = true;
                            }
                        }

                        if ('where' in subSelect) {
                            const where = subSelect.where;
                            subSelect.where = {
                                ...whereOnModel,
                                [joinOnProp]: where
                            }
                        } else if (!forceReadDeleted && SoftDeleteModels.includes(_model.className())) {
                            subSelect.where = {
                                [joinOnProp]: {
                                    deleted: false
                                }
                            }
                        }

                        if ('orderBy' in subSelect) {
                            const orderBy = _prepareOrderBy(subSelect.orderBy!);
                            if (Array.isArray(orderBy)) {
                                subSelect.orderBy = orderBy.map(order => ({
                                    [joinOnProp]: order
                                }))
                            } else {
                                subSelect.orderBy = {
                                    [joinOnProp]: orderBy
                                }
                            }
                        }

                        // Distinct operations not supported
                        delete subSelect.distinct;
                        // @ts-expect-error - More unexplainable eldritch types
                        select[attr] = {...subSelect};
                    } else {
                        const key = isInclude ? 'include' : 'select';
                        const joinFields: Partial<Record<keyof ReadAttributes<T1>, boolean>> = {};

                        if (!isInclude && _reverseJoinedFields[_model.className()][model.className()][attribute] != null) {
                            for (const attr in _reverseJoinedFields[_model.className()][model.className()][attribute]) {
                                joinFields[attr as keyof ReadAttributes<T1>] = true;
                            }
                        }
                        // @ts-expect-error - Key is fine, TS just doesn't like it :/
                        select[attr] = {
                            [key]: {[joinOnProp]: true, ...joinFields},
                        }
                    }
                }
            }

            return select;
        }

        return await quickTrace(`${model.className()}#prepareSelect`, async () => {
            return await _internalPrepareSelect(model, {..._select}, isInclude);
        })
    }

    /**
     * Reads a model from the database. This is a performance optimized method that will either run a read with an include or a read with a select based on the attributes passed in.
     * @param model The model to read.
     * @param options The options for reading the model.
     * @param [options.attributes] The attributes to read. If not specified, only the id is read.
     * @param [options.where] The where clause to filter the read.
     * @param [options.orderBy] The order by clause to order the read.
     * @param [options.count] The number of objects to read. If -1, all objects are read.
     * @param [options.offset] The offset to start reading from.
     * @param [options.transaction] The transaction to use for the read.
     * @protected
     */
    protected static async _read<T extends Model<T>, Attrs extends ReadAttributes<T>>(model: IModel<T>, options: ReadOptions<T, Attrs>): Promise<ModelSet<ReadResult<T, Attrs>>> {
        return await quickTrace(`${model.className()}#read`, async (span) => {
            if (!_initialized[model.className()]) {
                Model.initializeProperties(model.className());
            }

            // console.log('Read', model.className(), options);

            const {
                select: _select,
                where,
                orderBy,
                limit,
                offset,
                readOnly,
                count,
                queryStrategy = 'join',
                aiRead,
                forceReadDeleted
            } = options;

            if (_select) {
                _select['id'] = true;
            }

            let useInclude = false;
            const include: {
                [key: string]: boolean | ReadAttributesObject<Model<any>> | ArrayReadAttributes<Model<any>[]>
            } = {};

            const customLoadPromises: Promise<void>[] = [];
            const toLoad: string[] = [];

            if (_select != null) {
                for (const attribute in _select) {
                    const attr = attribute as keyof typeof _select;
                    if (attribute in _joinedFields[model.className()]) {
                        const join = _joinedFields[model.className()][attribute];
                        const tables = Array.isArray(join.joinField)
                            ? join.joinField.map(field => _jointables[model.className()][_jointablesReverse[model.className()][field]])
                            : [_jointables[model.className()][_jointablesReverse[model.className()][join.joinField]]];
                        throw new UnsupportedOperationError(`Attempted to select joined field ${model.className()}.${attribute} directly. This field must be queried through a join using ${englishList(
                            tables.map(jointable => `${jointable.model}.${join.joinField}`),
                            'or'
                        )}.`);
                    } else if (!(attribute in _onload[model.className()]) && (attribute in _wrappers[model.className()] || attribute in _jointables[model.className()] || attribute in _calculatedAttributes[model.className()])) {
                        useInclude = true;
                        include[attribute] = _select[attr]!;
                    } else if (attribute in _onload[model.className()]) {
                        toLoad.push(attribute);
                    }
                }
            }

            span.setAttribute('wrapper.useInclude', useInclude);
            span.setAttribute('wrapper.tsx', currentTsx != null);
            const client = Model.getPrisma();

            const prismaOrderBy = orderBy ? Object.keys(orderBy).map((key) => {
                const prop = key as ModelQueryable<T>
                return {
                    [prop]: orderBy[prop]
                }
            }) : undefined;

            const readHooks = hooks[model.className()].read;
            if (readHooks.before.length > 0) {
                const keys = Object.keys(_select ?? {});
                for (const hook of readHooks.before) {
                    hook.call(this, keys, where, aiRead ?? false);
                }
            }

            let objs: Record<string, any>[] = [];

            let _where = where ? await this.prepareWhere(model, where, forceReadDeleted) : undefined;

            if (SoftDeleteModels.includes(model.className()) && !forceReadDeleted && _where == null) {
                // @ts-expect-error - Should not read deleted models. Key `deleted` exists
                _where = {deleted: false}
            }

            if (useInclude) {
                if (typeof count === 'object') {
                    include['_count'] = {
                        select: count
                    }
                } else if (count) {
                    include['_count'] = true;
                }

                // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                objs = await client[model.className()].findMany({
                    relationLoadStrategy: queryStrategy,
                    where: _where,
                    include: await this.prepareSelect(model, include as ReadAttributes<T>, true, forceReadDeleted),
                    orderBy: prismaOrderBy,
                    take: limit == -1 ? undefined : limit,
                    skip: offset,
                });
            } else {
                const select: Record<string, any> = _select as Record<string, any>;

                if (typeof count === 'object') {
                    select['_count'] = {
                        select: count
                    }
                } else if (count) {
                    select['_count'] = true;
                }

                // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                objs = await client[model.className()].findMany({
                    relationLoadStrategy: queryStrategy,
                    where: _where,
                    select: await this.prepareSelect(model, select, false, forceReadDeleted),
                    orderBy: prismaOrderBy,
                    take: limit == -1 ? undefined : limit,
                    skip: offset,
                });
            }

            if (objs == null || objs.length === 0) {
                return new ModelSet<ReadResult<T, Attrs>>();
            }

            const keys = Object.keys(objs[0]) as ModelQueryable<T>[];
            const vals: ReadResult<T, Attrs>[] = await quickTrace('Data Wrapping', async () => {
                return await Promise.all(objs.map(async (obj: any) => {
                    const newObj = await this._wrap(readOnly ?? false, model, obj, keys);

                    for (const property of toLoad) {
                        customLoadPromises.push(_onload[model.className()][property].call(newObj, obj[property]));
                    }

                    for (const hook of readHooks.after) {
                        hook(keys, newObj, aiRead ?? false);
                    }
                    return newObj as ReadResult<T, Attrs>;
                }))
            });

            span.setAttribute('wrapper.recordCount', vals.length);

            await quickTrace('After Read Hooks & Custom Loading Logic', async () => {
                await Promise.all(customLoadPromises);
            })

            return new ModelSet<ReadResult<T, Attrs>>(vals);
        }) as ModelSet<ReadResult<T, Attrs>>
    }

    protected static async _wrap<T extends Model<T>>(isReadOnly: boolean, model: IModel<T>, initialData: any, attributes: ModelQueryable<T>[]): Promise<T> {
        if (!_initialized[model.className()]) {
            Model.initializeProperties(model.className());
        }

        const {_count, ...data} = initialData;
        const newObj = new model(data.id);
        if (_count) {
            newObj.counts = _count;
        }
        newObj.overrideSetFunctionality = true;
        for (const attribute of attributes) {
            const prop = attribute as ModelAttributes<T>;
            let value = data[attribute];
            if (prop === 'deleted' && SoftDeleteModels.includes(model.className())) {
                newObj._deleted = value;
            } else if (newObj.isWrapped(prop) && value != null) {
                if (data[attribute] instanceof Array) {
                    value = await Promise.all(data[attribute].map(async (val: any) => {
                        const wrapper = _wrappers[model.className()][prop].model;
                        if (typeof wrapper === 'string') {
                            return await Model._wrap(isReadOnly, await Model.getModel(wrapper), val, Object.keys(val) as ModelQueryable<any>[]);
                        } else return await Model._wrap(isReadOnly, wrapper, val, Object.keys(val) as ModelQueryable<any>[]);
                    }))
                } else {
                    const wrapper = _wrappers[model.className()][prop].model;
                    if (typeof wrapper === 'string') {
                        value = await Model._wrap(isReadOnly, await Model.getModel(wrapper), value, Object.keys(value) as ModelQueryable<any>[]);
                    } else value = await Model._wrap(isReadOnly, wrapper, value, Object.keys(value) as ModelQueryable<any>[]);

                    const idProp = _wrappers[model.className()][prop].idProperty as ModelAttributes<T>;
                    if (idProp) {
                        newObj.set(idProp, value.guid);
                        newObj._loadedProperties.add(idProp);
                    }
                }
            } else if (newObj.isEncrypted(prop) && value != null) {
                value = newObj.decryptData(prop, value);
            } else if (attribute in _computedPropertyDependencies[model.className()]) {
                newObj.set(prop, value);
                newObj._loadedProperties.add(prop);
                newObj.recompute(prop);
            } else if (attribute in _jointables[model.className()]) {
                const key = _jointables[model.className()][attribute].joinField;
                const type = await Model.getModel(_jointables[model.className()][attribute].model);
                const models: Model<any>[] = [];

                // Loop over intermediate objects and pull the related object
                for (const intermediate of value) {
                    const target = intermediate[key];
                    const _model = model
                    if (target != null) {
                        // Make first pass for joined fields
                        const joinedFields: Record<string, any> = {}

                        if (_reverseJoinedFields[type.className()][_model.className()] && attribute in _reverseJoinedFields[type.className()][_model.className()]) {
                            for (const attr in intermediate) {
                                if (attr in _reverseJoinedFields[type.className()][_model.className()][attribute]) {
                                    const join = _reverseJoinedFields[type.className()][_model.className()][attribute][attr];

                                    if (intermediate[attr] instanceof Uint8Array) {
                                        intermediate[attr] = Buffer.from(intermediate[attr]);
                                    }

                                    joinedFields[join] = intermediate[attr];
                                }
                            }
                        }

                        const model = await this._wrap(isReadOnly, type, target, Object.keys(target) as ModelQueryable<any>[]);

                        for (const attr in joinedFields) {
                            model.set(attr, joinedFields[attr]);
                        }

                        models.push(model);
                    }
                }

                value = models;
            }

            if (value instanceof Uint8Array) {
                value = Buffer.from(value);
            }

            if (value != null) {
                newObj.set(attribute as ModelAttributes<T>, value);
            }
            newObj._loadedProperties.add(prop);
        }
        newObj.overrideSetFunctionality = false;

        newObj.old = newObj
        newObj._dirty = {};
        newObj._readonly = isReadOnly;

        return newObj as T;
    }

    protected static async _readUnique<T extends Model<T>, Attrs extends ReadAttributes<T>>(model: IModel<T>, options: ReadUniqueOptions<T, Attrs>): Promise<ReadResult<T, Attrs> | null> {
        return await quickTrace(`${model.className()}#readUnique`, async (span) => {
            if (!_initialized[model.className()]) {
                Model.initializeProperties(model.className());
            }

            // console.log('Read Unique', model.className(), options);

            const {
                where,
                readOnly,
                select: _select,
                queryStrategy = 'join',
                count,
                aiRead,
                forceReadDeleted
            } = options;

            const readHooks = hooks[model.className()].read;
            if (readHooks.before.length > 0) {
                const keys = Object.keys(_select ?? {});
                for (const hook of readHooks.before) {
                    hook.call(this, keys, where, aiRead ?? false);
                }
            }

            let useInclude = false;
            const include: {
                [key: string]: boolean | ReadAttributesObject<Model<any>> | ArrayReadAttributes<Model<any>[]>
            } = {};

            const client = Model.getPrisma();
            let obj: Record<string, any> | null = null;

            const customLoadPromises: Promise<void>[] = [];
            const toLoad: string[] = [];

            if (_select != null) {
                for (const attribute in _select) {
                    const attr = attribute as keyof typeof _select;
                    if (attribute in _joinedFields[model.className()]) {
                        const join = _joinedFields[model.className()][attribute];
                        const tables = Array.isArray(join.joinField)
                            ? join.joinField.map(field => _jointables[model.className()][_jointablesReverse[model.className()][field]])
                            : [_jointables[model.className()][_jointablesReverse[model.className()][join.joinField]]];
                        throw new UnsupportedOperationError(`Attempted to select joined field ${model.className()}.${attribute} directly. This field must be queried through a join using ${englishList(
                            tables.map(jointable => `${jointable.model}.${join.joinField}`),
                            'or'
                        )}.`);
                    } else if (!(attribute in _onload[model.className()]) && (attribute in _wrappers[model.className()] || attribute in _jointables[model.className()])) {
                        useInclude = true;
                        include[attribute] = _select[attr]!;
                    } else if (attribute in _onload[model.className()]) {
                        toLoad.push(attribute);
                    }
                }
            }

            span.setAttribute('wrapper.useInclude', useInclude);
            span.setAttribute('wrapper.tsx', currentTsx != null);

            let _where = where ? await this.prepareWhere(model, where, forceReadDeleted) : undefined;
            if (SoftDeleteModels.includes(model.className()) && !forceReadDeleted && _where == null) {
                // @ts-expect-error - Should not read deleted models. Key `deleted` exists
                _where = {deleted: false}
            }

            if (useInclude) {
                if (typeof count === 'object') {
                    include['_count'] = {
                        select: count
                    }
                } else if (count) {
                    include['_count'] = true;
                }

                // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                obj = await client[model.className()].findUnique({
                    relationLoadStrategy: queryStrategy,
                    where: _where,
                    include: await this.prepareSelect(model, include as ReadAttributes<T>, true, forceReadDeleted),
                });
            } else {
                const select: Record<string, any> = _select as Record<string, any>;

                if (typeof count === 'object') {
                    select['_count'] = {
                        select: count
                    }
                } else if (count) {
                    select['_count'] = true;
                }

                // @ts-expect-error - We'll just hope that the prisma client has this class in it.
                obj = await client[model.className()].findUnique({
                    relationLoadStrategy: queryStrategy,
                    where: _where,
                    select: await this.prepareSelect(model, select, false, forceReadDeleted),
                });
            }

            if (!obj) {
                return null;
            }

            const newObj = await quickTrace('Data Wrapping', async () => await this._wrap(readOnly ?? false, model, obj, Object.keys(obj) as ModelQueryable<T>[]))
            for (const property of toLoad) {
                customLoadPromises.push(_onload[model.className()][property].call(newObj, obj[property]));
            }
            const keys = Object.keys(_select ?? {}).filter(key => key !== '_count') as ModelQueryable<T>[];
            for (const hook of readHooks.after) {
                hook(keys, newObj, aiRead ?? false);
            }

            await quickTrace('After Read Hooks & Custom Loading Logic', async () => {
                await Promise.all(customLoadPromises);
            })
            return newObj as ReadResult<T, Attrs>
        })
    }

    protected static async _getById<T extends Model<T>, Attrs extends ReadAttributes<T>>(model: IModel<T>, id: Buffer | string, attributes?: Attrs): Promise<ReadResult<T, Attrs> | null> {
        if (!_initialized[model.className()]) {
            Model.initializeProperties(model.className());
        }

        return await this._readUnique(model, {
            select: attributes,
            where: {
                // @ts-expect-error - id is definitely a valid key but TS doesn't like it
                id: Buffer.isBuffer(id) ? id : Buffer.from(id, 'hex')
            },
        });
    }

    // Properties is mutated, if weird issues occur, this is why
    // private processGraphProperties(properties: { [key: string]: any }) {
    //     for (const key in properties) {
    //         const val = properties[key];
    //         if (val instanceof Date) {
    //             properties[key] = neo4j.types.DateTime.fromStandardDate(val)
    //         }
    //     }
    //     return properties;
    // }


    // protected query_addRelationship<Key extends ModelRelations<T>, Rel extends ModelSetType<T[Key]>>(property: Key, obj: Rel, properties?: {
    //     [key: string]: any
    // }, force?: boolean, span?: MinimalSpan) {
    //     if (this.isDeleted()) {
    //         span?.setAttribute('wrapper.failureFlag', 'deletedObject');
    //         throw new DeletedObjectError('Attempted to modify deleted object')
    //     }
    //     if (obj.isDeleted()) {
    //         span?.setAttribute('wrapper.failureFlag', 'relOtherDeletedObject');
    //         throw new DeletedObjectError('Attempted to add a relationship to a deleted object')
    //     }
    //     if (this.isNew()) {
    //         span?.setAttribute('wrapper.failureFlag', 'uncommittedObject');
    //         throw new UncommitedObjectError('Attempted to add a relationship to an uncommitted object')
    //     }
    //
    //     if (obj.isNew()) {
    //         span?.setAttribute('wrapper.failureFlag', 'relOtherUncommittedObject');
    //         throw new UncommitedObjectError('Attempted to add relationship from a committed object to an uncommitted object')
    //     }
    //
    //     if (!ongdb.models.has(this.className())) {
    //         span?.setAttribute('wrapper.failureFlag', 'graphModelNotFound');
    //         throw new UnsupportedOperationError('Cannot add relationship to object that does not have a graph database model');
    //     }
    //
    //     let _property = property as string;
    //     if (!(_property in _relationships[this.className()] || _property in _reverseGraphProps[this.className()])) {
    //         span?.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //         throw new RelationshipNotFoundError(_property, this.className());
    //     }
    //
    //     if (_property in _reverseGraphProps[this.className()]) {
    //         _property = _reverseGraphProps[this.className()][_property] as ModelQueryable<T>;
    //     }
    //
    //     span?.setAttribute('wrapper.rel.property', _property);
    //
    //     const relationshipType = _relationships[this.className()][_property][0];
    //     if (obj.className() !== relationshipType) {
    //         span?.setAttribute('wrapper.failureFlag', 'relationshipTypeMismatch');
    //         throw new UnsupportedOperationError(`Unsupported relationship type: ${relationshipType}. Expected ${obj.className()} for relationship ${_property}`);
    //     }
    //
    //     span?.setAttribute('wrapper.rel.origin', this.className());
    //     span?.setAttribute('wrapper.rel.target', obj.className());
    //
    //     const model = ongdb.model(this.className());
    //     const relationship = model.relationships().get(_relationships[this.className()][_property][1]);
    //
    //     if (relationship == undefined) {
    //         span?.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //         throw new RelationshipNotFoundError(_relationships[this.className()][_property][1], this.className());
    //     }
    //
    //     const dir = relationship.direction().toLowerCase();
    //     const direction_in = dir == 'in' || dir == 'direction_in' ? '<' : '';
    //     const direction_out = dir == 'out' || dir == 'direction_out' ? '>' : '';
    //
    //     if (force) {
    //         return {
    //             query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${obj.className()} {guid: $to_guid})
    // CREATE (from)${direction_in}-[rel:${relationship.relationship()}${properties ? ` $properties` : ''}]-${direction_out}(to)`,
    //             params: {
    //                 from_guid: this.guid.toString('hex'),
    //                 to_guid: obj.guid.toString('hex'),
    //                 properties: properties ? this.processGraphProperties(properties) : undefined
    //             }
    //         }
    //     } else {
    //         return {
    //             query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${obj.className()} {guid: $to_guid})
    // MERGE (from)${direction_in}-[rel:${relationship.relationship()}]-${direction_out}(to)${properties ? ` ON CREATE SET rel = $properties` : ''}`,
    //             params: {
    //                 from_guid: this.guid.toString('hex'),
    //                 to_guid: obj.guid.toString('hex'),
    //                 properties: properties ? this.processGraphProperties(properties) : undefined
    //             }
    //         }
    //     }
    // }
    //
    // /**
    //  * Adds a relationship to the graph database.
    //  * @param property The property to add the relationship to. (Or the relationship name)
    //  * @param obj The object to add the relationship to.
    //  * @param properties The properties to set on the relationship.
    //  * @param force Force relationship creation even if a relationship of that type exists already
    //  */
    // async addRelationship<Key extends ModelRelations<T>, Rel extends ModelSetType<T[Key]>>(property: Key, obj: Rel, properties?: {
    //     [key: string]: any
    // }, force?: boolean) {
    //     if (this.warnOnRemoteOperation) {
    //         this.logger.warn(`Relationship creation for ${this.className()} is being performed in a batch operation. This is not recommended. Please implement a batch update hook instead.`)
    //     }
    //
    //     await quickTrace(`${this.className()}#addRelationship`, async (span) => {
    //         const query = this.query_addRelationship(property, obj, properties, force, span)
    //         await quickTrace(`${this.className()}#addRelationship execute`, () => ongdb.cypher(query.query, query.params));
    //     })
    // }
    //
    // /**
    //  * Adds multiple relationships to the graph database in a single transaction.
    //  * @param objs The objects to add the relationships to.
    //  * @param property The property to add the relationships to.
    //  * @param mergeKey The key to merge the relationship with. If not specified, the relationship will be created without checking for duplicates.
    //  */
    // async batchAddRelationships<Key extends ModelRelations<T>, Rel extends ModelSetType<T[Key]>>(property: ModelRelations<T>, objs: ModelSet<Rel> | Rel[] | RelationshipModelSet<Rel>, mergeKey?: string) {
    //     await quickTrace(`${this.className()}#batchAddRelationships`, async (span) => {
    //         if (this.isDeleted()) {
    //             span.setAttribute('wrapper.failureFlag', 'deletedObject');
    //             throw new DeletedObjectError('Attempted to modify deleted object')
    //         }
    //         if (this.isNew()) {
    //             span.setAttribute('wrapper.failureFlag', 'uncommittedObject');
    //             throw new UncommitedObjectError('Attempted to add a relationship from an uncommitted object')
    //         }
    //
    //         if (!ongdb.models.has(this.className())) {
    //             span.setAttribute('wrapper.failureFlag', 'graphModelNotFound');
    //             throw new UnsupportedOperationError('Cannot add relationship to object that does not have a graph database model');
    //         }
    //
    //         let _property = property as string;
    //         if (!(_property in _relationships[this.className()] || _property in _reverseGraphProps[this.className()])) {
    //             span.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(_property, this.className());
    //         }
    //
    //         if (_property in _reverseGraphProps[this.className()]) {
    //             _property = _reverseGraphProps[this.className()][_property];
    //         }
    //
    //         span.setAttribute('wrapper.rel.property', _property);
    //
    //         const model = ongdb.model(this.className());
    //         const relationshipType = _relationships[this.className()][_property][0];
    //         const relationship = model.relationships().get(_relationships[this.className()][_property][1]);
    //
    //         if (relationship == undefined) {
    //             span.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(_relationships[this.className()][_property][1], this.className());
    //         }
    //
    //         const isPropertied = RelationshipModelSet.is(objs);
    //
    //         const queries: {
    //             query: string,
    //             params: { from_guid: string, to_guid: string, properties?: { [key: string]: any } }
    //         }[] = [];
    //
    //         await quickTrace('rel.batch.prepare', () => objs.forEach((obj) => {
    //             if (obj.className() !== relationshipType) {
    //                 span.setAttribute('wrapper.failureFlag', 'relationshipTypeMismatch');
    //                 throw new UnsupportedOperationError(`Unsupported relationship type: ${relationshipType}. Expected ${obj.className()} for relationship ${_property}`);
    //             }
    //
    //             const dir = relationship.direction().toLowerCase();
    //             const direction_in = dir == 'in' || dir == 'direction_in' ? '<' : '';
    //             const direction_out = dir == 'out' || dir == 'direction_out' ? '>' : '';
    //
    //
    //             if (isPropertied) {
    //                 if (mergeKey) {
    //                     queries.push(...(objs as RelationshipModelSet<Rel>).getRelationships(obj).map(properties => {
    //                         const mergeValue = properties[mergeKey];
    //                         delete properties[mergeKey];
    //                         return {
    //                             query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${obj.className()} {guid: $to_guid})
    //                     MERGE (from)${direction_in}-[rel:${relationship.relationship()} {${mergeKey}: $mergeValue}]-${direction_out}(to) ON CREATE SET rel = $properties`,
    //                             params: {
    //                                 from_guid: this.guid.toString('hex'),
    //                                 to_guid: obj.guid.toString('hex'),
    //                                 properties: properties ? this.processGraphProperties(properties) : undefined,
    //                                 mergeValue
    //                             }
    //                         }
    //                     }))
    //                 } else {
    //                     queries.push(...(objs as RelationshipModelSet<Rel>).getRelationships(obj).map(properties => {
    //                         return {
    //                             query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${obj.className()} {guid: $to_guid})
    //                     CREATE (from)${direction_in}-[rel:${relationship.relationship()} $properties]-${direction_out}(to)`,
    //                             params: {
    //                                 from_guid: this.guid.toString('hex'),
    //                                 to_guid: obj.guid.toString('hex'),
    //                                 properties: properties ? this.processGraphProperties(properties) : undefined
    //                             }
    //                         }
    //                     }))
    //                 }
    //             } else {
    //                 queries.push({
    //                     query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${obj.className()} {guid: $to_guid})
    //                     MERGE (from)${direction_in}-[rel:${relationship.relationship()}]-${direction_out}(to)`,
    //                     params: {
    //                         from_guid: this.guid.toString('hex'),
    //                         to_guid: obj.guid.toString('hex'),
    //                     }
    //                 })
    //             }
    //         }))
    //
    //         await quickTrace('rel.batch.execute', async () => await ongdb.batch(queries));
    //     })
    // }
    //
    // protected query_updateRelationship<Key extends ModelRelations<T>>(property: Key, value: Buffer | null, old: Buffer | null, otherClass: ModelKeys, properties?: {
    //     [key: string]: any
    // }, where?: {
    //     property: string,
    //     value: any
    // }, force?: boolean, span?: MinimalSpan): GraphQuery[] {
    //     const queries: Array<{
    //         query: string,
    //         params: object
    //     }> = [];
    //
    //     for (const key in properties) {
    //         if (properties[key] === undefined) {
    //             delete properties[key];
    //         }
    //     }
    //
    //     let _property = property as string;
    //     if (!(_property in _relationships[this.className()] || _property in _reverseGraphProps[this.className()])) {
    //         span?.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //         throw new RelationshipNotFoundError(_property, this.className());
    //     }
    //
    //     if (_property in _reverseGraphProps[this.className()]) {
    //         _property = _reverseGraphProps[this.className()][_property] as ModelQueryable<T>;
    //     } else {
    //         _property = _relationships[this.className()][_property][1] as ModelQueryable<T>;
    //     }
    //
    //     span?.setAttribute('wrapper.rel.property', _property);
    //
    //     const model = ongdb.model(this.className());
    //     if (!ongdb.model(this.className()).relationships().has(_property)) {
    //         span?.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //         throw new RelationshipNotFoundError(property, this.className());
    //     }
    //
    //     if (value != null && old != null && value.equals(old) && properties != null) {
    //         // Update properties
    //         const relDef = model.relationships().get(_property)!
    //
    //         const query = `MATCH (origin:${this.className()} {guid: $origin_guid})
    //             ${relDef.direction() === 'in' || relDef.direction() === 'direction_in' ? '<' : ''}-[r:${relDef.relationship()}]-${relDef.direction() === 'out' || relDef.direction() === 'direction_out' ? '>' : ''}(target:${otherClass} {guid: $target_guid})
    //             ${where ? ` WHERE r.${where.property} = $relWhere` : ''} SET r += $properties`
    //
    //         span?.setAttribute('wrapper.rel.updateProperties', true);
    //         queries.push({
    //             query,
    //             params: {
    //                 origin_guid: this.guid.toString('hex'),
    //                 target_guid: value.toString('hex'),
    //                 properties: properties ? this.processGraphProperties(properties) : undefined,
    //                 relWhere: where ? where.value : undefined
    //             }
    //         })
    //     } else {
    //         if (old != null && (old != value || value == null)) {
    //             const relDef = model.relationships().get(_property)!;
    //             const builder = model.query();
    //
    //             builder.match('source', model)
    //                 .relationship(relDef.relationship(), relDef.direction(), 'rel', 0)
    //                 .to('target', ongdb.model(otherClass))
    //                 .where('source.guid', this.guid.toString('hex'))
    //                 .where('target.guid', old.toString('hex'));
    //
    //             if (where) {
    //                 builder.where(`rel.${where.property}`, where.value);
    //             }
    //
    //             builder.delete('rel');
    //             queries.push(builder.build());
    //
    //             span?.setAttribute('wrapper.rel.removeOldRelationship', true);
    //         }
    //
    //         if (value != null) {
    //             span?.setAttribute('wrapper.rel.addNewRelationship', true);
    //
    //             const model = ongdb.model(this.className());
    //             const relationship = model.relationships().get(_property);
    //
    //             if (relationship == undefined) {
    //                 span?.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //                 throw new RelationshipNotFoundError(_relationships[this.className()][_property][1], this.className());
    //             }
    //
    //             const dir = relationship.direction().toLowerCase();
    //             const direction_in = dir == 'in' || dir == 'direction_in' ? '<' : '';
    //             const direction_out = dir == 'out' || dir == 'direction_out' ? '>' : '';
    //
    //             if (force) {
    //                 queries.push({
    //                     query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${this.className()} {guid: $to_guid})
    // CREATE (from)${direction_in}-[rel:${relationship.relationship()}${properties ? ` $properties` : ''}]-${direction_out}(to)`,
    //                     params: {
    //                         from_guid: this.guid.toString('hex'),
    //                         to_guid: value.toString('hex'),
    //                         properties: properties ? this.processGraphProperties(properties) : undefined
    //                     }
    //                 })
    //             } else {
    //                 queries.push({
    //                     query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${this.className()} {guid: $to_guid})
    // MERGE (from)${direction_in}-[rel:${relationship.relationship()}]-${direction_out}(to)${properties ? ` ON CREATE SET rel = $properties` : ''}`,
    //                     params: {
    //                         from_guid: this.guid.toString('hex'),
    //                         to_guid: value.toString('hex'),
    //                         properties: properties ? this.processGraphProperties(properties) : undefined
    //                     }
    //                 })
    //             }
    //
    //         }
    //     }
    //
    //     return queries;
    // }
    //
    // /**
    //  * Update a relationship between two objects.
    //  */
    // async updateRelationship(property: string, value: Buffer | null, old: Buffer | null, otherClass: ModelKeys, properties?: {
    //     [key: string]: any
    // }, where?: {
    //     property: string,
    //     value: any
    // }, force?: boolean) {
    //     if (this.warnOnRemoteOperation) {
    //         this.logger.warn(`Relationship update for ${this.className()} is being performed in a batch operation. This is not recommended. Please implement a batch update hook instead.`)
    //     }
    //
    //     await quickTrace(`${this.className()}#updateRelationship`, async (span) => {
    //         for (const key in properties) {
    //             if (properties[key] === undefined) {
    //                 delete properties[key];
    //             }
    //         }
    //
    //         const graphObj = await ongdb.find(this.className(), this.guid.toString('hex'));
    //
    //         if (!graphObj) {
    //             span.setAttribute('wrapper.failureFlag', 'graphObjectMissing');
    //             throw new ProgrammingError(`Graph object for ${this.className()} (${this._guid.toString('hex')}) not found, that means it was not created when running Model.create()`);
    //         }
    //
    //         let _property = property as string;
    //         if (!(_property in _relationships[this.className()] || _property in _reverseGraphProps[this.className()])) {
    //             span.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(_property, this.className());
    //         }
    //
    //         if (_property in _reverseGraphProps[this.className()]) {
    //             _property = _reverseGraphProps[this.className()][_property] as ModelQueryable<T>;
    //         } else {
    //             _property = _relationships[this.className()][_property][1] as ModelQueryable<T>;
    //         }
    //
    //         span.setAttribute('wrapper.rel.property', _property);
    //
    //         const model = ongdb.model(this.className());
    //         if (!ongdb.model(this.className()).relationships().has(_property)) {
    //             span.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(property, this.className());
    //         }
    //
    //         if (value != null && old != null && value.equals(old) && properties != null) {
    //             // Update properties
    //             const relDef = model.relationships().get(_property)!
    //
    //             const query = `MATCH (origin:${this.className()} {guid: $origin_guid})
    //             ${relDef.direction() === 'in' || relDef.direction() === 'direction_in' ? '<' : ''}-[r:${relDef.relationship()}]-${relDef.direction() === 'out' || relDef.direction() === 'direction_out' ? '>' : ''}(target:${otherClass} {guid: $target_guid})
    //             ${where ? ` WHERE r.${where.property} = $relWhere` : ''} SET r += $properties`
    //
    //             span.setAttribute('wrapper.rel.updateProperties', true);
    //             await quickTrace('rel.update.execute', async () => ongdb.writeCypher(query, {
    //                 origin_guid: this.guid.toString('hex'),
    //                 target_guid: value.toString('hex'),
    //                 properties: properties ? this.processGraphProperties(properties) : undefined,
    //                 relWhere: where ? where.value : undefined
    //             }))
    //         } else {
    //             const promises: Promise<any>[] = [];
    //             if (old != null && (old != value || value == null)) {
    //                 const oldRelationship = await ongdb.find(otherClass, old.toString('hex'));
    //                 if (!oldRelationship) {
    //                     span.setAttribute('wrapper.failureFlag', 'oldRelationshipNotFound');
    //                     throw new ProgrammingError(`Graph object for ${otherClass} not found, that means it was not created when running Model.create()`);
    //                 }
    //
    //                 const relDef = model.relationships().get(_property)!;
    //                 const builder = model.query();
    //
    //                 builder.match('source', model)
    //                     .relationship(relDef.relationship(), relDef.direction(), 'rel', 0)
    //                     .to('target', ongdb.model(otherClass))
    //                     .where('source.guid', this.guid.toString('hex'))
    //                     .where('target.guid', old.toString('hex'));
    //
    //                 if (where) {
    //                     builder.where(`rel.${where.property}`, where.value);
    //                 }
    //
    //                 builder.delete('rel');
    //                 promises.push(builder.execute());
    //
    //                 span.setAttribute('wrapper.rel.removeOldRelationship', true);
    //             }
    //
    //             if (value != null) {
    //                 const newRelationship = await ongdb.find(otherClass, value.toString('hex'));
    //                 if (!newRelationship) {
    //                     span.setAttribute('wrapper.failureFlag', 'newRelationshipNotFound');
    //                     throw new ProgrammingError(`Graph object for ${otherClass} not found, that means it was not created when running Model.create()`);
    //                 }
    //                 span.setAttribute('wrapper.rel.addNewRelationship', true);
    //                 promises.push(graphObj.relateTo(newRelationship, _property, properties, force));
    //             }
    //
    //             await quickTrace('rel.update.execute', async () => Promise.all(promises));
    //         }
    //     })
    // }
    //
    // /**
    //  * Returns the wrapped relationship objects from the graph database.
    //  * @note The result array is reversed since the relationships returned are in the reverse of the order they were added.
    //  * @param property The property to get the relationship for.
    //  * @param directionMod How to modify the relationship direction. If 'reverse', the direction will be reversed. If 'both', the relationship will ignore directionality. If 'unmodified', the directionality will be preserved.
    //  * @param reload Whether to reload the relationship from the database.
    //  * @param includeProperties Whether to include the properties of the relationship objects.
    //  */
    // async getRelation<Key extends ModelRelations<T>, Rel extends ModelSetType<T[Key]>, IncludeProps extends boolean>(property: Key, includeProperties: IncludeProps, directionMod: 'reverse' | 'both' | 'unmodified' = 'unmodified', reload: boolean = false): Promise<TypeTernary<IncludeProps, RelationshipModelSet<Rel>, ModelSet<Rel>>> {
    //     if (this.warnOnRemoteOperation) {
    //         this.logger.warn(`Tried loading ${this.className()}.${property} inside of batch operation. This is not recommended.`)
    //     }
    //
    //     return await quickTrace(`${this.className()}#getRelation`, async (span) => {
    //         if (this.isDeleted() && (!this._loadedProperties.has(property) || reload)) {
    //             span.setAttribute('wrapper.failureFlag', 'deletedObject');
    //             throw new DeletedObjectError('Attempted to remotely read a deleted object')
    //         }
    //         if (this.isNew()) {
    //             span.setAttribute('wrapper.failureFlag', 'uncommittedObject');
    //             throw new UncommitedObjectError('Cannot read relations from uncommitted object')
    //         }
    //
    //         if (!ongdb.models.has(this.className())) {
    //             span.setAttribute('wrapper.failureFlag', 'graphModelNotFound');
    //             throw new UnsupportedOperationError('Cannot get relationship of an object that does not have a graph database model');
    //         }
    //
    //         // Reduce type to string
    //         let _property = property as string;
    //         if (!(_property in _relationships[this.className()] || _property in _reverseGraphProps[this.className()])) {
    //             span.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(_property, this.className());
    //         }
    //
    //         if (_property in _reverseGraphProps[this.className()]) {
    //             _property = _reverseGraphProps[this.className()][_property] as ModelRelations<T>;
    //         }
    //
    //         span.setAttribute('wrapper.rel.property', _property);
    //         const shouldLoad = !this._loadedProperties.has(_property) || reload;
    //
    //         type ReturnType = TypeTernary<IncludeProps, RelationshipModelSet<Rel>, ModelSet<Rel>>;
    //
    //         if (shouldLoad) {
    //             const relationName = _relationships[this.className()][_property][1];
    //
    //             const graphObj = await quickTrace(`rel.fetchOrigin.${this.className()}`, () => ongdb.find(this.className(), this._guid.toString('hex')));
    //             if (!graphObj) {
    //                 span.setAttribute('wrapper.failureFlag', 'originGraphObjectNotFound');
    //                 throw new ProgrammingError(`Origin graph object for ${this.className()} (${this._guid.toString('hex')}) not found, that means it was not created when running Model.create()`);
    //             }
    //             const relation = graphObj.model().schema()[relationName] as RelationshipNodeProperties | RelationshipsNodeProperties
    //
    //             let direction = relation.direction;
    //             if (directionMod === 'reverse') {
    //                 direction = direction === 'out' ? 'in' : 'out';
    //             } else if (directionMod === 'both') {
    //                 direction = 'direction_both'
    //             }
    //
    //             const ret = ['target']
    //             if (includeProperties) {
    //                 ret.push(relationName, 'origin');
    //             }
    //
    //             const query = graphObj.model().query();
    //             query.match('origin', graphObj.model()).where('origin.guid', this._guid.toString('hex'));
    //             query.relationship(relation.relationship, direction, relationName, 0)
    //                 .to('target', ongdb.model(_relationships[this.className()][_property][0]));
    //             query.return(...ret);
    //             const relations = await quickTrace('rel.fetchRelations', async () => query.execute());
    //             const objs: ReturnType = (includeProperties ? new RelationshipModelSet() : new ModelSet()) as ReturnType;
    //             const _constructor = await Model.getModel(_relationships[this.className()][_property][0]);
    //
    //             return quickTrace('parseResults', () => {
    //                 if (relations.records.length === 0) {
    //                     this.overrideSetFunctionality = true;
    //                     if (relation.type === 'relationship') {
    //                         this.logger.warn('I should warn you that this is a stupid thing to do. Please use SQL for one-to-one or one-to-many relationships.');
    //                         this._set(_property as ModelAttributes<T>, objs);
    //                     } else this._set(_property as ModelAttributes<T>, objs);
    //                     this._loadedProperties.add(_property);
    //                     this.overrideSetFunctionality = false;
    //                     return objs;
    //                 }
    //
    //                 // Must be a single relationship if there is no length property
    //                 if (relation.type === 'relationship') {
    //                     this.logger.warn('I should warn you that this is a stupid thing to do. Please use SQL for one-to-one or one-to-many relationships.');
    //                     const target = relations.records[0].get('target').properties;
    //                     const {guid: _guid, ...data} = target;
    //                     const guid = Buffer.from(_guid, 'hex');
    //                     if (includeProperties) {
    //                         const rel = relations.records[0].get(relationName);
    //                         const origin = relations.records[0].get('origin');
    //
    //                         const relOrigin = rel.start.equals(origin.identity) ? origin : target;
    //                         const relTarget = rel.end.equals(origin.identity) ? origin : target;
    //
    //                         (objs as RelationshipModelSet<Rel>).addRelationship(new _constructor(guid, data) as unknown as Rel, {
    //                             ...rel.properties,
    //                             source: relOrigin.properties.guid as string,
    //                             target: relTarget.properties.guid as string
    //                         });
    //                     } else objs.add(new _constructor(guid, data) as unknown as Rel);
    //                 } else {
    //                     for (const relation of relations.records) {
    //                         const target = relation.get('target')
    //                         const {guid: _guid, ...data} = target.properties;
    //                         const guid = Buffer.from(_guid, 'hex');
    //                         if (includeProperties) {
    //                             const rel: Relationship = relation.get(relationName);
    //                             const origin = relation.get('origin');
    //
    //                             const relOrigin = rel.start.equals(origin.identity) ? origin : target;
    //                             const relTarget = rel.end.equals(origin.identity) ? origin : target;
    //
    //                             (objs as RelationshipModelSet<Rel>).addRelationship(new _constructor(guid, data) as unknown as Rel, {
    //                                 ...rel.properties,
    //                                 source: relOrigin.properties.guid as string,
    //                                 target: relTarget.properties.guid as string
    //                             });
    //                         } else objs.add(new _constructor(guid, data) as unknown as Rel);
    //                     }
    //                 }
    //
    //                 this.overrideSetFunctionality = true;
    //                 if (relation.type === 'relationship') {
    //                     this.logger.warn('I should warn you that this is a stupid thing to do. Please use SQL for one-to-one or one-to-many relationships.');
    //                     this._set(_property as ModelAttributes<T>, objs.first());
    //                 } else this._set(_property as ModelAttributes<T>, objs);
    //                 this._loadedProperties.add(_property);
    //                 this.overrideSetFunctionality = false;
    //                 return objs;
    //             })
    //         } else {
    //             return this.get(property) as ReturnType;
    //         }
    //     })
    // }
    //
    // query_deleteRelationship(obj: Model<any>, relationship: ModelRelations<T> | 'all' = 'all', where?: {
    //     property: string,
    //     value: any
    // }, span?: MinimalSpan) {
    //     if (this.isDeleted()) {
    //         span?.setAttribute('wrapper.failureFlag', 'deletedObject');
    //         throw new DeletedObjectError('Attempted to modify deleted object')
    //     }
    //     if (obj.isDeleted()) {
    //         span?.setAttribute('wrapper.failureFlag', 'relOtherDeletedObject');
    //         throw new DeletedObjectError('Attempted to remove a relationship from a deleted object')
    //     }
    //     if (this.isNew()) {
    //         span?.setAttribute('wrapper.failureFlag', 'uncommittedObject');
    //         throw new UncommitedObjectError('Attempted to remove a relationship from an uncommitted object')
    //     }
    //
    //     if (obj.isNew()) {
    //         span?.setAttribute('wrapper.failureFlag', 'relOtherUncommittedObject');
    //         throw new UncommitedObjectError('Attempted to remove relationship from a committed object to an uncommitted object')
    //     }
    //
    //     if (!ongdb.models.has(this.className())) {
    //         span?.setAttribute('wrapper.failureFlag', 'graphModelNotFound');
    //         throw new UnsupportedOperationError('Cannot remove relationship from object that does not have a graph database model');
    //     }
    //
    //     if (relationship === 'all') {
    //         let query = `MATCH (origin:${this.className()} {guid: $origin_guid})-[r]-(target:${this.className()} {guid: $target_guid})`;
    //
    //         if (where) {
    //             query += ` WHERE r.${where.property} = $relWhere`;
    //         }
    //
    //         span?.setAttribute('wrapper.rel.removeAll', true);
    //         query += ` DELETE r`;
    //
    //         return {
    //             query,
    //             params: {
    //                 origin_guid: this.guid.toString('hex'),
    //                 target_guid: obj.guid.toString('hex'),
    //                 relWhere: where ? where.value : undefined
    //             }
    //         }
    //     } else {
    //         let _property = relationship as string;
    //         if (!(_property in _relationships[this.className()] || _property in _reverseGraphProps[this.className()])) {
    //             span?.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(_property, this.className());
    //         }
    //
    //         if (_property in _reverseGraphProps[this.className()]) {
    //             _property = _reverseGraphProps[this.className()][_property] as ModelQueryable<T>;
    //         } else {
    //             _property = _relationships[this.className()][_property][1] as ModelQueryable<T>;
    //         }
    //
    //         const model = ongdb.model(this.className());
    //         const builder = model.query();
    //         builder.match('origin', ongdb.model(this.className())).where('origin.guid', this.guid.toString('hex'));
    //
    //         if (!model.relationships().has(_property)) {
    //             span?.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(_property, this.className());
    //         }
    //
    //         const relDef = model.relationships().get(_property)!;
    //         builder.relationship(relDef, relDef.direction(), 'rel', 0)
    //             .to('target', ongdb.model(obj.className()))
    //             .where('target.guid', obj.guid.toString('hex'));
    //
    //         if (where) {
    //             builder.where(`rel.${where.property}`, where.value);
    //         }
    //
    //         builder.delete('rel');
    //         span?.setAttribute('wrapper.rel.usedBuilder', true);
    //         return builder.build();
    //     }
    // }
    //
    // /**
    //  * Removes the specified relationship (or all) from the graph database with the specified model.
    //  * @param obj The object to remove the relationship(s) with.
    //  * @param relationship The name of the relationship to remove or all
    //  * @param where The where clause to filter the relationship to remove
    //  */
    // async removeRelationship(obj: Model<any>, relationship: ModelRelations<T> | 'all' = 'all', where?: {
    //     property: string,
    //     value: any
    // }) {
    //     if (this.warnOnRemoteOperation) {
    //         this.logger.warn(`Relationship deletion for ${this.className()} is being performed in a batch operation. This is not recommended. Please implement a batch update hook instead.`)
    //     }
    //
    //     await quickTrace(`${this.className()}.removeRelationship`, async (span) => {
    //         const query = this.query_deleteRelationship(obj, relationship, where, span)
    //         await quickTrace(`${this.className()}.removeRelationship#execute`, () => ongdb.cypher(query.query, query.params));
    //     })
    // }
    //
    // /**
    //  * Removes multiple relationships from the graph database.
    //  * @param property The property to remove the relationships with.
    //  * @param objs The objects to remove the relationships with.
    //  */
    // async batchRemoveRelationships<Key extends ModelRelations<T>, Rel extends ModelSetType<T[Key]>>(property: Key, objs: ModelSet<Rel> | Rel[]) {
    //     await quickTrace(`${this.className()}#batchRemoveRelationships`, async (span) => {
    //         if (this.isDeleted()) {
    //             span.setAttribute('wrapper.failureFlag', 'deletedObject');
    //             throw new DeletedObjectError('Attempted to modify deleted object')
    //         }
    //         if (this.isNew()) {
    //             span.setAttribute('wrapper.failureFlag', 'uncommittedObject');
    //             throw new UncommitedObjectError('Attempted to remove a relationship from an uncommitted object')
    //         }
    //
    //         if (!ongdb.models.has(this.className())) {
    //             span.setAttribute('wrapper.failureFlag', 'graphModelNotFound');
    //             throw new UnsupportedOperationError('Cannot remove relationship from object that does not have a graph database model');
    //         }
    //
    //         let _property = property as string;
    //         if (!(_property in _relationships[this.className()] || _property in _reverseGraphProps[this.className()])) {
    //             throw new RelationshipNotFoundError(_property, this.className());
    //         }
    //
    //         if (_property in _reverseGraphProps[this.className()]) {
    //             _property = _reverseGraphProps[this.className()][_property];
    //         }
    //
    //         span.setAttribute('wrapper.rel.property', _property);
    //
    //         const model = ongdb.model(this.className());
    //         const relationshipType = _relationships[this.className()][_property][0];
    //         const relationship = model.relationships().get(_relationships[this.className()][_property][1]);
    //
    //         if (relationship == undefined) {
    //             span.setAttribute('wrapper.failureFlag', 'relationshipNotFound');
    //             throw new RelationshipNotFoundError(_relationships[this.className()][_property][1], this.className());
    //         }
    //
    //         const queries: {
    //             query: string,
    //             params: { from_guid: string, to_guid: string }
    //         }[] = await quickTrace('rel.batch.prepare', () => objs.map((obj) => {
    //             if (obj.className() !== relationshipType) {
    //                 throw new UnsupportedOperationError(`Unsupported relationship type: ${relationshipType}. Expected ${obj.className()} for relationship ${_property}`);
    //             }
    //
    //             const dir = relationship.direction().toLowerCase();
    //             const direction_in = dir == 'in' || dir == 'direction_in' ? '<' : '';
    //             const direction_out = dir == 'out' || dir == 'direction_out' ? '>' : '';
    //
    //             return {
    //                 query: `MATCH (from:${this.className()} {guid: $from_guid}), (to:${obj.className()} {guid: $to_guid})
    //             MERGE (from)${direction_in}-[rel:${relationship.relationship()}]-${direction_out}(to)
    //             DELETE rel`,
    //                 params: {
    //                     from_guid: this.guid.toString('hex'),
    //                     to_guid: obj.guid.toString('hex')
    //                 }
    //             }
    //         }));
    //
    //         await quickTrace('rel.batch.execute', async () => await ongdb.batch(queries));
    //     })
    // }

    public static async _count<T extends Model<T>>(model: IModel<T>, where?: ReadWhere<T>, forceReadDeleted = false): Promise<number> {
        return await quickTrace(`${model.className()}#count`, async () => {
            if (!_initialized[model.className()]) {
                Model.initializeProperties(model.className());
            }

            for (const attr in where) {
                const prop = attr as ModelQueryable<T>
                if (_encryptedProperties[model.className()] != null && attr in _encryptedProperties[model.className()]) {
                    // @ts-expect-error - Encrypted fields are strings in DB
                    where[prop] = encryptData(where[prop])
                } else if (_uniqueEncryptedProperties[model.className()] != null && attr in _uniqueEncryptedProperties[model.className()]) {
                    throw new Error('Unique encrypted properties cannot be used in where clauses')
                }
            }

            const client = Model.getPrisma();

            let _where = where ? await this.prepareWhere(model, where, forceReadDeleted) : undefined;

            if (SoftDeleteModels.includes(model.className()) && !forceReadDeleted && where == null) {
                // @ts-expect-error - Valid key
                _where = {deleted: false}
            }

            // @ts-expect-error - We'll just hope that the prisma client has this class in it.
            return client[model.className()].count({
                where: _where
            });
        })
    }

    protected static async _exists<T extends Model<T>>(model: IModel<T>, where?: ReadWhere<T>, forceReadDeleted = false): Promise<boolean> {
        return await quickTrace(`${model.className()}#exists`, async () => {
            if (!_initialized[model.className()]) {
                Model.initializeProperties(model.className());
            }

            for (const attr in where) {
                const prop = attr as ModelQueryable<T>
                if (_encryptedProperties[model.className()] != null && attr in _encryptedProperties[model.className()]) {
                    // @ts-expect-error - Encrypted fields are strings in DB
                    where[prop] = encryptData(where[prop])
                } else if (_uniqueEncryptedProperties[model.className()] != null && attr in _uniqueEncryptedProperties[model.className()]) {
                    throw new Error('Unique encrypted properties cannot be used in where clauses')
                }
            }

            const client = Model.getPrisma();

            let _where = where ? await this.prepareWhere(model, where, forceReadDeleted) : undefined;

            if (SoftDeleteModels.includes(model.className()) && !forceReadDeleted && where == null) {
                // @ts-expect-error - Valid key
                _where = {deleted: false}
            }

            // @ts-expect-error - We'll just hope that the prisma client has this class in it.
            return await client[model.className()].findFirst({
                where: _where,
                select: {
                    id: true
                }
            }) != null;
        })
    }

    static className(): ModelKeys {
        throw new ProgrammingError('className not implemented')
    }

    className(): ModelKeys {
        return (this.constructor as typeof Model<T>).className();
    }

    // isGraphObject() {
    //     return ongdb.models.has(this.className());
    // }

    setKey() {
        return this.guid.toString('hex');
    }

    public static isInstance(obj: any): obj is Model<any> {
        if (typeof obj === 'object' && obj != null) {
            return obj.hasOwnProperty('_guid') && obj.hasOwnProperty('_new');
        }
        return false;
    }

    public static isModelArray(obj: any): obj is Model<any>[] {
        return Array.isArray(obj) && Model.isInstance(obj[0]);
    }

    public instanceString() {
        return `${this.className()} ${this.guid.toString('hex')}`;
    }

    protected batchResult(result: PrismaPromise<any> | PrismaPromise<any>[]): BatchResult {
        return {
            internal_isBatchMarker: true,
            result
        }
    }

    set old(old: T) {
        if (!old.guid.equals(this.guid)) {
            throw new Error('The same object was NOT passed in');
        }
        const _old = {} as Record<string, any>;

        for (const prop of this._loadedProperties) {
            if (!old.isLoaded(prop as ModelAttributes<T>)) {
                throw new ProgrammingError(`Property ${prop} was not loaded in compared object`);
            }
            _old[prop] = old.get(prop as ModelAttributes<T>);
        }

        this._old = _old;
    }
}

export const models: Partial<{ [key in ModelKeys]: IModel<any> }> = {}