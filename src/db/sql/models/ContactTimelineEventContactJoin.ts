/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap} from '~/db/sql/decorators';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {Contact} from '~/db/sql/models/Contact';
import {ContactTimelineEventJoinType} from '~/common/enum/enumerations';
import ai from '~/ai/AI';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ContactTimelineEventContactJoinDefaultData = {
	contactEventId?: Buffer;
	contactEventRelation?: ContactTimelineEvent;
	contactId?: Buffer;
	contactRelation?: Contact;
	type?: ContactTimelineEventJoinType
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ContactTimelineEventContactJoinData = ContactTimelineEventContactJoinDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ContactTimelineEventContactJoin extends Model<ContactTimelineEventContactJoin> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public contactEventId?: Buffer;
	@wrap('contactTimelineEvent', 'contacts', 'contactEventId', true, false) declare public contactEventRelation?: ContactTimelineEvent;
	@required declare public contactId?: Buffer;
	@wrap('contact', 'timelineEvents', 'contactId', true, false) declare public contactRelation?: Contact;
	
	@ai.property('ContactTimelineEventJoinType', "Describes how this contact relates to a contact event.", false, false)
	@required declare public type?: ContactTimelineEventJoinType;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ContactTimelineEventContactJoinData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ContactTimelineEventContactJoin>>(options: ReadOptions<ContactTimelineEventContactJoin, Attrs>): Promise<ModelSet<ReadResult<ContactTimelineEventContactJoin, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ContactTimelineEventContactJoin>>(options: ReadUniqueOptions<ContactTimelineEventContactJoin, Attrs>): Promise<ReadResult<ContactTimelineEventContactJoin, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ContactTimelineEventContactJoin>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ContactTimelineEventContactJoin>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ContactTimelineEventContactJoin>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ContactTimelineEventContactJoin, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ContactTimelineEventContactJoin>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<ContactTimelineEventContactJoin, Attrs>> {
        /* TODO: Implement search function */
    }
    
    static className = (): ModelKeys => 'contactTimelineEventContactJoin';
}

models.contactTimelineEventContactJoin = ContactTimelineEventContactJoin;
        