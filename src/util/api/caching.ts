import {Model} from "~/db/sql/SQLBase";
import ModelSet from "~/util/db/ModelSet";
import {revalidateTag, unstable_cache} from "next/cache";
import {ModelKeys} from "~/db/sql/keys";
import {trace} from "@opentelemetry/api";
import {CachedObject} from "~/db/sql/types/utility";

// const revalidateTag = () => {}
//
// const unstable_cache = (func: any) => {
//     return func;
// }

export async function objFromCache<T extends Model<T>>(obj: CachedObject<T> | T): Promise<T> {
    if (Model.isInstance(obj)) {
        return obj;
    }
    const className: ModelKeys = obj.className as ModelKeys;

    const data: Record<string, any> = {};
    let guid: Buffer | null = null;

    for (const key in obj) {
        const val = obj[key as keyof typeof obj];

        if (val == null) {
            data[key] = null;
        }

        if (typeof val === 'object' && 'type' in val! && val.type === 'Buffer' && 'data' in val) {
            if (key === 'guid') {
                guid = Buffer.from(val!.data as number[]);
            } else data[key] = Buffer.from(val!.data as number[]);
        } else if (typeof val === 'object' && 'className' in val!) {
            data[key] = await objFromCache(val as unknown as CachedObject<Model<any>>);
        } else if (typeof val === 'object' && '_set' in val!) {
            data[key] = await modelSetFromCache(val as unknown as CachedObject<ModelSet<Model<any>>>);
        } else if (Array.isArray(val) && (val as Array<unknown>).every(a => typeof a === 'object' && 'className' in a!)) {
            data[key] = await Promise.all((val as Array<CachedObject<Model<any>>>).map(async (a: any) => {
                return objFromCache(a);
            }))
        } else {
            data[key] = val;
        }
    }

    if (guid == null) {
        throw new Error('Cached object has no guid');
    }

    const model = await Model.getModel(className);
    return new model(guid, data) as T;
}

export async function modelSetFromCache<T extends Model<T>>(objs: CachedObject<ModelSet<T>> | ModelSet<T>): Promise<ModelSet<T>> {
    if (ModelSet.isModelSet(objs)) {
        return objs as ModelSet<T>;
    }

    const set = new ModelSet<T>();
    // @ts-expect-error - We know that `_set` property exists, it's just private
    const rawSet: { [guid: string]: CachedObject<T> } = objs._set;

    for (const guid in rawSet) {
        const obj = rawSet[guid];
        set.add(await objFromCache(obj));
    }
    return set;
}

export function cacheThis<T, Args extends any[]>(func: (...args: Args) => Promise<T>, friendlyName: string,  tags: CacheTags[], cacheLifeParam?: {
    stale?: number,
    revalidate?: number,
    expire?: number
}): (...args: Args) => Promise<CachedObject<T>> {
    return unstable_cache(async (...args: Args) => {
        // 'use cache';
        // unstable_cacheTag(...tags);
        if (cacheLifeParam) {
            // unstable_cacheLife(...cacheLifeParam);
        }
        return trace.getTracer('converse-crm').startActiveSpan(`Cached ${friendlyName}`, async () => {
            return await func(...args);
        });
    }, [friendlyName, ...tags], {
        tags: tags,
        revalidate: cacheLifeParam?.revalidate,
    }) as (...args: Args) => Promise<CachedObject<T>>;
}

export async function revalidateCache(tag: CacheTags | CacheTags[]) {
    if (Array.isArray(tag)) {
        for (const t of tag) {
            revalidateTag(t);
        }
    } else {
        revalidateTag(tag);
    }
}

export type CacheTags =
    | 'tokenValid'