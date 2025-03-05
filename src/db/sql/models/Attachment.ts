/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap, persisted} from '~/db/sql/decorators';
import {Activity} from '~/db/sql/models/Activity';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type AttachmentDefaultData = {
	name?: string;
	location?: string;
	activity?: Activity | null;
	activityId?: Buffer | null;
	tenet?: Tenet;
	tenetId?: Buffer
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type AttachmentData = AttachmentDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class Attachment extends Model<Attachment> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public name?: string;
	@required declare public location?: string;
	@wrap('activity', 'attachments', 'activityId', true, false) declare public activity?: Activity | null;
	@persisted declare public activityId?: Buffer | null;
	@wrap('tenet', 'attachments', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: AttachmentData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<Attachment>>(options: ReadOptions<Attachment, Attrs>): Promise<ModelSet<ReadResult<Attachment, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<Attachment>>(options: ReadUniqueOptions<Attachment, Attrs>): Promise<ReadResult<Attachment, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<Attachment>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<Attachment>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<Attachment>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Attachment, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<Attachment>>(): Promise<SearchResult<Attachment, Attrs>> {
        return [new ModelSet(), 0]; // No search for attachment
    }

    static className = (): ModelKeys => 'attachment';
}

models.attachment = Attachment;
        