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
type JoinedObject2DefaultData = {
	persisted?: string | null;
	joinProperty?: string;
	joinId?: Buffer;
	testObjects?: TestObject[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type JoinedObject2Data = JoinedObject2DefaultData & {}

/* End automatically generated type for `data` field in constructor */

export class JoinedObject2 extends Model<JoinedObject2> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @persisted declare public persisted?: string | null;
	
	@jointable('testObject', 'testObjectRelation', 'joinedObjectId', 'testObjectId', true, 'join2')
	declare public testObjects?: TestObject[];
	
	@join('joinProperty', 'join2', 'testObject')
	declare public joinProperty?: string;
	
	@join('id', 'join2', 'testObject')
	declare public joinId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: JoinedObject2Data) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<JoinedObject2>>(options: ReadOptions<JoinedObject2, Attrs>): Promise<ModelSet<ReadResult<JoinedObject2, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<JoinedObject2>>(options: ReadUniqueOptions<JoinedObject2, Attrs>): Promise<ReadResult<JoinedObject2, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<JoinedObject2>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<JoinedObject2>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<JoinedObject2>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<JoinedObject2, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<JoinedObject2>>(): Promise<SearchResult<JoinedObject2, Attrs>> {
        return [new ModelSet(), 0]
    }

    static className = (): ModelKeys => 'joinedObject2';
}

models.joinedObject2 = JoinedObject2;
        