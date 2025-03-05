import {Model} from "~/db/sql/SQLBase";
import {LogLevel} from "~/common/enum/serverenums";
import {PrismaPromise} from "@prisma/client";


// export declare type GraphQuery = { query: string, params: object }
export declare type BatchResult = {
    internal_isBatchMarker: true,
    result: PrismaPromise<any> | PrismaPromise<any>[]
} // Prisma request or neo4j query

export declare type HookType = 'update' | 'create' | 'delete' | 'read';
export declare type HookWhen = 'before' | 'after';
export declare type BeforeUpdateHookFunction = (property: string, value: any, oldValue: any, isBatch: boolean) => Promise<boolean | LogLevel | BatchResult>;
export declare type AfterUpdateHookFunction = (property: string, value: any, oldValue: any, isBatch: boolean) => Promise<void | undefined | BatchResult>;

export declare type CreateHookFunction = (isBatch: boolean) => Promise<BatchResult | void | undefined>;

export declare type BeforeDeleteHookFunction = () => Promise<boolean>;
export declare type AfterDeleteHookFunction = () => Promise<void | undefined | BatchResult>;

export declare type BeforeReadHookFunction = (properties: string[], where: any, aiRead: boolean) => void;
export declare type AfterReadHookFunction<T extends Model<T>> = (properties: string[], obj: T, aiRead: boolean) => void;

export declare type HookFunction<T extends HookType, W extends HookWhen> =
    T extends 'update' ? (W extends 'before' ? BeforeUpdateHookFunction : AfterUpdateHookFunction)
    : T extends 'create' ? CreateHookFunction
    : T extends 'delete' ? (W extends 'before' ? BeforeDeleteHookFunction : AfterDeleteHookFunction)
    : T extends 'read' ? (W extends 'before' ? BeforeReadHookFunction : AfterReadHookFunction)
    : never;