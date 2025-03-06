/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, Default, wrap} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {Contact} from '~/db/sql/models/Contact';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";
import {isEmptyString} from "~/util/strings";
import {validateEmail} from "~/util/db/validation";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ContactEmailDefaultData = {
	email?: string;
	isPrimary?: boolean;
	contactId?: Buffer;
	contact?: Contact;
	tenetId?: Buffer;
	tenet?: Tenet;
	createdAt?: Date | null;
	updatedAt?: Date | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ContactEmailData = ContactEmailDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ContactEmail extends Model<ContactEmail> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public email?: string;
	
	@ai.property('boolean', null, false, false)
	@persisted @Default(false) declare public isPrimary?: boolean;
	
	@ai.property('id', null, false, false)
	@required declare public contactId?: Buffer;
	
	@ai.property('contact', null, false, false)
	@wrap('contact', 'emails', 'contactId', true, false) declare public contact?: Contact;
	
	@required declare public tenetId?: Buffer;
	@wrap('tenet', 'contactEmails', 'tenetId', true, false) declare public tenet?: Tenet;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ContactEmailData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ContactEmail>>(options: ReadOptions<ContactEmail, Attrs>): Promise<ModelSet<ReadResult<ContactEmail, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ContactEmail>>(options: ReadUniqueOptions<ContactEmail, Attrs>): Promise<ReadResult<ContactEmail, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ContactEmail>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ContactEmail>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ContactEmail>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ContactEmail, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ContactEmail>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<ContactEmail, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<ContactEmail> = {
                email: {
                    contains: searchString, mode: 'insensitive'
                },
                tenetId
            }

            // Search by contact email
            return Promise.all([ContactEmail.read({
                where,
                orderBy: {
                    email: 'asc'
                },
                select,
                limit: count,
                offset
            }), ContactEmail.count(where)])
        });
    }

    public async validate() {
        if (this.isDirty('email') && this.email != null) {
            if (isEmptyString(this.email)) {
                return {
                    result: false,
                    msg: 'Invalid {0}, contact email is required'
                }
            } else if (!validateEmail(this.email)) {
                return {
                    result: false,
                    msg: 'Invalid {0}, contact email is invalid'
                }
            }
        }

        return super.validate();
    }
    
    static className = (): ModelKeys => 'contactEmail';
}

models.contactEmail = ContactEmail;
        