/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, Default, wrap, calculated, on} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {AddressType} from '~/common/enum/enumerations';
import {Contact} from '~/db/sql/models/Contact';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";
import {invalidEnum} from "~/util/db/validation";
import {isEmptyString} from "~/util/strings";
import {getTimezone, getTimezoneSync, TZ_NONE} from "~/util/time/timezone";
import {ProgrammingError} from '~/common/errors';
import {updateTZ} from '@prisma/client/sql';
import {countryAlpha3ToAlpha2} from "~/util/lists/Country";
import {BatchResult} from "~/db/sql/types/hooks";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type AddressDefaultData = {
	street?: string;
	city?: string;
	state?: string;
	zip?: string;
	country?: string;
	type?: AddressType;
	primary?: boolean;
	contactId?: Buffer;
	contact?: Contact;
	tenetId?: Buffer;
	tenet?: Tenet;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	timezone?: string | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type AddressData = AddressDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class Address extends Model<Address> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public street?: string;
	
	@ai.property('string', null, false, false)
	@required declare public city?: string;
	
	@ai.property('string', null, false, false)
	@required declare public state?: string;
	
	@ai.property('string', null, false, false)
	@required declare public zip?: string;
	
	@ai.property('string', null, false, false)
	@required declare public country?: string;
	
	@ai.property('AddressType', null, false, false)
	@required declare public type?: AddressType;
	
	@ai.property('boolean', null, false, false)
	@persisted @Default(false) declare public primary?: boolean;
	
	@ai.property('id', null, false, false)
	@required declare public contactId?: Buffer;
	
	@ai.property('contact', null, false, false)
	@wrap('contact', 'addresses', 'contactId', true, false) declare public contact?: Contact;
	
	@required declare public tenetId?: Buffer;
	@wrap('tenet', 'addresses', 'tenetId', true, false) declare public tenet?: Tenet;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	
	@ai.property('string', null, false, true)
	@persisted declare public timezone?: string | null;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    declare private _tzUpdated: boolean;

    @calculated(['street', 'city', 'state', 'zip', 'country'], (_obj: Model<any>, street: string, city: string, state: string, zip: string, country: string) => {
        return `${street} ${city}, ${state} ${zip}, ${country}`;
    }, {cache: true})
    declare public address?: string;

    constructor(id?: Buffer | string | Uint8Array, data?: AddressData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<Address>>(options: ReadOptions<Address, Attrs>): Promise<ModelSet<ReadResult<Address, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<Address>>(options: ReadUniqueOptions<Address, Attrs>): Promise<ReadResult<Address, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<Address>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<Address>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<Address>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Address, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<Address>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<Address, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<Address> = {
                OR: [
                    {street: {contains: searchString, mode: 'insensitive'}},
                    {city: {contains: searchString, mode: 'insensitive'}},
                    {state: {equals: searchString, mode: 'insensitive'}},
                    {zip: {equals: searchString, mode: 'insensitive'}},
                    {country: {contains: searchString, mode: 'insensitive'}}
                ],
                tenetId
            }

            return await Promise.all([Address.read({
                where,
                select,
                limit: count,
                offset
            }), Address.count(where)])
        });
    }

    public async validate() {
        if (this.isDirty('street') && isEmptyString(this.street)) {
            return {
                result: false,
                msg: 'Invalid {0}, street is required'
            }
        }

        if (this.isDirty('city') && isEmptyString(this.city)) {
            return {
                result: false,
                msg: 'Invalid {0}, city is required'
            }
        }

        if (this.isDirty('state') && isEmptyString(this.state)) {
            return {
                result: false,
                msg: 'Invalid {0}, state is required'
            }
        }

        if (this.isDirty('zip') && isEmptyString(this.zip)) {
            return {
                result: false,
                msg: 'Invalid {0}, zip is required'
            }
        }

        if (this.isDirty('country') && isEmptyString(this.country)) {
            return {
                result: false,
                msg: 'Invalid {0}, country is required'
            }
        }

        if (this.isDirty('type') && invalidEnum(this.type, AddressType)) {
            return {
                result: false,
                msg: 'Invalid {0}, expected a valid address type, instead found ' + this.type
            }
        }

        return super.validate();
    }

    @on('update', 'before')
    public async updateTimezone(property: string, value: string, old: string, isBatch: boolean): Promise<boolean | BatchResult> {
        if (!this._tzUpdated && (property === 'state' || property === 'country' || property === 'city')) {
            if (isBatch) {
                if (!this.isLoaded('country') || !this.isLoaded('state') || !this.isLoaded('city')) {
                    throw new ProgrammingError(`City, state, and country must be loaded before updating timezone in batch mode`);
                }
            } else {
                if (!this.isLoaded('country') || !this.isLoaded('state') || !this.isLoaded('city')) {
                    await this.load(['country', 'state', 'city']);
                }
            }

            const tz = getTimezoneSync(this.state!, this.country!);

            if (tz != TZ_NONE && tz.tz != 'lookup') {
                this._tzUpdated = true;
                this.timezone = tz.tz;
            } else if (tz != TZ_NONE) {
                const normalizedCountry = countryAlpha3ToAlpha2[this.country!];

                if (normalizedCountry == null || normalizedCountry === 'OT') {
                    return true;
                }
                const client = Model.getPrisma();

                this._tzUpdated = true;
                return this.batchResult(client.$queryRawTyped(updateTZ(
                    normalizedCountry,
                    this.state!,
                    this.city!
                )))
            }
        }
        return true;
    }

    public async commit(ignoreTransaction?: boolean) {
        await super.commit(ignoreTransaction);
        this._tzUpdated = false;
    }

    @on('create', 'before')
    public async create_assignTimezone(isBatch: boolean) {
        if (!this._tzUpdated) {
            let tz = getTimezoneSync(this.state!, this.country!);

            if (tz != TZ_NONE && tz.tz != 'lookup') {
                this._tzUpdated = true;
                this.timezone = tz.tz;
            } else if (tz != TZ_NONE && !isBatch) {
                tz = await getTimezone(this.city!, this.state!, this.country!);
                if (tz != TZ_NONE) {
                    this._tzUpdated = true;
                    this.timezone = tz.tz;
                }
            }
        }
    }

    @on('create', 'after')
    public async create_assignTimezoneBatchCompatible(isBatch: boolean) {
        if (!this._tzUpdated && isBatch) {
            const tz = getTimezoneSync(this.state!, this.country!);
            if (tz != TZ_NONE && tz.tz != 'lookup') {
                const client = Model.getPrisma();
                return this.batchResult(client.$queryRawTyped(updateTZ(
                    countryAlpha3ToAlpha2[this.country!],
                    this.state!,
                    this.city!
                )))
            }
        }
    }

    static className = (): ModelKeys => 'address';
}

models.address = Address;
        