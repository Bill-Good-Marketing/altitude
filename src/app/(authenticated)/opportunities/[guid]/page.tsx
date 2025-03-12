import React from "react"
import {Opportunity} from "~/db/sql/models/Opportunity"
import {User} from "~/db/sql/models/User"
import {notFound, redirect} from "next/navigation";
import {getAuthSession} from "~/util/auth/AuthUtils";
import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import {ContactType} from "~/common/enum/enumerations";
import {Building, House, UserCircle} from "lucide-react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "~/components/ui/tabs";
import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card";
import {Label} from "~/components/ui/label";
import {EnglishList} from "~/components/util/EnglishList";
import {FormattedLink} from "~/components/util/FormattedLink";
import {format} from "date-fns";
import {OpportunityStatusBadge, OpportunityStatusIcon} from "~/app/(authenticated)/opportunities/client/opportunity-table";
import {ContactHoverCard} from "~/common/components/hover-cards/ContactHoverCard";
import {AddProductButton, ContactInformationCard, ProductItem} from "~/app/(authenticated)/opportunities/[guid]/client";

import "./page.css"
import {QueryWrapper} from "~/components/util/QueryWrapper";
import {OpportunityActivities, OpportunityTimeline} from "~/app/(authenticated)/opportunities/[guid]/components/OpportunityActivities";
import {englishList} from "~/util/strings";

const getOpportunity = React.cache(async (tenetId: Buffer | undefined, guid: string) => {
    return await Opportunity.readUnique({
        where: {
            tenetId,
            id: Buffer.from(guid, 'hex')
        },
        select: {
            title: true,
            contacts: {
                select: {
                    fullName: true,
                    type: true,
                    phones: {
                        select: {
                            number: true,
                            isPrimary: true
                        },
                        orderBy: {
                            isPrimary: 'asc',
                            createdAt: 'asc'
                        },
                        take: 1
                    },
                    emails: {
                        select: {
                            email: true,
                            isPrimary: true
                        },
                        orderBy: {
                            isPrimary: 'asc',
                            createdAt: 'asc'
                        },
                        take: 1
                    },
                    addresses: {
                        select: {
                            address: true,
                            primary: true
                        },
                        orderBy: {
                            primary: 'asc',
                            createdAt: 'asc'
                        },
                        take: 1
                    }
                }
            },
            teamMembers: {
                select: {
                    fullName: true
                }
            },
            value: true,
            probability: true,
            status: true,
            expectedCloseDate: true,
            actualCloseDate: true,
            products: {
                select: {
                    price: true,
                    commission: true,
                    productType: {
                        select: {
                            title: true,
                        }
                    }
                },
                orderBy: {
                    price: 'asc'
                }
            }
        }
    })
})

function ContactTypeIcon({type}: { type: ContactType }) {
    switch (type) {
        case ContactType.HOUSEHOLD:
            return <House className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
        case ContactType.COMPANY:
            return <Building className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
        case ContactType.INDIVIDUAL:
            return <UserCircle className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
    }
}

async function OpportunityDetailPage({requester, params}: {
    requester: User,
    params: Promise<{
        guid: string
    }>
}) {
    const opportunity = await getOpportunity(requester.tenetId ?? undefined, (await params).guid)

    if (opportunity == null) {
        return notFound()
    }

    const moneyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    return <div className={'p-6 mt-4'}>
        <QueryWrapper>
            <div className={'flex items-center space-x-2 text-3xl mb-4'}>
                <OpportunityStatusIcon status={opportunity.status} withColor className="h-8 w-8"/>
                <span className="font-bold">{opportunity.title}</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="overview" className="h-full flex flex-col">
                    <TabsList className="mb-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="activities">Activities</TabsTrigger>
                        <TabsTrigger value="oracle">Oracle Insights</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="flex-1 overflow-auto">
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="col-span-2">
                                <CardHeader>
                                    <CardTitle>Deal Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className={'font-semibold text-lg'}>Clients</Label>
                                            <div>
                                                <EnglishList
                                                    strs={opportunity.contacts.map(contact => contact.fullName)}
                                                    Component={({children, idx}) => {
                                                        const contact = opportunity.contacts[idx]
                                                        const hasContactInfo = contact.primaryEmail != null || contact.primaryPhone != null || contact.primaryAddress != null
                                                        if (!hasContactInfo) {
                                                            return <div>
                                                                <ContactTypeIcon type={contact.type}/>
                                                                <FormattedLink deleted={contact.deleted}
                                                                               href={`/contacts/${contact.guid}`}>{children}</FormattedLink>
                                                            </div>
                                                        }

                                                        return <ContactHoverCard
                                                            guid={contact.guid.toString('hex')}
                                                            name={children}
                                                            type={contact.type}
                                                            email={contact.primaryEmail ?? null}
                                                            phone={contact.primaryPhone ?? null}
                                                            address={contact.primaryAddress?.address ?? null}
                                                            showTypeIcon={true}
                                                            deleted={contact.deleted}
                                                        />
                                                    }}/>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className={'font-semibold text-lg'}>Team Members</Label>
                                            <div>
                                                {englishList(opportunity.teamMembers.map(user => user.fullName))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className={'font-semibold text-lg'}>Value</Label>
                                            <div className="font-semibold text-green-600 text-lg">{moneyFormatter.format(opportunity.value)}</div>
                                        </div>
                                        <div>
                                            <Label className={'font-semibold text-lg'}>Probability</Label>
                                            <div className="font-semibold text-lg">{opportunity.probability * 100}%</div>
                                        </div>
                                        <div>
                                            <Label className={'font-semibold text-lg'}>{opportunity.actualCloseDate ? '' : 'Expected'} Close Date</Label>
                                            <div
                                                className="font-semibold text-lg">{format(new Date(opportunity.actualCloseDate ?? opportunity.expectedCloseDate), 'MMMM d, yyyy')}</div>
                                        </div>
                                        <div>
                                            <Label className={'font-semibold text-lg'}>Status</Label>
                                            <div>
                                                <OpportunityStatusBadge className={'text-md'} status={opportunity.status}/>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <ContactInformationCard contacts={opportunity.contacts.map(contact => {
                                return {
                                    guid: contact.guid.toString('hex'),
                                    name: contact.fullName!,
                                    type: contact.type!,
                                    email: contact.primaryEmail ?? null,
                                    phone: contact.primaryPhone ?? null,
                                    address: contact.primaryAddress?.address ?? null,
                                    deleted: contact.deleted ?? false
                                }
                            })}/>
                            <Card className="col-span-2">
                                <CardHeader>
                                    <CardTitle>Products</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-4">
                                        {opportunity.products.map((product) => (
                                            <ProductItem
                                                key={product.guid.toString('hex')}
                                                product={{
                                                    guid: product.guid.toString('hex'),
                                                    productType: {
                                                        guid: product.productType.guid.toString('hex'),
                                                        title: product.productType.title,
                                                        commission: product.commission * 100,
                                                    },
                                                    commission: product.commission * 100,
                                                    price: product.price
                                                }}
                                            />
                                        ))}
                                    </ul>
                                    <AddProductButton guid={opportunity.guid.toString('hex')}/>
                                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                        <div className={'flex space-x-4 items-center'}>
                                            <span className="font-semibold">Total</span>
                                            <span className="font-bold text-lg">
                                          {moneyFormatter.format(opportunity.products.reduce((sum, product) => sum + product.price, 0))}
                                        </span>
                                        </div>

                                        <div className={'flex space-x-4 items-center'}>
                                    <span className={'font-semibold'}>
                                        Revenue
                                    </span>
                                            <span className="font-bold text-lg">
                                        {moneyFormatter.format(opportunity.products.reduce((sum, product) => sum + product.price * product.commission, 0))}
                                    </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Team</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    I feel like this should be something different
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="activities" className="flex-1 overflow-auto">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Timeline</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <OpportunityTimeline guid={opportunity.guid.toString('hex')}/>
                                </CardContent>
                            </Card>
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Activities</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <OpportunityActivities guid={opportunity.guid.toString('hex')}/>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="oracle" className="flex-1 overflow-auto">
                        To be implemented
                    </TabsContent>
                </Tabs>
            </div>
        </QueryWrapper></div>
}

export async function generateMetadata({params}: { params: Promise<{ guid: string }> }) {
    const user = await getAuthSession()

    if (user == 'refresh' || user == null) {
        return redirect('/login');
    }

    const opportunity = await getOpportunity(user.tenetId ?? undefined, (await params).guid)

    if (opportunity == null) {
        return notFound()
    }

    return {
        title: opportunity.title,
    }
}

export default withAuthentication(OpportunityDetailPage);