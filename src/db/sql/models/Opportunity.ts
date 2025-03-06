/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult, ModelAttributes} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, jointable, persisted, wrap, Default, computed} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {Contact} from '~/db/sql/models/Contact';
import {OpportunityStatus} from '~/common/enum/enumerations';
import {User} from '~/db/sql/models/User';
import {Activity} from '~/db/sql/models/Activity';
import {OpportunityProduct} from '~/db/sql/models/OpportunityProduct';
import {Tenet} from '~/db/sql/models/Tenet';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {Note} from '~/db/sql/models/Note';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type OpportunityDefaultData = {
	title?: string;
	contacts?: Contact[];
	description?: string | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	value?: number;
	probability?: number;
	expectedCloseDate?: Date;
	actualCloseDate?: Date | null;
	status?: OpportunityStatus;
	statusHistory?: OpportunityStatus[];
	teamMembers?: User[];
	activities?: Activity[];
	products?: OpportunityProduct[];
	deleted?: boolean;
	deletedAt?: Date | null;
	tenet?: Tenet;
	tenetId?: Buffer;
	events?: ContactTimelineEvent[];
	notes?: Note[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type OpportunityData = OpportunityDefaultData & {
    expectedValue?: number
}

/* End automatically generated type for `data` field in constructor */

export class Opportunity extends Model<Opportunity> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public title?: string;
	
	@ai.property('contact', "Associated contacts", false, false)
	@jointable('contact', 'contactRelation', 'opportunityId', 'contactId', 'contactId_opportunityId', 'opportunities')
	declare public contacts?: Contact[];
	
	@ai.property('string', null, false, true)
	@persisted declare public description?: string | null;
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	
	@ai.property('number', "Value of the opportunity", false, false)
	@required declare public value?: number;
	
	@ai.property('number', "Probability of closing the opportunity based on historical data", false, false)
	@required declare public probability?: number;
	
	@ai.property('date', null, false, false)
	@required declare public expectedCloseDate?: Date;
	
	@ai.property('date', null, false, true)
	@persisted declare public actualCloseDate?: Date | null;
	
	@ai.property('OpportunityStatus', null, false, false)
	@required declare public status?: OpportunityStatus;
	
	@required declare public statusHistory?: OpportunityStatus[];
	
	@ai.property('user', null, false, false)
	@jointable('user', 'userRelation', 'opportunityId', 'userId', 'userId_opportunityId', 'opportunities')
	declare public teamMembers?: User[];
	
	@ai.property('activity', "Activities related to this opportunity", true, false)
	@wrap('activity', 'opportunity', 'opportunityId', false, true) declare public activities?: Activity[];
	
	@ai.property('opportunityProduct', "The products this opportunity is related to", true, false)
	@wrap('opportunityProduct', 'opportunity', 'opportunityId', false, true) declare public products?: OpportunityProduct[];
	
	@persisted @Default(false) declare public deleted?: boolean;
	@persisted declare public deletedAt?: Date | null;
	@wrap('tenet', 'opportunities', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	@wrap('contactTimelineEvent', 'opportunity', 'opportunityId', false, true) declare public events?: ContactTimelineEvent[];
	@wrap('note', 'opportunity', 'opportunityId', false, true) declare public notes?: Note[];
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    // Value adjusted for probability
    @computed(['probability', 'value'], (obj: Model<Opportunity>, probability: number, expectedValue: number) => {
        if (probability == null || expectedValue == null) {
            return;
        }
        return probability * expectedValue;
    })
    @ai.property('number', null, false, true)
    declare public expectedValue?: number;

    constructor(id?: Buffer | string | Uint8Array, data?: OpportunityData) {
        const toCompute: ModelAttributes<Opportunity>[] = [];

        if (data?.probability != null && data?.value != null) {
            toCompute.push('expectedValue');
        }

        super(id, data, toCompute);
    }

    static async read<Attrs extends ReadAttributes<Opportunity>>(options: ReadOptions<Opportunity, Attrs>): Promise<ModelSet<ReadResult<Opportunity, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<Opportunity>>(options: ReadUniqueOptions<Opportunity, Attrs>): Promise<ReadResult<Opportunity, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<Opportunity>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<Opportunity>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<Opportunity>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Opportunity, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<Opportunity>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<Opportunity, Attrs>> {
        const where: ReadWhere<Opportunity> = {
            title: {
                contains: searchString, mode: 'insensitive'
            },
            contacts: {
                some: {
                    fullName: {
                        contains: searchString, mode: 'insensitive'
                    }
                }
            },
            tenetId
        };

        return Promise.all([Opportunity.read({
            where,
            orderBy: {
                title: 'asc'
            },
            select,
            limit: count,
            offset
        }), Opportunity.count(where)])
    }

    static className = (): ModelKeys => 'opportunity';
}

models.opportunity = Opportunity;
        