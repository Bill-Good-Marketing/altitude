/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, wrap} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {OpportunityProduct} from '~/db/sql/models/OpportunityProduct';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ProductTypeDefaultData = {
	title?: string;
	description?: string | null;
	defaultCommission?: number;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	opportunities?: OpportunityProduct[];
	tenet?: Tenet;
	tenetId?: Buffer
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ProductTypeData = ProductTypeDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ProductType extends Model<ProductType> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public title?: string;
	
	@ai.property('string', null, false, true)
	@persisted declare public description?: string | null;
	
	@ai.property('number', null, false, false)
	@required declare public defaultCommission?: number;
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	
	@ai.property('opportunityProduct', "Opportunities that depend on this product", true, false)
	@wrap('opportunityProduct', 'productType', 'productTypeId', false, true) declare public opportunities?: OpportunityProduct[];
	
	@wrap('tenet', 'products', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ProductTypeData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ProductType>>(options: ReadOptions<ProductType, Attrs>): Promise<ModelSet<ReadResult<ProductType, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ProductType>>(options: ReadUniqueOptions<ProductType, Attrs>): Promise<ReadResult<ProductType, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ProductType>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ProductType>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ProductType>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ProductType, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ProductType>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<ProductType, Attrs>> {
        const where: ReadWhere<ProductType> = {
            tenetId,
            title: {
                contains: searchString,
                mode: 'insensitive'
            }
        }

        return await Promise.all([
            await ProductType.read({
                where,
                select,
                limit: count,
                offset
            }),
            await ProductType.count(where)
        ]);
    }
    
    static className = (): ModelKeys => 'productType';
}

models.productType = ProductType;
        