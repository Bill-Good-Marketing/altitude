import {Model} from "~/db/sql/SQLBase";
import {ModelQueryable} from "~/db/sql/types/model";
import {GetElementType} from "~/db/sql/types/utility";

type ComparativeStringWhere = {
    equals?: string
    startsWith?: string
    endsWith?: string
    mode?: 'default' | 'insensitive'
    contains?: string
    lt?: string
    lte?: string
    gt?: string
    gte?: string
    in?: string[],
    notIn?: string[],
    not?: Omit<ComparativeStringWhere, 'mode'> | string
};
type ComparativeNumericWhere<T> = {
    equals?: T,
    lt?: T,
    lte?: T,
    gt?: T,
    gte?: T,
    in?: T[],
    notIn?: T[]
    not?: ComparativeNumericWhere<T> | T
};
type StandardWhere<T> = T extends null ? NonNullStandardWhere<Exclude<T, null>> | null : NonNullStandardWhere<T>;
type NonNullStandardWhere<T> = T extends string ? (T | ComparativeStringWhere) : T extends (number | Date) ? (ComparativeNumericWhere<T> | T) : T extends Buffer ? BufferWhere : T;
type ModelArrayWhere<T extends Array<Model<any>>> = {
    some?: ReadWhere<GetElementType<T>>,
    none?: ReadWhere<GetElementType<T>>,
    all?: ReadWhere<GetElementType<T>>
}
export declare type Where<T> = Partial<{
    [key in Exclude<ModelQueryable<T>, 'id' | 'guid'>]?: T[key] extends (Model<any> | undefined | null) ? (ReadWhere<Exclude<T[key], undefined | null>>) :
        (T[key] extends (Model<any>[] | undefined | null) ? ModelArrayWhere<Exclude<T[key], undefined | null>> : StandardWhere<Exclude<T[key], undefined>>)
}>
type BufferWhere = Buffer | {
    equals?: Buffer
    in?: Buffer[]
    notIn?: Buffer[]
    not?: BufferWhere
}
export declare type WhereId = { id?: BufferWhere }
export declare type ReadWhere<T> = Where<T> & WhereId & { OR?: ReadWhere<T>[] } & { AND?: ReadWhere<T>[] } & { NOT?: ReadWhere<T>[] | ReadWhere<T> }