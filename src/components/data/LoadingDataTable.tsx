import {ScrollTable, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "~/components/ui/table";
import React from "react";
import {Button} from "~/components/ui/button";
import {ChevronDown} from "lucide-react";
import {Skeleton} from "~/components/ui/skeleton";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious
} from "~/components/ui/pagination";

type LoadingDataTableProps = {
    columns: string[]
    fakeRowCount: number
    className?: string
    expandable?: boolean
    pageable?: boolean
    height?: string | number
}

export function LoadingDataTable({columns, fakeRowCount, className, expandable, pageable, height}: LoadingDataTableProps) {
    return <ScrollTable height={height} className={className}>
            <TableHeader className={'fixed-header'}>
                <TableRow>
                    {expandable && <TableHead></TableHead>}
                    {columns.map(column => {
                        return <TableHead key={column}>{column}</TableHead>
                    })}
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array(fakeRowCount).fill(0).map((_, idx) => {
                    return <TableRow key={idx}>
                        {expandable &&
                            <TableCell>
                                <Button variant="ghost" size="sm">
                                    <ChevronDown className="h-4 w-4"/>
                                </Button>
                            </TableCell>}
                        {columns.map(column => {
                            return <TableCell key={column}>
                                <Skeleton className={'h-4 w-[100px]'}/>
                            </TableCell>
                        })}
                    </TableRow>
                })}
            </TableBody>
            {pageable && <TableFooter className={'sticky bottom-0 bg-background'}>
                <LoadingTablePagination colSpan={expandable ? columns.length + 1 : columns.length}/>
            </TableFooter>}
        </ScrollTable>
}

function LoadingTablePagination({colSpan}: { colSpan: number }) {
    return <TableRow>
        <TableCell colSpan={colSpan}>
            <div className={'flex justify-end w-full py-2'}>
                <Select defaultValue={'25'}>
                    <SelectTrigger className="w-[180px] mr-8">
                        <SelectValue placeholder="Per Page"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
                <Pagination>
                    <PaginationContent className={'bg-transparent mr-4'}>
                        <PaginationItem>
                            <PaginationPrevious
                                className={'cursor-pointer'}
                                aria-label="Go to previous page"
                            />
                        </PaginationItem>
                        <PaginationItem>
                            Loading...
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                className={'cursor-pointer'}
                                aria-label="Go to next page"
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </TableCell>
    </TableRow>
}