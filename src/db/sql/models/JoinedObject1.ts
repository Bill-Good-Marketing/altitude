/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {persisted, jointable, join} from '~/db/sql/decorators';
import {TestObject} from '~/db/sql/models/TestObject';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type JoinedObject1DefaultData = {
	persisted?: string | null;
	joinProperty?: string;
	testObjects?: TestObject[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type JoinedObject1Data = JoinedObject1DefaultData & {}

/* End automatically generated type for `data` field in constructor */

export class JoinedObject1 extends Model<JoinedObject1> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @persisted declare public persisted?: string | null;
	
	@jointable('testObject', 'testObjectRelation', 'joinedObjectId', 'testObjectId', 'testObjectId_joinedObjectId', 'join1')
	declare public testObjects?: TestObject[];
	
	@join('joinProperty', 'join1', 'testObject')
	declare public joinProperty?: string;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: JoinedObject1Data) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<JoinedObject1>>(options: ReadOptions<JoinedObject1, Attrs>): Promise<ModelSet<ReadResult<JoinedObject1, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<JoinedObject1>>(options: ReadUniqueOptions<JoinedObject1, Attrs>): Promise<ReadResult<JoinedObject1, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<JoinedObject1>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<JoinedObject1>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<JoinedObject1>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<JoinedObject1, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<JoinedObject1>>(): Promise<SearchResult<JoinedObject1, Attrs>> {
        return [new ModelSet(), 0]
    }

    static className = (): ModelKeys => 'joinedObject1';
}

models.joinedObject1 = JoinedObject1;
        