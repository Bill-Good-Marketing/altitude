"use client"

import React, {useState} from "react"
import {Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts"
import {Button} from "~/components/ui/button"
import {Card, CardContent} from "~/components/ui/card"
import {TimePeriod} from "~/app/(authenticated)/opportunities/client/opportunity-filters";
import {handleServerAction} from "~/util/api/client/APIClient";
import {Skeleton} from "~/components/ui/skeleton"
import {useQuery} from "@tanstack/react-query";
import {getOpportunityStatistics} from "~/app/(authenticated)/opportunities/client/Actions";

const bgClasses = [
    'fill-amber-100 dark:fill-amber-900 stroke-amber-100 dark:stroke-amber-900',
    'fill-blue-100 dark:fill-blue-900 stroke-blue-100 dark:stroke-blue-900',
    'fill-cyan-100 dark:fill-cyan-900 stroke-cyan-100 dark:stroke-cyan-900',
    'fill-emerald-100 dark:fill-emerald-900 stroke-emerald-100 dark:stroke-emerald-900',
    'fill-fuchsia-100 dark:fill-fuchsia-900 stroke-fuchsia-100 dark:stroke-fuchsia-900',
    'fill-green-100 dark:fill-green-900 stroke-green-100 dark:stroke-green-900',
    'fill-indigo-100 dark:fill-indigo-900 stroke-indigo-100 dark:stroke-indigo-900',
    'fill-lime-100 dark:fill-lime-900 stroke-lime-100 dark:stroke-lime-900',
    'fill-orange-100 dark:fill-orange-900 stroke-orange-100 dark:stroke-orange-900',
    'fill-pink-100 dark:fill-pink-900 stroke-pink-100 dark:stroke-pink-900',
    'fill-purple-100 dark:fill-purple-900 stroke-purple-100 dark:stroke-purple-900',
    'fill-red-100 dark:fill-red-900 stroke-red-100 dark:stroke-red-900',
    'fill-rose-100 dark:fill-rose-900 stroke-rose-100 dark:stroke-rose-900',
    'fill-sky-100 dark:fill-sky-900 stroke-sky-100 dark:stroke-sky-900',
    'fill-slate-100 dark:fill-slate-900 stroke-slate-100 dark:stroke-slate-900',
    'fill-teal-100 dark:fill-teal-900 stroke-teal-100 dark:stroke-teal-900',
    'fill-violet-100 dark:fill-violet-900 stroke-violet-100 dark:stroke-violet-900',
    'fill-yellow-100 dark:fill-yellow-900 stroke-yellow-100 dark:stroke-yellow-900',
]

export declare type OpportunityStatistics = {
    date: Date,
    amount: number,
    name: string,
    predicted: boolean,
    probability: number,
}

export function StatsChart({thisYear}: { thisYear: OpportunityStatistics[] }) {
    const [timeRange, setTimeRange] = useState<TimePeriod>("this-year")
    // Deal closes, used for bar chart

    const {data, isLoading, isError, error} = useQuery({
        queryKey: ["opportunityStatistics", timeRange],
        queryFn: async () => {
            if (timeRange === 'this-year') {
                return thisYear
            }
            const result = handleServerAction(await getOpportunityStatistics(timeRange))
            if (!result.success) {
                throw new Error(`Error fetching opportunity statistics: ${result.message}`);
            }
            return result.result
        },
    })

    let content: React.ReactNode;
    if (isLoading) {
        content = <Skeleton/>
    } else if (isError || data == null) {
        content = <div className="text-red-500">Error loading opportunity statistics: {(error as Error).message}</div>
    } else {
        const _chartData = data.filter(opp => !opp.predicted || opp.date <= new Date())

        const maxDate = _chartData.reduce((prev, current) => {
            if (current.date > prev) {
                return current.date
            }
            return prev
        }, new Date())

        const chartData = data.filter(opp => opp.date <= maxDate)
        const predictedData = data.filter(opp => opp.date > maxDate)

        type IndividualOpportunity = {
            value: number,
            name: string,
            probability: number,
            predicted: boolean
            date: Date
        }

        const aggregatedData: Record<string, {
            amount: number,
            aggAmount: number,
            opportunities: Array<IndividualOpportunity>
        }> = {}

        let extraPredictedAggregate = 0

        chartData.forEach((opportunity) => {
            const key = opportunity.date.toISOString().split('T')[0]
            const amnt = opportunity.predicted ? 0 : opportunity.amount
            if (opportunity.predicted) {
                extraPredictedAggregate += opportunity.amount
            }
            if (aggregatedData[key]) {
                aggregatedData[key].aggAmount += amnt
                aggregatedData[key].amount += opportunity.amount
                aggregatedData[key].opportunities.push({
                    value: opportunity.amount,
                    name: opportunity.name,
                    probability: opportunity.probability,
                    predicted: opportunity.predicted,
                    date: opportunity.date
                })
            } else {
                aggregatedData[key] = {
                    aggAmount: amnt,
                    amount: opportunity.amount,
                    opportunities: [{
                        value: opportunity.amount,
                        name: opportunity.name,
                        probability: opportunity.probability,
                        predicted: opportunity.predicted,
                        date: opportunity.date
                    }]
                }
            }
        })

        const aggregatedDataArray = Object.entries(aggregatedData).map(([key, value]) => ({
            date: new Date(key).getTime(),
            amount: value.amount,
            opportunities: value.opportunities,
            aggregated: 0,
            predictedAmount: 0,
            predictedAggregated: undefined as number | undefined,
            aggAmount: value.aggAmount,
        }))

        aggregatedDataArray.sort((a, b) => a.date - b.date)

        aggregatedDataArray.forEach((opportunity, index) => {
            if (index > 0) {
                const prev = aggregatedDataArray[index - 1]
                opportunity.aggregated = prev.aggregated + opportunity.aggAmount
            } else {
                opportunity.aggregated = opportunity.aggAmount
            }
        })


        const predictedDataArray: Record<string, {
            amount: number,
            opportunities: Array<IndividualOpportunity>
        }> = {}

        predictedData.forEach((opportunity) => {
            const key = opportunity.date.toISOString().split('T')[0]
            if (predictedDataArray[key]) {
                predictedDataArray[key].amount += opportunity.amount
                predictedDataArray[key].opportunities.push({
                    value: opportunity.amount,
                    name: opportunity.name,
                    probability: opportunity.probability,
                    predicted: opportunity.predicted,
                    date: opportunity.date
                })
            } else {
                predictedDataArray[key] = {
                    amount: opportunity.amount, opportunities: [{
                        value: opportunity.amount,
                        name: opportunity.name,
                        probability: opportunity.probability,
                        predicted: opportunity.predicted,
                        date: opportunity.date
                    }]
                }
            }
        })

        const aggregatedPredictedDataArray = Object.entries(predictedDataArray).map(([key, value]) => ({
            date: new Date(key).getTime(),
            predictedAmount: value.amount,
            opportunities: value.opportunities,
            predictedAggregated: 0 as number | undefined,
            amount: 0,
            aggregated: undefined,
            aggAmount: undefined,
        }))

        aggregatedPredictedDataArray.sort((a, b) => a.date - b.date)

        aggregatedPredictedDataArray.forEach((opportunity, index) => {
            if (index > 0) {
                const prev = aggregatedPredictedDataArray[index - 1]
                opportunity.predictedAggregated = (prev.predictedAggregated ?? 0) + opportunity.predictedAmount + extraPredictedAggregate
            } else if (aggregatedDataArray.length > 0) {
                opportunity.predictedAggregated = opportunity.predictedAmount + aggregatedDataArray[aggregatedDataArray.length - 1].aggregated  + extraPredictedAggregate
            } else {
                opportunity.predictedAggregated = opportunity.predictedAmount + extraPredictedAggregate
            }
        })

        if (aggregatedDataArray.length > 0) {
            aggregatedDataArray[aggregatedDataArray.length - 1].predictedAggregated = aggregatedDataArray[aggregatedDataArray.length - 1].aggregated + extraPredictedAggregate
        }

        const mergedData = [...aggregatedDataArray, ...aggregatedPredictedDataArray]

        const leastDate = new Date()
        const mostDate = new Date()

        switch (timeRange) {
            case 'this-month':
                leastDate.setDate(1)
                mostDate.setMonth(mostDate.getMonth() + 1)
                mostDate.setDate(0)
                break
            case 'this-quarter': {
                const month = leastDate.getMonth()
                const quarter = Math.floor(month / 3) // Q0 is the same as first quarter
                leastDate.setMonth(quarter * 3)
                mostDate.setMonth(quarter * 3 + 3)
                mostDate.setDate(0)
                break
            }
            case 'this-year':
                leastDate.setMonth(0)
                leastDate.setDate(1)
                mostDate.setMonth(12)
                mostDate.setDate(0)
                break;
            case 'next-quarter': {
                const month = leastDate.getMonth()
                const quarter = Math.floor(month / 3) + 1 // Q0 is the same as first quarter
                leastDate.setMonth(quarter * 3)
                mostDate.setMonth(quarter * 3 + 3)
                mostDate.setDate(0)
                break
            }
            case 'next-month':
                leastDate.setMonth(leastDate.getMonth() + 1)
                mostDate.setMonth(leastDate.getMonth() + 1)
                mostDate.setDate(0)
                break
        }

        const CustomTooltip = ({active, payload, label}: {
            active?: boolean,
            payload?: { dataKey: string, payload: typeof mergedData[number] }[],
            label?: number
        }) => {
            if (active && payload && payload.length && label) {
                const closedDeal = payload.find((p: any) => p.dataKey === "amount")
                const predictedDeal = payload.find((p: any) => p.dataKey === "predictedAmount")
                const data: typeof mergedData[number] = (closedDeal?.payload || predictedDeal?.payload)!

                const aggregated = (data.aggregated || data.predictedAggregated) ?? 0
                const amount = data.aggAmount || data.predictedAmount

                const predicted = data.predictedAggregated != null

                return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">Date</span>
                                <span className="font-bold">{new Date(label).toLocaleDateString()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">{predicted && !((data.predictedAggregated != null && data.aggregated != null)) ? 'Projected' : 'Aggregate'} New Assets</span>
                                <span className="font-bold">
                                    ${aggregated > 1e9 && `${(aggregated / 1000000000).toFixed(2)}B`}
                                    {(aggregated > 1e6 && aggregated < 1e9) && `${(aggregated / 1000000).toFixed(2)}M`}
                                    {(aggregated > 1e3 && aggregated < 1e6) && `${(aggregated / 1000).toFixed(2)}K`}
                                </span>
                            </div>
                            <div className="flex flex-col">
                            <span
                                className="text-[0.70rem] uppercase text-muted-foreground">Assets from {predicted ? 'Expected' : 'Closed'} Deals</span>
                                <span className="font-bold">
                                ${amount >= 1e6 ? `${(amount / 1000000).toFixed(2)}M` : `${(amount / 1000).toFixed(2)}K`} (${amount * .01} Revenue)
                            </span>
                            </div>
                            {(data.predictedAggregated != null && data.aggregated != null) && <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">Predicted New Assets</span>
                                <span className="font-bold">
                                    ${data.predictedAggregated > 1e9 && `${(data.predictedAggregated / 1000000000).toFixed(2)}B`}
                                    {(data.predictedAggregated > 1e6 && data.predictedAggregated < 1e9) && `${(data.predictedAggregated / 1000000).toFixed(2)}M`}
                                    {(data.predictedAggregated > 1e3 && data.predictedAggregated < 1e6) && `${(data.predictedAggregated / 1000).toFixed(2)}K`}
                                </span>
                            </div>}
                            <div className="flex flex-col col-span-2">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">{predicted ? 'Expected' : 'Closed'} Deals</span>
                                <ul className="flex flex-col gap-1">
                                    {data.opportunities.map((opportunity, idx) => {
                                        return (
                                            <li key={idx} className="flex gap-1 items-center">
                                            <span className={`font-bold${opportunity.predicted && opportunity.date < new Date() ? ' text-red-500' : ''}`}>
                                                {opportunity.name}
                                            </span>
                                                {' — '}
                                                <span className="text-muted-foreground">
                                                ${opportunity.value >= 1e6 ? `${(opportunity.value / 1000000).toFixed(2)}M` : `${(opportunity.value / 1000).toFixed(2)}K`} {opportunity.predicted && `(${opportunity.probability * 100}%)`}
                                            </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }
            return null
        }

        const getColor = (idx: number, bump: number) => bgClasses[(idx / (24 * 3600 * 1000) + bump) % bgClasses.length]

        const padding = timeRange === 'this-year' ? 3 * 24 * 60 * 60 * 1000
            : (timeRange === 'this-quarter' || timeRange === 'next-quarter')
                ? 24 * 60 * 60 * 1000
                : 12 * 60 * 60 * 1000

        content = <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis
                    type="number"
                    domain={[leastDate.getTime() - padding, mostDate.getTime() + padding]}
                    dataKey="date" stroke="#888888" tickCount={12} fontSize={12} axisLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleString("default", {
                        month: "short",
                        year: "numeric",
                        day: timeRange === 'this-year' ? undefined : 'numeric'
                    })}/>
                <YAxis
                    stroke="#888888"
                    yAxisId="line"
                    orientation="left"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                />
                <YAxis
                    yAxisId="bar"
                    orientation="right"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value > 1e6 ? `${(value / 1000000).toFixed(2)}M` : `${(value / 1000).toFixed(0)}K`}`}
                />
                <Tooltip content={<CustomTooltip/>}/>
                <Bar yAxisId={'bar'} dataKey="amount" fill="#FF980066" stroke="#FF9800" shape={(props: any) => {
                    const {x, y, width, height, payload} = props as {
                        x: number,
                        y: number,
                        width: number,
                        height: number,
                        payload: typeof mergedData[number]
                    }
                    if (payload.amount == null || payload.amount === 0) {
                        return <></>
                    }

                    const sum = payload.opportunities.reduce((prev, current) => prev + current.value, 0)

                    let lastY = y
                    const rects: React.ReactNode[] = payload.opportunities.map((opportunity, idx) => {
                        const _height = opportunity.value / sum * height
                        const _y = lastY
                        lastY += _height
                        return <rect key={idx} x={x + width / 2} y={_y} width={width} height={_height}
                                     className={getColor(payload.date, idx) + ' fill-opacity-25'}/>
                    })

                    return <g>{rects}</g>
                }}/>

                <Bar yAxisId={'bar'} dataKey="predictedAmount" fill="#FF980066" stroke="#FF9800" shape={(props: any) => {
                    const {x, y, width, height, payload} = props as {
                        x: number,
                        y: number,
                        width: number,
                        height: number,
                        payload: typeof mergedData[number]
                    }
                    if (payload.predictedAmount == null || payload.predictedAmount === 0) {
                        return <></>
                    }

                    let lastY = y
                    const rects: React.ReactNode[] = payload.opportunities.map((opportunity, idx) => {
                        const _height = opportunity.value / payload.predictedAmount * height
                        const _y = lastY
                        lastY += _height
                        return <rect key={idx} x={x - width / 2} y={_y} width={width} height={_height}
                                     className={getColor(payload.date, idx) + ' fill-opacity-25'}/>
                    })

                    return <g>{rects}</g>
                }}/>
                <Line yAxisId={'line'} type="monotone" dataKey="aggregated" stroke="#2196F3" strokeWidth={4} dot={false}/>
                <Line yAxisId={'line'} type="monotone" dataKey="predictedAggregated" stroke="#2196F3" strokeWidth={2} strokeDasharray={'8 10'}
                      dot={false}/>
            </ComposedChart>
        </ResponsiveContainer>
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Asset Growth Statistics</h2>
                    <div className="flex space-x-2">
                        <Button
                            size="sm"
                            variant={timeRange === "this-month" ? "default" : "outline"}
                            onClick={() => setTimeRange("this-month")}
                        >
                            This Month
                        </Button>
                        <Button
                            size="sm"
                            variant={timeRange === "this-quarter" ? "default" : "outline"}
                            onClick={() => setTimeRange("this-quarter")}
                        >
                            This Quarter
                        </Button>
                        <Button
                            size="sm"
                            variant={timeRange === "this-year" ? "default" : "outline"}
                            onClick={() => setTimeRange("this-year")}
                        >
                            This Year
                        </Button>
                        <Button
                            size="sm"
                            variant={timeRange === "next-month" ? "default" : "outline"}
                            onClick={() => setTimeRange("next-month")}
                        >
                            Next Month
                        </Button>
                        <Button
                            size="sm"
                            variant={timeRange === "next-quarter" ? "default" : "outline"}
                            onClick={() => setTimeRange("next-quarter")}
                        >
                            Next Quarter
                        </Button>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    {content}
                </div>
            </CardContent>
        </Card>
    )
}

