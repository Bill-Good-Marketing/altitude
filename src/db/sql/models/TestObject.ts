/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, wrap, jointable, join} from '~/db/sql/decorators';
import {WrappedObject} from '~/db/sql/models/WrappedObject';
import {JoinedObject1} from '~/db/sql/models/JoinedObject1';
import {JoinedObject2} from '~/db/sql/models/JoinedObject2';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type TestObjectDefaultData = {
	required?: string;
	persisted?: string | null;
	wrapped?: WrappedObject[];
	joinProperty1?: string;
	join1?: JoinedObject1[];
	joinProperty2?: string;
	joinId?: Buffer;
	join2?: JoinedObject2[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type TestObjectData = TestObjectDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class TestObject extends Model<TestObject> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public required?: string;
	@persisted declare public persisted?: string | null;
	@wrap('wrappedObject', 'testObject', 'testObjectId', false, true) declare public wrapped?: WrappedObject[];
	
	@jointable('joinedObject1', 'joinedObjectRelation', 'testObjectId', 'joinedObjectId', 'testObjectId_joinedObjectId', 'testObjects')
	declare public join1?: JoinedObject1[];
	
	@join('joinProperty', 'testObjects', 'joinedObject1')
	declare public joinProperty1?: string;
	
	@jointable('joinedObject2', 'joinedObjectRelation', 'testObjectId', 'joinedObjectId', true, 'testObjects')
	declare public join2?: JoinedObject2[];
	
	@join('joinProperty', 'testObjects', 'joinedObject2')
	declare public joinProperty2?: string;
	
	@join('id', 'testObjects', 'joinedObject2')
	declare public joinId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: TestObjectData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<TestObject>>(options: ReadOptions<TestObject, Attrs>): Promise<ModelSet<ReadResult<TestObject, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<TestObject>>(options: ReadUniqueOptions<TestObject, Attrs>): Promise<ReadResult<TestObject, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<TestObject>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<TestObject>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<TestObject>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<TestObject, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<TestObject>>(): Promise<SearchResult<TestObject, Attrs>> {
        return [new ModelSet(), 0]
    }
    
    static className = (): ModelKeys => 'testObject';
}

models.testObject = TestObject;
        