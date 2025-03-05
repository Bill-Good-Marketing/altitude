import {Sort} from "~/components/data/DataTable";
import {ProductType} from "~/db/sql/models/ProductType";
import {Where} from "~/db/sql/types/where";
import {ReadOrder} from "~/db/sql/types/model";
import {ClientProductType} from "~/app/(authenticated)/settings/products/client";

export async function getProducts(tenetId: Buffer | undefined, search: string, page: number, perPage: number, sort: Sort<ClientProductType>): Promise<[ClientProductType[], number]> {
    const where: Where<ProductType> = {
        tenetId,
        title: {
            contains: search,
            mode: 'insensitive'
        }
    }

    const orderBy: ReadOrder<ProductType> = {
    }

    if (sort.title) {
        orderBy.title = sort.title
    }

    if (sort.commission) {
        orderBy.defaultCommission = sort.commission
    }

    return await Promise.all([
        (await ProductType.read({
            where,
            orderBy,
            limit: perPage,
            offset: (page - 1) * perPage,
            select: {
                title: true,
                description: true,
                defaultCommission: true,
            }
        })).map(product => ({
            guid: product.guid.toString('hex'),
            title: product.title,
            description: product.description,
            commission: product.defaultCommission,
        })),
        await ProductType.count(where)
    ]);
}