'use server'

import {User} from "~/db/sql/models/User";
import {ClientProductType} from "~/app/(authenticated)/settings/products/client";
import {Sort} from "~/components/data/DataTable";
import {getProducts as server_getProducts} from "./common";
import {API} from "~/util/api/ApiResponse";
import {ProductType} from "~/db/sql/models/ProductType";

async function _getProducts(user: User, search: string, page: number, perPage: number, sort: Sort<ClientProductType>) {
    return server_getProducts(user.tenetId ?? undefined, search, page, perPage, sort)
}

async function _updateProduct(user: User, guid: string, key: 'title' | 'description' | 'commission', value: string | number) {
    const product = await ProductType.readUnique({
        where: {
            id: Buffer.from(guid, 'hex'),
            tenetId: user.tenetId ?? undefined,
        },
        select: {
            title: true,
            description: true,
            defaultCommission: true,
        }
    })

    if (!product) {
        return API.toast('Product not found', 'error', 404);
    }

    if (key === 'commission' && (typeof value !== 'number' || isNaN(value))) {
        return API.toast('Commission must be a number', 'error', 400);
    } else if (key === 'commission' && typeof value === 'number' && (value < 0 || value > 100)) {
        return API.toast('Commission must be between 0 and 100', 'error', 400);
    }

    switch (key) {
        case 'title':
            product.title = value as string;
            break;
        case 'description':
            product.description = value as string;
            break;
        case 'commission':
            product.defaultCommission = value as number;
            break;
    }

    await product.commit();

    return API.toast('Product updated', 'info', 200);
}

async function _createProduct(user: User, product: ClientProductType) {
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to create a product', 'error', 400);
    }

    if (product.title == null || product.title.trim().length === 0) {
        return API.toast('Product title cannot be empty', 'error', 400);
    } else if (product.commission == null || isNaN(product.commission) || product.commission < 0 || product.commission > 100) {
        return API.toast('Product commission must be a number between 0 and 100', 'error', 400);
    }

    const productObj = new ProductType(undefined, {
        title: product.title,
        description: product.description,
        defaultCommission: product.commission,
        tenetId: user.tenetId,
    })

    await productObj.commit();

    return productObj.guid.toString('hex');
}

export const getProductTypes = API.serverAction(_getProducts)
export const updateProductType = API.serverAction(_updateProduct)
export const createProductType = API.serverAction(_createProduct)