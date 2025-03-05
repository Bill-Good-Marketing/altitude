/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap, persisted} from '~/db/sql/decorators';
import {User} from '~/db/sql/models/User';
import {Tenet} from '~/db/sql/models/Tenet';
import {AuditEventType, Auditable} from '~/common/enum/serverenums';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type AuditEventDefaultData = {
	userId?: Buffer;
	user?: User;
	tenetId?: Buffer;
	tenet?: Tenet;
	type?: AuditEventType;
	details?: string | null;
	referenceId?: Buffer;
	reference?: Auditable;
	createdAt?: Date | null;
	updatedAt?: Date | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type AuditEventData = AuditEventDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class AuditEvent extends Model<AuditEvent> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public userId?: Buffer;
	@wrap('user', 'auditEvents', 'userId', true, false) declare public user?: User;
	@required declare public tenetId?: Buffer;
	@wrap('tenet', 'auditEvents', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public type?: AuditEventType;
	@persisted declare public details?: string | null;
	@required declare public referenceId?: Buffer;
	@required declare public reference?: Auditable;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: AuditEventData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<AuditEvent>>(options: ReadOptions<AuditEvent, Attrs>): Promise<ModelSet<ReadResult<AuditEvent, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<AuditEvent>>(options: ReadUniqueOptions<AuditEvent, Attrs>): Promise<ReadResult<AuditEvent, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<AuditEvent>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<AuditEvent>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<AuditEvent>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<AuditEvent, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<AuditEvent>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<AuditEvent, Attrs>> {
        const where: ReadWhere<AuditEvent> = {
            OR: [
                {
                    details: {
                        contains: searchString, mode: 'insensitive'
                    }
                }
            ],
            tenetId
        };

        return await Promise.all([AuditEvent.read({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            select,
            limit: count,
            offset
        }), AuditEvent.count(where)])
    }

    static className = (): ModelKeys => 'auditEvent';
}

models.auditEvent = AuditEvent;
        