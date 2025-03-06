import {OmitByValue} from "utility-types";
import {Model} from "~/db/sql/SQLBase";
import ModelSet from "~/util/db/ModelSet";
import {ModelKeys} from "~/db/sql/keys";
import {ToastResponse} from "~/util/api/client/APIClient";
import {ProtectedKeys} from "~/db/sql/types/model";
import {ReadAttributes} from "~/db/sql/types/select";

export declare type ValueType<K, T> = K extends keyof T ? T[K] : never;

type GetElementType<T extends any[]> = T extends (infer U)[] ? U : never | undefined;

type NativeType = string | number | Date | Buffer | boolean | string[] | number[];

export declare type QueryStrategy = 'query' | 'join';

// When caching, a model set is reduced to a generic JSON object and loses all of its class methods.

export declare type CachedObject<T> = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    [P in keyof T as T[P] extends Function ? never : P]: T[P] extends object ? CachedObject<T[P]> : T[P];
} & { className: ModelKeys }

export declare type TypeTernary<T extends boolean | undefined, True, False> = T extends true ? True : False;
export declare type ModelSetType<T> = Exclude<T, undefined> extends ModelSet<infer U> ? U : never;

export declare type TypeKey<T, U> = keyof {
    [K in keyof T as T[K] extends U ? K : never]: T[K]
}

export declare type OmitTypeKey<T, U> = keyof {
    [K in keyof T as T[K] extends U ? never : K]: T[K]
}

type ClientReadKeyExclusion = Exclude<ProtectedKeys, 'guid'> | 'tenetId' | 'tenet'

type EnsureNull<Original, Transformed> = Original extends null ? Transformed | null : Transformed;

export declare type ClientReadAttributes<T> = Exclude<OmitTypeKey<Omit<ReadAttributes<T>, 'tenetId' | 'tenet'>, ModelSet<any> | undefined>, 'id'>

export declare type ClientReadResult<T, Keys extends ClientReadAttributes<T>[]> = Required<{
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    [P in Keys[number] | 'guid']: T[P] extends Buffer ? string :
        Exclude<T[P], undefined | null> extends Array<infer U> ? Array<ClientReadSubResult<Omit<U, ClientReadKeyExclusion>>> :
            Exclude<T[P], undefined | null> extends object ? EnsureNull<T[P], ClientReadSubResult<Omit<Exclude<T[P], undefined | null>, ClientReadKeyExclusion>>> : Exclude<T[P], undefined>;
}>;

export declare type ClientReadSubResult<T> = Required<OmitByValue<{
    [P in keyof T]: T[P] extends Buffer ? string : Exclude<T[P], undefined>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
}, Model<any> | Array<Model<any>> | ModelSet<any> | Function>>;
// Unwraps the result of the read function

export declare type ClientSideReadResult<T extends (...args: any[]) => Promise<[ClientReadResult<any, any>[], number] | ToastResponse>> = Exclude<Awaited<ReturnType<T>>, ToastResponse>[0][number];

export type If<T extends boolean | undefined, Then, Else> = T extends true ? Then : Else;

// Syntactic sugar for if statements
export type Then<T> = T;
export type Else<T> = T;

export type ElseIf<T extends boolean | undefined, Then, Else> = T extends true ? Then : Else;

export type Extends<T, U> = [T] extends [U] ? true : false;
export type ExtendsIgnoreNull<T, U> = [Exclude<T, null | undefined>] extends [U] ? true : false;

type TypeSwitch<Input, Cases extends [any, any][]> =
    Cases extends [infer Case, ...infer Rest]
        ? Case extends [infer CaseType, infer Result]
            ? Input extends CaseType
                ? Result
                : Rest extends [any, any][]
                    ? TypeSwitch<Input, Rest>
                    : never
            : never
        : never;

type test = TypeSwitch<Array<Model<any>> | undefined | null, [[Model<any>, 1], [Array<Model<any>>, 3]]>;