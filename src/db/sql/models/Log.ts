/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {persisted, uniqueEncrypted, wrap, required, Default, encrypted} from '~/db/sql/decorators';
import {Tenet} from '~/db/sql/models/Tenet';
import {LogLevel} from '~/common/enum/serverenums';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type LogDefaultData = {
	userEmail?: string | null;
	tenetId?: Buffer | null;
	tenet?: Tenet | null;
	message?: string;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	severity?: LogLevel;
	stacktrace?: string | null;
	source?: string | null;
	secureDetails?: string | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type LogData = LogDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class Log extends Model<Log> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @persisted @uniqueEncrypted() declare public userEmail?: string | null;
	@persisted declare public tenetId?: Buffer | null;
	@wrap('tenet', 'logs', 'tenetId', true, false) declare public tenet?: Tenet | null;
	@required declare public message?: string;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@persisted @Default(LogLevel.INFO) declare public severity?: LogLevel;
	@persisted @encrypted() declare public stacktrace?: string | null;
	@persisted @uniqueEncrypted() declare public source?: string | null;
	@persisted @uniqueEncrypted() declare public secureDetails?: string | null;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: LogData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<Log>>(options: ReadOptions<Log, Attrs>): Promise<ModelSet<ReadResult<Log, Attrs>>> {
		return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<Log>>(options: ReadUniqueOptions<Log, Attrs>): Promise<ReadResult<Log, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<Log>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<Log>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<Log>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Log, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<Log>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<Log, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<Log> = {
                tenetId,
                message: {
                    contains: searchString, mode: 'insensitive'
                }
            }

            // Search by log message
            return Promise.all([Log.read({
                where,
                select,
                limit: count,
                offset
            }), Log.count(where)])
        })
    }

    static className = (): ModelKeys => 'log';

    static async log(message: string, severity: LogLevel, stacktrace?: string, userEmail?: string, secureDetails?: string, source?: string, tenetId?: Buffer | null) {
        const log = new Log(undefined, {
            tenetId,
            message,
            severity,
            userEmail,
            stacktrace,
            secureDetails,
            source
        });
        await log.commit(true);
    }
}

models.log = Log;
        