import React, {useEffect, useState} from "react";
import {ScrollArea, ScrollAreaProps} from "~/components/ui/scroll-area";
import InfiniteScroll from "~/components/ui/infinitescroll";
import {Loader2} from "lucide-react";
import {useInfiniteQuery} from "@tanstack/react-query";
import type {DefaultError, InfiniteData, QueryKey} from "@tanstack/query-core";
import {Skeleton} from "~/components/ui/skeleton";
import {useStateRef} from "~/hooks/use-state-ref";

export declare type InfiniteListProps<T> = {
    // Unique key for query client
    listKey: string
    load: (offset: number) => Promise<[T[], number]>
    render: (item: T, idx: number, count: number) => React.ReactNode
    noData?: () => React.ReactNode
    dataBefore?: T[] // Extra data just to render before the infinite list (adds to scroll area)

    loading?: React.ReactNode

    filterItems?: (items: T[]) => T[]
} & ScrollAreaProps

export function InfiniteList<T>({listKey, load, render, loading, noData, dataBefore, filterItems, ...props}: InfiniteListProps<T>) {
    const [toRender, setToRender] = useState<T[]>([])
    const [count, setCount] = useState<number>(-1)
    const [renderCount, setRenderCount] = useState<number>(-1)
    const countRef = useStateRef(count);

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isLoading,
    } = useInfiniteQuery<T[], DefaultError, InfiniteData<T[], number>, QueryKey, number>({
        queryKey: ['infinite-list', listKey],
        queryFn: async ({pageParam}) => {
            const offset = pageParam ?? 0;

            if (offset >= countRef.current && countRef.current !== -1) {
                return [];
            }

            const [results, total] = await load(offset);
            setCount(total);
            return results;
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage?.length === 0 && allPages.flat().length === 0 && countRef.current === -1) {
                return dataBefore?.length ?? 0;
            } else if (countRef.current === -1) {
                return allPages.flat().length + (dataBefore?.length ?? 0);
            }
            return Math.min(allPages.flat().length + (dataBefore?.length ?? 0), countRef.current);
        },
        initialPageParam: 0,
        staleTime: 1000 * 60 * 60,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
    })

    useEffect(() => {
        if (data != null) {
            const flattenedData = data.pages.flat()
            const concatData = dataBefore?.concat(flattenedData) ?? flattenedData
            const filtered = filterItems ? filterItems(concatData) : concatData
            setToRender(filtered)

            const lastPage = data.pages[data.pages.length - 1]

            if ((concatData.length === count && filtered.length < count) || lastPage.length === 0) {
                setRenderCount(filtered.length)
            } else {
                setRenderCount(-1)
            }
        }
    }, [dataBefore, data])

    if (isLoading) {
        return loading ? loading : <Skeleton className={'h-full w-full bg-gray-200 dark:bg-zinc-900'}/>
    } else if (error) {
        return <div className="text-red-500">Error loading feed: {(error as Error).message}</div>
    } else if (data == null) {
        if (noData) {
            return noData()
        }
        return <div className="text-gray-500">No data</div>
    }

    if (toRender.length === 0) {
        if (noData) {
            return noData()
        }
        return <div className="text-gray-500">No data</div>
    }

    const trueCount = renderCount > -1 ? renderCount : count
    const hasMore = toRender.length < trueCount

    return <ScrollArea {...props}>
        {toRender.map((val, idx) => render(val, idx, trueCount))}
        <InfiniteScroll threshold={0} isLoading={isLoading} hasMore={hasMore} next={async () => {
            if (!isFetching && hasNextPage) await fetchNextPage()
        }}>
            {hasMore && <div className="flex justify-center">
                <Loader2 className="my-4 h-8 w-8 animate-spin"/>
            </div>}
        </InfiniteScroll>
    </ScrollArea>
}