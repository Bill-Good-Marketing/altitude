/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap, persisted} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {ImportantDateType} from '~/common/enum/enumerations';
import {Contact} from '~/db/sql/models/Contact';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";
import {invalidEnum} from "~/util/db/validation";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ImportantDateDefaultData = {
	date?: Date;
	type?: ImportantDateType;
	contactId?: Buffer;
	contact?: Contact;
	tenetId?: Buffer;
	tenet?: Tenet;
	createdAt?: Date | null;
	updatedAt?: Date | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type ImportantDateData = ImportantDateDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class ImportantDate extends Model<ImportantDate> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('date', null, false, false)
	@required declare public date?: Date;
	
	@ai.property('ImportantDateType', null, false, false)
	@required declare public type?: ImportantDateType;
	
	@ai.property('id', null, false, false)
	@required declare public contactId?: Buffer;
	
	@ai.property('contact', null, false, false)
	@wrap('contact', 'importantDates', 'contactId', true, false) declare public contact?: Contact;
	
	@required declare public tenetId?: Buffer;
	@wrap('tenet', 'importantDates', 'tenetId', true, false) declare public tenet?: Tenet;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: ImportantDateData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<ImportantDate>>(options: ReadOptions<ImportantDate, Attrs>): Promise<ModelSet<ReadResult<ImportantDate, Attrs>>> {
		return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<ImportantDate>>(options: ReadUniqueOptions<ImportantDate, Attrs>): Promise<ReadResult<ImportantDate, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<ImportantDate>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<ImportantDate>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<ImportantDate>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ImportantDate, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<ImportantDate>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<ImportantDate, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<ImportantDate> = {
                type: {
                    contains: searchString, mode: 'insensitive'
                },
                tenetId
            }

            // Search by important date
            return Promise.all([ImportantDate.read({
                where,
                orderBy: {
                    date: 'asc'
                },
                select,
                limit: count,
                offset
            }), ImportantDate.count(where)])
        });
    }

    public async validate() {
        if (this.isDirty('type') && invalidEnum(this.type, ImportantDateType)) {
            return {
                result: false,
                msg: 'Invalid {0}, expected a valid important date type, instead found ' + this.type
            }
        }

        return super.validate();
    }

    static className = (): ModelKeys => 'importantDate';
}

models.importantDate = ImportantDate;
        