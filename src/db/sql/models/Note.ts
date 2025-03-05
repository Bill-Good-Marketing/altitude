/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap, persisted, Default} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {ActivityWaypoint} from '~/db/sql/models/ActivityWaypoint';
import {Activity} from '~/db/sql/models/Activity';
import {Contact} from '~/db/sql/models/Contact';
import {Opportunity} from '~/db/sql/models/Opportunity';
import {Tenet} from '~/db/sql/models/Tenet';
import {User} from '~/db/sql/models/User';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {NoteType, ContactTimelineEventType, ContactTimelineEventJoinType} from '~/common/enum/enumerations';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type NoteDefaultData = {
	content?: string;
	waypoint?: ActivityWaypoint | null;
	waypointId?: Buffer | null;
	activity?: Activity | null;
	activityId?: Buffer | null;
	contact?: Contact | null;
	contactId?: Buffer | null;
	opportunity?: Opportunity | null;
	opportunityId?: Buffer | null;
	tenet?: Tenet;
	tenetId?: Buffer;
	author?: User;
	authorId?: Buffer;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	events?: ContactTimelineEvent[];
	deleted?: boolean;
	deletedAt?: Date | null;
	noteType?: NoteType
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type NoteData = NoteDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class Note extends Model<Note> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public content?: string;
	
	@ai.property('activityWaypoint', null, false, true)
	@wrap('activityWaypoint', 'Note', 'waypointId', true, false) declare public waypoint?: ActivityWaypoint | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public waypointId?: Buffer | null;
	
	@ai.property('activity', null, false, true)
	@wrap('activity', 'notes', 'activityId', true, false) declare public activity?: Activity | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public activityId?: Buffer | null;
	
	@ai.property('contact', null, false, true)
	@wrap('contact', 'notes', 'contactId', true, false) declare public contact?: Contact | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public contactId?: Buffer | null;
	
	@ai.property('opportunity', null, false, true)
	@wrap('opportunity', 'notes', 'opportunityId', true, false) declare public opportunity?: Opportunity | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public opportunityId?: Buffer | null;
	
	@wrap('tenet', 'notes', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	
	@ai.property('user', null, false, false)
	@wrap('user', 'notes', 'authorId', true, false) declare public author?: User;
	
	@ai.property('id', null, false, false)
	@required declare public authorId?: Buffer;
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@wrap('contactTimelineEvent', 'note', 'noteId', false, true) declare public events?: ContactTimelineEvent[];
	@persisted @Default(false) declare public deleted?: boolean;
	@persisted declare public deletedAt?: Date | null;
	@persisted @Default(NoteType.NOTE) declare public noteType?: NoteType;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: NoteData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<Note>>(options: ReadOptions<Note, Attrs>): Promise<ModelSet<ReadResult<Note, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<Note>>(options: ReadUniqueOptions<Note, Attrs>): Promise<ReadResult<Note, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<Note>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<Note>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<Note>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Note, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<Note>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<Note, Attrs>> {
		const where: ReadWhere<Note> = {
			content: {
				contains: searchString, mode: 'insensitive'
			},
			tenetId
		};

		return Promise.all([Note.read({
			where,
			orderBy: {
				createdAt: 'desc'
			},
			select,
			limit: count,
			offset
		}), Note.count(where)])
    }
    
    static className = (): ModelKeys => 'note';

	async validate(): Promise<{ msg: string; result: boolean }> {
		if (this.isNew()) {
			if (this.activityId == null && this.contactId == null && this.waypointId == null) {
				return {
					result: false,
					msg: 'Invalid {0}, an activity, contact, or waypoint is required'
				}
			}
		}

		return super.validate();
	}

	protected prepareDirty() {
		if (this.isNew()) {
			if (this.authorId != null && this.contactId != null) {
				if (this.events == null) {
					this.events = [];
				}

				if (!this.events.find(event => event.eventType === ContactTimelineEventType.NOTE)){
					this.events.push(new ContactTimelineEvent(undefined, {
						eventType: ContactTimelineEventType.NOTE,
						userId: this.authorId,
						tenetId: this.tenetId,
						contacts: [new Contact(this.contactId, { contactTimelineRelationshipType: ContactTimelineEventJoinType.CONTACT_TARGET })],
						activityId: this.activityId,
						waypointId: this.waypointId,
					}));
				}
			}
		}
		super.prepareDirty();
	}
}

models.note = Note;
        