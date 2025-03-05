/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, uniqueEncrypted} from '~/db/sql/decorators';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ConfigOptionDefaultData = {
	name?: string;
	value?: string
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type ConfigOptionData = ConfigOptionDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class ConfigOption extends Model<ConfigOption> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public name?: string;
	@required @uniqueEncrypted() declare public value?: string;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: ConfigOptionData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<ConfigOption>>(options: ReadOptions<ConfigOption, Attrs>): Promise<ModelSet<ReadResult<ConfigOption, Attrs>>> {
		return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<ConfigOption>>(options: ReadUniqueOptions<ConfigOption, Attrs>): Promise<ReadResult<ConfigOption, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<ConfigOption>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<ConfigOption>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<ConfigOption>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ConfigOption, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<ConfigOption>>(searchString: string, select: Attrs, count: number, offset: number): Promise<SearchResult<ConfigOption, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<ConfigOption> = {
                name: {
                    contains: searchString, mode: 'insensitive'
                },
            }

            // Search by setting name
            return Promise.all([ConfigOption.read({
                where,
                select,
                limit: count,
                offset
            }), ConfigOption.count(where)])
        })
    }

    static className = (): ModelKeys => 'configOption';

    public static async getOption(name: string): Promise<ReadResult<ConfigOption, { name: true, value: true }> | null> {
        return await ConfigOption.readUnique({
            where: {
                name: name
            },
            select: { name: true, value: true }
        });
    }

    public static async loadOptions(names: string[]): Promise<ModelSet<ReadResult<ConfigOption, { name: true, value: true }>>> {
        const options = await ConfigOption.read({
            where: {
                name: {
                    in: names
                }
            },
            select: { name: true, value: true }
        });

        // Order options by the names inputted
        const ordered = []
        const arr = options.toArray();
        for (let i = 0; i < names.length; i++) {
            const idx = arr.findIndex(o => o.name === names[i]);
            if (idx !== -1) {
                ordered.push(arr[idx]);
            }
        }

        return new ModelSet(ordered);
    }

    public static async set(name: string, value: string) {
        let option = await ConfigOption.getOption(name);
        if (!option) {
            option = new ConfigOption(undefined, {
                name: name,
                value: value
            }) as ReadResult<ConfigOption, { name: true, value: true }>;
        } else {
            option.value = value;
        }
        await option.commit();
    }

    public static async setOrCreate(name: string, value: string) {
        let option = await ConfigOption.getOption(name);
        if (!option) {
            option = new ConfigOption(undefined, {
                name: name,
                value: value
            }) as ReadResult<ConfigOption, { name: true, value: true }>;
            await option.commit();
        } else {
            await option.asyncSet('value', value)
        }
        return option;
    }

    public static async create(name: string, value: string) {
        const option = new ConfigOption(undefined, {
            name: name,
            value: value
        });
        await option.commit();
        return option;
    }
}

models.configOption = ConfigOption;
