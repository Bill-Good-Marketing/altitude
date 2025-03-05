/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {persisted, wrap, required} from '~/db/sql/decorators';
import {TestObject} from '~/db/sql/models/TestObject';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type WrappedObjectDefaultData = {
	persisted?: string | null;
	testObject?: TestObject;
	testObjectId?: Buffer
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type WrappedObjectData = WrappedObjectDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class WrappedObject extends Model<WrappedObject> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @persisted declare public persisted?: string | null;
	@wrap('testObject', 'wrapped', 'testObjectId', true, false) declare public testObject?: TestObject;
	@required declare public testObjectId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: WrappedObjectData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<WrappedObject>>(options: ReadOptions<WrappedObject, Attrs>): Promise<ModelSet<ReadResult<WrappedObject, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<WrappedObject>>(options: ReadUniqueOptions<WrappedObject, Attrs>): Promise<ReadResult<WrappedObject, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<WrappedObject>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<WrappedObject>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<WrappedObject>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<WrappedObject, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<WrappedObject>>(): Promise<SearchResult<WrappedObject, Attrs>> {
        return [new ModelSet(), 0]
    }
    
    static className = (): ModelKeys => 'wrappedObject';
}

models.wrappedObject = WrappedObject;
        