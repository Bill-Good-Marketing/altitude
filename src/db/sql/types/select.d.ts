import {PickByValue} from "utility-types";
import {Model} from "~/db/sql/SQLBase";
import {ReadWhere} from "~/db/sql/types/where";
import ModelSet from "~/util/db/ModelSet";
import {ModelQueryable, ProtectedKeys, ReadOrder} from "~/db/sql/types/model";
import {GetElementType, NativeType} from "~/db/sql/types/utility";

export declare type ScalarFields<T> = keyof PickByValue<Omit<T, ProtectedKeys>, string | number | Date | Buffer | boolean | undefined>
export declare type IncludeAttribute<T> = Partial<{
    [key in Exclude<ModelQueryable<T>, 'id' | 'guid'>]?: T[key] extends (Model<any> | undefined | null) ? (ReadAttributesObject<Exclude<T[key], undefined | null>> | boolean) :
        (T[key] extends (Model<any>[] | undefined | null) ? ArrayReadAttributes<Exclude<T[key], undefined | null>> | boolean : never)
}>;
export declare type ArrayReadAttributes<T extends Array<Model<any>>> = {
    include?: IncludeAttribute<GetElementType<T>>,
    where?: ReadWhere<GetElementType<T>>
    select?: ReadAttributes<GetElementType<T>>
    distinct?: ScalarFields<GetElementType<T>>[] | ScalarFields<GetElementType<T>>,
    orderBy?: ReadOrder<GetElementType<T>>[] | ReadOrder<GetElementType<T>>
    take?: number,
    skip?: number
}
type ScalarSelect<T> = T extends NativeType | Array<NativeType> ? boolean : T;
export declare type ReadAttributes<T> = Partial<{
    [key in Exclude<ModelQueryable<T>, 'id' | 'guid'>]?: T[key] extends (Model<any> | undefined | null)
        // Single model
        ? (ReadAttributesObject<Exclude<T[key], undefined | null>> | boolean) :

        // Array of models
        (T[key] extends (Model<any>[] | undefined | null)
            ? ArrayReadAttributes<Exclude<T[key], undefined | null>> | boolean :
            // Want to exclude relationships
            T[key] extends ModelSet<any> | undefined ? never
                // Otherwise, scalar field
                : ScalarSelect<Exclude<T[key], undefined>>)
}> & { id?: boolean } 
export declare type ReadAttributesObject<T> = {
    select?: ReadAttributes<T>
    include?: IncludeAttribute<T>
    where?: ReadWhere<T>
}