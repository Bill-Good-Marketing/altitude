'use server';

import {User} from "~/db/sql/models/User";
import {OpportunityProduct} from "~/db/sql/models/OpportunityProduct";
import {API} from "~/util/api/ApiResponse";
import { Sort } from "~/components/data/DataTable";
import {ClientProductType} from "~/app/(authenticated)/settings/products/client";
import {ProductType} from "~/db/sql/models/ProductType";
import {ReadWhere} from "~/db/sql/types/where";
import {ReadOrder} from "~/db/sql/types/model";
import {OpportunityActivity} from "~/app/(authenticated)/opportunities/[guid]/components/OpportunityActivities";
import {Activity} from "~/db/sql/models/Activity";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {ContactTimelineEvent, TimelineSelect, toFeedItem} from "~/db/sql/models/ContactTimelineEvent";

const _updateProduct = async (requester: User, guid: string, product: {
    productType: string,
    price: number,
    commission: number
}) => {
    const productObj = await
        OpportunityProduct.readUnique({
            where: {
                id: Buffer.from(guid, 'hex'),
            },
            select: {
                id: true,
                productTypeId: true,
                price: true,
                commission: true
            }
        })

    if (productObj == null) {
        return API.toast('Product not found', 'error', 400)
    }

    productObj.productTypeId = Buffer.from(product.productType, 'hex')
    productObj.price = product.price
    productObj.commission = product.commission / 100

    await productObj.commit()
    return 'success'
}

const _addProduct = async (requester: User, opportunityGuid: string, product: {
    productType: string,
    price: number,
    commission: number
}) => {
    const order = await OpportunityProduct.count({
        opportunityId: Buffer.from(opportunityGuid, 'hex'),
    })

    const productObj = new OpportunityProduct(undefined, {
        opportunityId: Buffer.from(opportunityGuid, 'hex'),
        productTypeId: Buffer.from(product.productType, 'hex'),
        price: product.price,
        commission: product.commission / 100,
        order,
    })
    await productObj.commit()
    return 'success'
}

const _deleteProduct = async (requester: User, guid: string) => {
    const productObj = new OpportunityProduct(guid);
    await productObj.delete()
    return 'success'
}

const _getProductsTypes = async (requester: User, search: string, page: number, perPage: number, sortBy?: Sort<Omit<ClientProductType, 'description'>>): Promise<[Omit<ClientProductType, 'description'>[], number]> => {
    const where: ReadWhere<ProductType> = {
        tenetId: requester.tenetId ?? undefined,
        title: {
            contains: search,
            mode: 'insensitive'
        }
    }

    const orderBy: ReadOrder<ProductType> = {
    }
    if (sortBy?.title) {
        orderBy.title = sortBy.title
    }

    return Promise.all([
        (await ProductType.read({
            where,
            orderBy,
            limit: perPage,
            offset: (page - 1) * perPage,
            select: {
                title: true,
                description: true,
                defaultCommission: true,
            },
        })).map(product => {
            return {
                title: product.title,
                description: product.description,
                commission: product.defaultCommission,
                guid: product.guid.toString('hex')
            }
        }),
        ProductType.count(where)
    ])
}

const _getOpportunityActivities = async (user: User, guid: string, search: string, page: number, perPage: number, sortBy: Sort<OpportunityActivity>): Promise<[OpportunityActivity[], number]> => {
    const where: ReadWhere<Activity> = {
        tenetId: user.tenetId ?? undefined,
        opportunityId: Buffer.from(guid, 'hex'),
        OR: [
            {
                title: {
                    contains: search,
                    mode: 'insensitive'
                }
            },
            {
                description: {
                    contains: search,
                    mode: 'insensitive'
                }
            }
        ]
    }

    const orderBy: ReadOrder<Activity> = {
    }

    for (const sort in sortBy) {
        if (sort === 'title' || sort === 'startDate' || sort === 'endDate') {
            orderBy[sort] = sortBy[sort]
        }
    }

    return Promise.all([
        (await Activity.read({
            where,
            orderBy,
            limit: perPage,
            offset: (page - 1) * perPage,
            select: {
                title: true,
                description: true,
                startDate: true,
                endDate: true,
                type: true,
                taskScheduleType: true,
                status: true,
                users: {
                    select: {
                        fullName: true,
                    }
                }
            }
        })).map(activity => ({
            guid: activity.guid.toString('hex'),
            title: activity.title!,
            startDate: activity.startDate!,
            endDate: activity.endDate!,
            status: activity.status!,
            type: activity.type!,
            subType: activity.taskScheduleType,
            assigned: activity.users?.map(user => user.fullName!)
        })),
        Activity.count(where)
    ])
}

const _getOpportunityTimeline = async (user: User, guid: string, offset: number, count: number): Promise<[FeedItem[], number]> => {
    if (count > 5) {
        count = 5;
    }

    const where: ReadWhere<ContactTimelineEvent> = {
        tenetId: user.tenetId ?? undefined,
        opportunityId: Buffer.from(guid, 'hex'),
    }

    return await Promise.all([
        (await ContactTimelineEvent.read({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            select: TimelineSelect,
            limit: count,
            offset
        })).map(toFeedItem),
        ContactTimelineEvent.count(where)
    ])
}

export const updateOpportunityProduct = API.serverAction(_updateProduct)
export const addOpportunityProduct = API.serverAction(_addProduct)
export const deleteOpportunityProduct = API.serverAction(_deleteProduct)
export const getReducedProductTypes = API.serverAction(_getProductsTypes)
export const getOpportunityActivities = API.serverAction(_getOpportunityActivities)
export const getOpportunityTimeline = API.serverAction(_getOpportunityTimeline)