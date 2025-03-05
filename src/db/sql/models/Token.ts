/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, wrap, Default} from '~/db/sql/decorators';
import {User} from '~/db/sql/models/User';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {JWTToken} from "~/app/api/auth/[...nextauth]/route";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type TokenDefaultData = {
	userId?: Buffer;
	createdAt?: Date | null;
	user?: User;
	refresh?: boolean
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type TokenData = TokenDefaultData & {}
/* End automatically generated type for `data` field in constructor */

export class Token extends Model<Token> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public userId?: Buffer;
	@persisted declare public createdAt?: Date;
	@wrap('user', 'tokens', 'userId', true, false) declare public user?: User;
	@persisted @Default(false) declare public refresh?: boolean;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: TokenData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<Token>>(options: ReadOptions<Token, Attrs>): Promise<ModelSet<ReadResult<Token, Attrs>>> {
		return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<Token>>(options: ReadUniqueOptions<Token, Attrs>): Promise<ReadResult<Token, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<Token>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<Token>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<Token>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Token, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<Token>>(): Promise<SearchResult<Token, Attrs>> {
        return [new ModelSet(), 0]; // No search for auth tokens allowed
    }

    set new(newVal: boolean) {
        if (!newVal && this._new) {
            this._dirty = {};
        }
        this._new = newVal;
    }

    public static async isValid(_token: JWTToken): Promise<string | boolean> {
        const token = await Token.readUnique({
            where: {
                id: Buffer.from(_token.tokenId, 'hex'),
                userId: Buffer.from(_token.user.guid, 'hex'),
            },
            select: {refresh: true}
        });

        if (token == null) {
            return false;
        }

        if (token.refresh) {
            return 'refresh';
        }
        return true;
    }

    static className = (): ModelKeys => 'token';
}

models.token = Token;
        