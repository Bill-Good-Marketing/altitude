import {Model} from "~/db/sql/SQLBase";
import ModelSet, {ModelSetData} from "~/util/db/ModelSet";
import {ModelKeys} from "~/db/sql/keys";
import {ReadAttributes, ScalarFields} from "~/db/sql/types/select";
import {ReadWhere} from "~/db/sql/types/where";
import {Else, ElseIf, EnsureNull, Extends, ExtendsIgnoreNull, GetElementType, If, NativeType, QueryStrategy, Then, TypeSwitch} from "~/db/sql/types/utility";

type NonFunctionPropertyNames<T> = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    [K in Exclude<keyof T, '_cache'>]: T[K] extends Function | undefined ? never : K
}[Exclude<keyof T, '_cache'>];

type ProtectedKeys =
    keyof Model<any>
    | '_guid'
    | '_transaction'
    | '_deleted'
    | 'overrideSetFunctionality'
    | '_dirty'
    | '_old'
    | '_new'
    | 'new'
    | '_cache'
    | '_loadedProperties'
    | '_readonly'
    | '_dirtySubModels'

// Attributes for get/set
export declare type ModelAttributes<T> = Exclude<NonFunctionPropertyNames<T>, symbol | number | ProtectedKeys>
export declare type ModelQueryable<T> =
    Exclude<ModelAttributes<T>, keyof Model<any> | 'new' | 'package' | 'warnOnRemoteOperation'> | 'id'
export declare type ModelRelations<T> = {
    [K in ModelAttributes<T>]: T[K] extends ModelSet<any> | undefined ? K : never
}[ModelAttributes<T>]

export declare type ReadOrder<T> = { [key in ModelQueryable<T>]?: 'asc' | 'desc' | ObjectReadOrder<Exclude<T[key], null | undefined>> }

type ObjectReadOrder<T> = T extends Model<any> ? ReadOrder<T> : T extends Array<Model<any>> ? never : never

type ScalarCount<T> = T extends string | number | Date | Buffer | boolean ? never : T;
type Counts<T> = Partial<{
    [key in keyof T]: T[key] extends (Model<any> | undefined) ? number :
        (T[key] extends (Model<any>[] | undefined) ? number : ScalarCount<T[key]>)
}>
type CountSelect<T> = Partial<{
    [key in Exclude<ModelQueryable<T>, 'id' | 'guid'>]?: T[key] extends (Model<any> | undefined) ? boolean | {
        where?: ReadWhere<Exclude<T[key], undefined>>,
    } :
        (T[key] extends (Model<any>[] | undefined) ? boolean | {
            where?: ReadWhere<GetElementType<Exclude<T[key], undefined>>>,
        } : never)
}>

export interface ReadOptions<T extends Model<T>, Attributes extends ReadAttributes<T> | undefined> {
    select?: Attributes,
    limit?: number,
    offset?: number,
    orderBy?: ReadOrder<T>,
    where?: ReadWhere<T>,
    readOnly?: boolean,
    count?: CountSelect<T> | boolean
    queryStrategy?: QueryStrategy
    aiRead?: boolean
    forceReadDeleted?: boolean
}

export interface ReadUniqueOptions<T extends Model<T>, Attributes extends ReadAttributes<T> | undefined> {
    where: ReadWhere<T>;
    readOnly?: boolean,
    select?: Attributes,
    count?: CountSelect<T> | boolean
    queryStrategy?: QueryStrategy
    aiRead?: boolean,
    forceReadDeleted?: boolean
}

export declare type SearchResult<T extends Model<T>, Attrs extends ReadAttributes<T> | undefined> = [ModelSet<ReadResult<T, Attrs>>, number];

/**
 * Due to TypeScript constraints, the typing strictness has been reduced to `any` for read operations.
 * This does NOT mean that a read operation will return anything other than a read result!
 * The implementation of the read operations (read, search, readUnique, getById) should return the appropriate type based on
 * `SQLBase._read`, `SearchResult<T, Attrs>`, `SQLBase._readUnique`, and `SQLBase._getById`, respectively.
 *
 * Furthermore, the `generateModels.ts` file already populates the function definitions for these methods.
 *
 * @see SQLBase._read
 * @see SQLBase._readUnique
 * @see SQLBase._getById
 */
export interface IModel<T extends Model<T>> {
    new(id?: Buffer | string, data?: any): T

    /**
     * The model name as defined in prisma client.
     */
    className: () => ModelKeys;

    read<Attributes extends ReadAttributes<T>>(options: ReadOptions<T, Attributes>): Promise<ModelSet<any>>;

    search<Attributes extends ReadAttributes<T>>(searchString: string, select: Attributes, count: number, offset: number, tenetId?: Buffer, sortBy?: ReadOrder<T>): Promise<any>;

    readUnique<Attributes extends ReadAttributes<T>>(options: ReadUniqueOptions<T, Attributes>): Promise<any | null>;

    count(where?: ReadWhere<T>): Promise<number>;

    exists(where?: ReadWhere<T>): Promise<boolean>;

    getById<Attrs extends ReadAttributes<T>>(id: Buffer | string, select?: Attrs): Promise<any | null>;
}

export declare type ReadResult<T extends Model<any>, Attributes extends ReadAttributes<T> | undefined> =
    If<Extends<Attributes, undefined>, Then<T>, Else<{
        [key in Exclude<keyof T, keyof ModelSetData>]-?: If<Extends<key, keyof Attributes>, Then<If<ExtendsIgnoreNull<T[key], Function>,
            T[key],
            ElseIf<ExtendsIgnoreNull<T[key], Array<Model<any>>>,
                ReadSubResult<Exclude<T[key], undefined | null>[number], Attributes[key]>[],

            ElseIf<ExtendsIgnoreNull<T[key], Model<any>>,
                Exclude<EnsureNull<T[key], ReadSubResult<Exclude<T[key], undefined | null>, Attributes[key]>>, undefined>,

            ElseIf<ExtendsIgnoreNull<T[key], NativeType>, Exclude<T[key], undefined>,
                Else<never>>>>>>, Else<T[key]>>
    }>>
    & ModelSetData

export declare type ReadSubResult<T extends Model<any>, Select extends boolean | { select?: ReadAttributes<T> }> =
    TypeSwitch<true, [
        [Select, MakeDefined<T, ScalarFields<T>> & Model<any>],
        [Extends<Select['select'], undefined>, MakeDefined<T, ScalarFields<T>> & Model<any>],
        [Extends<Select['select'], ReadAttributes<T>>, ReadResult<T, Select['select']>]
    ]>

export declare type MakeDefined<T, Keys> = {
    [K in keyof T]-?: If<Extends<K, Keys>, Then<Exclude<T[K], undefined>>, Else<T[K]>>
}