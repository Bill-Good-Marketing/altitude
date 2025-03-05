import {MetricsCard} from "~/app/(authenticated)/opportunities/client/metrics-card"
import {StatsChart} from "~/app/(authenticated)/opportunities/client/stats-chart"
import {OpportunityTable} from "~/app/(authenticated)/opportunities/client/opportunity-table"

import "./page.css"
import React from "react";
import {QueryWrapper} from "~/components/util/QueryWrapper";
import {getOpportunityStatistics} from "~/app/(authenticated)/opportunities/common";
import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import {User} from "~/db/sql/models/User";
import {dbClient} from "~/db/sql/SQLBase";
import {OpportunityStatus} from "~/common/enum/enumerations";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "~/components/ui/tabs";

async function getMetrics(tenetId: Buffer | undefined) {
    // For metrics, we have to pull this year's data, last year's data, this quarter's data, last quarter's data, this month's data, last month's data, and this year's predicted data
    const thisYearStart = new Date()
    thisYearStart.setMonth(0)
    thisYearStart.setDate(1)
    thisYearStart.setHours(0, 0, 0, 0)

    const thisYearEnd = new Date()
    thisYearEnd.setMonth(12)
    thisYearEnd.setDate(0)
    thisYearEnd.setHours(23, 59, 59, 999)

    const lastYearStart = new Date()
    lastYearStart.setFullYear(thisYearStart.getFullYear() - 1)
    lastYearStart.setMonth(0)
    lastYearStart.setDate(1)
    lastYearStart.setHours(0, 0, 0, 0)

    const lastYearEnd = new Date()
    lastYearEnd.setFullYear(thisYearStart.getFullYear() - 1)
    lastYearEnd.setMonth(12)
    lastYearEnd.setDate(0)
    lastYearEnd.setHours(23, 59, 59, 999)

    const thisQuarterStart = new Date()
    const month = thisQuarterStart.getMonth()
    const quarter = Math.floor(month / 3) // Q0 is the same as first quarter
    thisQuarterStart.setMonth(quarter * 3)
    thisQuarterStart.setDate(1)
    thisQuarterStart.setHours(0, 0, 0, 0)

    const thisQuarterEnd = new Date()
    thisQuarterEnd.setMonth(quarter * 3 + 3)
    thisQuarterEnd.setDate(0)
    thisQuarterEnd.setHours(23, 59, 59, 999)

    const lastQuarterStart = new Date()
    lastQuarterStart.setMonth(quarter * 3 - 3)
    lastQuarterStart.setDate(1)
    lastQuarterStart.setHours(0, 0, 0, 0)

    const lastQuarterEnd = new Date()
    lastQuarterEnd.setMonth(quarter * 3)
    lastQuarterEnd.setDate(0)
    lastQuarterEnd.setHours(23, 59, 59, 999)

    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const thisMonthEnd = new Date()
    thisMonthEnd.setMonth(thisMonthStart.getMonth() + 1)
    thisMonthEnd.setDate(0)
    thisMonthEnd.setHours(23, 59, 59, 999)

    const lastMonthStart = new Date()
    lastMonthStart.setMonth(thisMonthStart.getMonth() - 1)
    lastMonthStart.setDate(1)
    lastMonthStart.setHours(0, 0, 0, 0)

    const lastMonthEnd = new Date()
    lastMonthEnd.setMonth(thisMonthStart.getMonth())
    lastMonthEnd.setDate(0)
    lastMonthEnd.setHours(23, 59, 59, 999)

    const [thisYear, lastYear, thisQuarter, lastQuarter, thisMonth, lastMonth, predicted] = await Promise.all([
        dbClient.opportunity.aggregate({
            _sum: {
                value: true
            },
            where: {
                tenetId,
                OR: [
                    {
                        expectedCloseDate: {
                            gte: thisYearStart,
                            lte: thisYearEnd
                        }
                    },
                    {
                        actualCloseDate: {
                            gte: thisYearStart,
                            lte: thisYearEnd
                        }
                    },
                ],
                status: OpportunityStatus.WON
            }
        }),
        dbClient.opportunity.aggregate({
            _sum: {
                value: true
            },
            where: {
                tenetId,
                OR: [
                    {
                        expectedCloseDate: {
                            gte: lastYearStart,
                            lte: lastYearEnd
                        }
                    },
                    {
                        actualCloseDate: {
                            gte: lastYearStart,
                            lte: lastYearEnd
                        }
                    },
                ],
                status: OpportunityStatus.WON
            }
        }),
        dbClient.opportunity.aggregate({
            _sum: {
                value: true
            },
            where: {
                tenetId,
                OR: [
                    {
                        expectedCloseDate: {
                            gte: thisQuarterStart,
                            lte: thisQuarterEnd
                        }
                    },
                    {
                        actualCloseDate: {
                            gte: thisQuarterStart,
                            lte: thisQuarterEnd
                        }
                    },
                ],
                status: OpportunityStatus.WON
            }
        }),
        dbClient.opportunity.aggregate({
            _sum: {
                value: true
            },
            where: {
                tenetId,
                OR: [
                    {
                        expectedCloseDate: {
                            gte: lastQuarterStart,
                            lte: lastQuarterEnd
                        }
                    },
                    {
                        actualCloseDate: {
                            gte: lastQuarterStart,
                            lte: lastQuarterEnd
                        }
                    },
                ],
                status: OpportunityStatus.WON
            }
        }),
        dbClient.opportunity.aggregate({
            _sum: {
                value: true
            },
            where: {
                tenetId,
                OR: [
                    {
                        expectedCloseDate: {
                            gte: thisMonthStart,
                            lte: thisMonthEnd
                        }
                    },
                    {
                        actualCloseDate: {
                            gte: thisMonthStart,
                            lte: thisMonthEnd
                        }
                    },
                ],
                status: OpportunityStatus.WON
            }
        }),
        dbClient.opportunity.aggregate({
            _sum: {
                value: true
            },
            where: {
                tenetId,
                OR: [
                    {
                        expectedCloseDate: {
                            gte: lastMonthStart,
                            lte: lastMonthEnd
                        }
                    },
                    {
                        actualCloseDate: {
                            gte: lastMonthStart,
                            lte: lastMonthEnd
                        }
                    },
                ],
                status: OpportunityStatus.WON
            }
        }),
        dbClient.opportunity.aggregate({
            _sum: {
                value: true
            },
            where: {
                tenetId,
                OR: [
                    {
                        expectedCloseDate: {
                            gte: thisYearStart,
                            lte: thisYearEnd
                        }
                    },
                    {
                        actualCloseDate: {
                            gte: thisYearStart,
                            lte: thisYearEnd
                        }
                    },
                ],
                status: {
                    notIn: [OpportunityStatus.LOST, OpportunityStatus.CANCELLED, OpportunityStatus.WON]
                }
            }
        }),
    ])

    return [thisYear._sum.value ?? 0, lastYear._sum.value ?? 0, thisQuarter._sum.value ?? 0, lastQuarter._sum.value ?? 0, thisMonth._sum.value ?? 0, lastMonth._sum.value ?? 0, predicted._sum.value ?? 0]
}

async function OpportunityPage({requester}: { requester: User }) {
    const [thisYear, [metric_thisYear, metric_lastYear, metric_thisQuarter, metric_lastQuarter, metric_thisMonth, metric_lastMonth, metric_predicted]] = await Promise.all([
        getOpportunityStatistics(requester.tenetId ?? undefined, 'this-year'),
        getMetrics(requester.tenetId ?? undefined)
    ])

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Opportunities</h1>
            </div>
            <Tabs defaultValue={'opportunities'} className="mb-6">
                <TabsList className="grid grid-cols-2 gap-4">
                    <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                    <TabsTrigger value={'oracle'}>Operation Opportunity Oracle</TabsTrigger>
                </TabsList>
                <TabsContent value="opportunities">
                    <div className="grid gap-4 md:grid-cols-4">
                        <MetricsCard
                            title="New AUM This Year"
                            value={metric_thisYear}
                            lastValue={metric_lastYear}
                        />
                        <MetricsCard
                            title="New AUM This Quarter"
                            value={metric_thisQuarter}
                            lastValue={metric_lastQuarter}
                        />
                        <MetricsCard
                            title="New AUM This Month"
                            value={metric_thisMonth}
                            lastValue={metric_lastMonth}
                        />
                        <MetricsCard
                            title="Projected AUM by Year's End"
                            value={metric_predicted}
                            lastValue={metric_lastYear}
                        />
                    </div>
                    <QueryWrapper>
                        <div className="mt-6">
                            <StatsChart thisYear={thisYear}/>
                        </div>
                        <div className="mt-6">
                            <OpportunityTable/>
                        </div>
                    </QueryWrapper>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default withAuthentication(OpportunityPage);

export const metadata = {
    title: 'Opportunities',
}