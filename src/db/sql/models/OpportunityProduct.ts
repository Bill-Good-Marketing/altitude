/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap, persisted} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {Opportunity} from '~/db/sql/models/Opportunity';
import {ProductType} from '~/db/sql/models/ProductType';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type OpportunityProductDefaultData = {
	price?: number;
	order?: number;
	commission?: number;
	opportunityId?: Buffer;
	opportunity?: Opportunity;
	productTypeId?: Buffer;
	productType?: ProductType;
	createdAt?: Date | null;
	updatedAt?: Date | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type OpportunityProductData = OpportunityProductDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class OpportunityProduct extends Model<OpportunityProduct> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('number', null, false, false)
	@required declare public price?: number;
	
	@ai.property('number', "Display order", false, false)
	@required declare public order?: number;
	
	@ai.property('number', null, false, false)
	@required declare public commission?: number;
	
	@required declare public opportunityId?: Buffer;
	@wrap('opportunity', 'products', 'opportunityId', true, false) declare public opportunity?: Opportunity;
	@required declare public productTypeId?: Buffer;
	@wrap('productType', 'opportunities', 'productTypeId', true, false) declare public productType?: ProductType;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: OpportunityProductData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<OpportunityProduct>>(options: ReadOptions<OpportunityProduct, Attrs>): Promise<ModelSet<ReadResult<OpportunityProduct, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<OpportunityProduct>>(options: ReadUniqueOptions<OpportunityProduct, Attrs>): Promise<ReadResult<OpportunityProduct, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<OpportunityProduct>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<OpportunityProduct>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<OpportunityProduct>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<OpportunityProduct, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<OpportunityProduct>>(): Promise<SearchResult<OpportunityProduct, Attrs>> {
        return [new ModelSet(), 0]; // Don't know if we need this right now
    }
    
    static className = (): ModelKeys => 'opportunityProduct';
}

models.opportunityProduct = OpportunityProduct;
        