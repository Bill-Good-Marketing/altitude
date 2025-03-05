/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, Default, wrap, calculated, on} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {PhoneType, ClassNameMapping} from '~/common/enum/enumerations';
import {Contact} from '~/db/sql/models/Contact';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";
import {formatPhoneNumber, isEmptyString} from "~/util/strings";
import {invalidEnum} from "~/util/db/validation";
import {ValidationError} from "~/common/errors";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ContactPhoneDefaultData = {
	number?: string;
	type?: PhoneType;
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
type ContactPhoneData = ContactPhoneDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class ContactPhone extends Model<ContactPhone> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public number?: string;
	
	@ai.property('PhoneType', null, false, false)
	@required declare public type?: PhoneType;
	
	@ai.property('boolean', null, false, false)
	@persisted @Default(false) declare public isPrimary?: boolean;
	
	@ai.property('id', null, false, false)
	@required declare public contactId?: Buffer;
	
	@ai.property('contact', null, false, false)
	@wrap('contact', 'phones', 'contactId', true, false) declare public contact?: Contact;
	
	@required declare public tenetId?: Buffer;
	@wrap('tenet', 'contactPhones', 'tenetId', true, false) declare public tenet?: Tenet;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    @calculated(['number'], (obj, number: string) => {
        return formatPhoneNumber(number);
    }, {})
    declare public formattedNumber?: string;

    constructor(id?: Buffer | string | Uint8Array, data?: ContactPhoneData) {
        super(id, data);

        if (this.number) {
            this.number = this.number.replaceAll(/[^0-9]/g, '');
        }
    }

    static async read<Attrs extends ReadAttributes<ContactPhone>>(options: ReadOptions<ContactPhone, Attrs>): Promise<ModelSet<ReadResult<ContactPhone, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<ContactPhone>>(options: ReadUniqueOptions<ContactPhone, Attrs>): Promise<ReadResult<ContactPhone, Attrs> | null> {
        return Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<ContactPhone>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<ContactPhone>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<ContactPhone>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ContactPhone, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<ContactPhone>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<ContactPhone, Attrs>> {
        // Probably don't need contact phone search
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<ContactPhone> = {
                number: {
                    contains: searchString.replaceAll(/[^0-9]/g, ''), mode: 'insensitive'
                },
                tenetId
            }

            // Search by contact phone number
            return Promise.all([ContactPhone.read({
                where,
                orderBy: {
                    number: 'asc'
                },
                select,
                limit: count,
                offset
            }), ContactPhone.count(where)])
        });
    }

    @on('create', 'before')
    public async createNumber() {
        if (this.number == null) {
            throw new ValidationError('Phone number is required', ClassNameMapping[this.className()]);
        }
        this.number = this.number.replaceAll(/[^0-9]/g, '');
    }

    @on('update', 'before')
    public async updateNumber(property: string, value: string) {
        if (property === 'number') {
            this.number = value.replaceAll(/[^0-9]/g, '');
        }
        return true;
    }

    public async validate() {
        if (this.isDirty('number') && isEmptyString(this.number)) {
            return {
                result: false,
                msg: 'Invalid {0}, phone number is required'
            }
        }

        if (this.isDirty('type') && invalidEnum(this.type, PhoneType)) {
            return {
                result: false,
                msg: 'Invalid {0}, expected a valid phone type, instead found ' + this.type
            }
        }

        return super.validate();
    }

    @on('read', 'after')
    public static onAIRead(properties: string[], obj: ContactPhone, aiRead: boolean) {
        if (aiRead && properties.includes('number')) {
            obj.number = obj.formattedNumber;
        }
    }

    static className = (): ModelKeys => 'contactPhone';
}

models.contactPhone = ContactPhone;
        