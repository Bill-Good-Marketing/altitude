import React from "react";
import {ScrollTable, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "../ui/table";
import {Button} from "~/components/ui/button";
import {ChevronDown, ChevronUp, X} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious
} from "~/components/ui/pagination";

import {TypeKey} from "~/db/sql/types/utility";

type DataTableColumnCommon = {
    title: string
}

// Bound to a specific key of the data object
type BoundDataTableColumn<T> = DataTableColumnCommon & {
    key: keyof T,
    // If unspecified, the column will be a text column
    render?: (data: T) => React.ReactNode
    sortable?: boolean // Whether the column is sortable
}

// Just a column, such as a checkbox or actions column
type UnboundDataTableColumn<T> = DataTableColumnCommon & {
    key: string,
    render: (data: T) => React.ReactNode
}

export type DataTableColumn<T> = BoundDataTableColumn<T> | UnboundDataTableColumn<T>

export declare type Sort<T> = Partial<{
    [key in keyof T]: 'asc' | 'desc'
}>

type CommonDataTableProps<T> = {
    data: T[]
    count: number // Total number of items
    idKey: TypeKey<T, string> // Key to use for the id

    columns: DataTableColumn<T>[]
    className?: string // Class name for the table
    rowClassName?: (data: T, idx: number) => string // Class name for each row
    onRowClick?: (data: T) => void // Callback to handle row click

    expandable?: boolean
    pageable?: boolean

    sortBy?: Sort<T>
    setSortBy?: (setState: (sort: Sort<T>) => Sort<T>) => void

    height: string | number
}

type PageableDataTableProps<T> = CommonDataTableProps<T> & {
    pageable: true
    onPageChange: (page: number) => void // Callback to handle page change
    onPerPageChange: (perPage: number) => void // Callback to handle per page change
    perPage: number // Number of rows per page, defaults to 25
    page: number // Current page
    pageSizeOptions?: number[] // Array of page sizes to display in the dropdown, defaults to [10, 25, 50, 100]
}

type NonPageableDataTableProps<T> = CommonDataTableProps<T> & {
    pageable?: false,
    onPageChange?: never,
    onPerPageChange?: never,
    perPage?: never,
    page?: never,
    pageSizeOptions?: never
}

type ExpandableDataTableProps<T> = CommonDataTableProps<T> & {
    expandable: true
    expandedRender: (data: T) => React.ReactNode
}

type StandardDataTableProps<T> = CommonDataTableProps<T> & {
    expandable?: boolean
    expandedRender?: never
}

export declare type DataTableProps<T> = CommonDataTableProps<T>
    & (ExpandableDataTableProps<T> | StandardDataTableProps<T>)
    & (PageableDataTableProps<T> | NonPageableDataTableProps<T>)

const defaultRender = (value: any) => {
    switch (typeof value) {
        case 'string':
            return value;
        case 'number':
            return value.toString();
        case 'boolean':
            return value ? 'true' : 'false';
        case 'object':
            if (value == null) {
                return '';
            }
            return JSON.stringify(value);
        case 'undefined':
            return '';
        default:
            return value;
    }
}

export function DataTable<T>({
                                 data,
                                 columns,
                                 className,
                                 rowClassName,
                                 onRowClick,
                                 expandable,
                                 idKey,
                                 expandedRender,
                                 count, // Total number of items
                                 pageable,
                                 page,
                                 perPage = 25,
                                 onPageChange,
                                 onPerPageChange,
                                 pageSizeOptions = [10, 25, 50, 100],
                                 setSortBy,
                                 sortBy,
                                 height
                             }: DataTableProps<T>) {
    const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

    const handleSort = (field: keyof T) => {
        if (setSortBy == null) {
            return
        }
        if (sortBy == null) {
            setSortBy(prev => ({...prev, [field]: 'asc'}))
            return
        }
        const currentSort = sortBy[field]
        if (currentSort == null) {
            setSortBy(prev => ({...prev, [field]: 'asc'}))
        } else if (currentSort === 'asc') {
            setSortBy(prev => ({...prev, [field]: 'desc'}))
        } else {
            // Remove sort
            setSortBy(prev => {
                const newSortBy = {...prev}
                delete newSortBy[field]
                return newSortBy
            })
        }
    }

    const handleRowClick = (data: T) => {
        if (onRowClick) {
            onRowClick(data);
        }
    }

    const handlePageChange = (page: number) => {
        if (pageable && onPageChange) {
            onPageChange(page);
        }
    }

    const handlePerPageChange = (perPage: number) => {
        if (pageable && onPerPageChange) {
            onPerPageChange(perPage);
        }
    }

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({...prev, [id]: !prev[id]}))
    }

    return <>
        <ScrollTable height={height} className={className}>
            <TableHeader className={'fixed-header'}>
                <TableRow>
                    {expandable && <TableHead></TableHead>}
                    {columns.map(column => {
                        let sortable = false
                        let sortOrder: 'asc' | 'desc' | undefined = undefined
                        if ('sortable' in column) {
                            sortable = (column.sortable ?? false) && setSortBy != null
                            if (sortBy != null) {
                                sortOrder = sortBy[column.key as keyof T]
                            }
                        }
                        return <TableHead className={sortable ? 'cursor-pointer' : undefined} key={column.key as string}
                                          onClick={() => {
                                              if (sortable) {
                                                  handleSort(column.key as keyof T)
                                              }
                                          }}>{column.title}{sortOrder != null &&
                            <span className="ml-2 text-sm text-muted-foreground">{sortOrder === 'asc' ?
                                <ChevronUp className="inline w-4 h-4"/> :
                                <ChevronDown className="inline w-4 h-4"/>}</span>}</TableHead>
                    })}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row, idx) => {
                    const expanded = expandedRows[row[idKey] as string] ?? false

                    return <React.Fragment key={row[idKey] as string}>
                        <TableRow aria-expanded={expanded} className={rowClassName ? rowClassName(row, idx) : undefined}
                                  onClick={() => handleRowClick(row)}>
                            {expandable &&
                                <TableCell>
                                    <Button variant="ghost" size="sm"
                                            onClick={() => toggleRow(row[idKey] as string)}>
                                        {expandedRows[row[idKey] as string] ?
                                            <ChevronUp className="h-4 w-4"/> :
                                            <ChevronDown className="h-4 w-4"/>}
                                    </Button>
                                </TableCell>}
                            {columns.map(column => {
                                return <TableCell key={column.key as string}>
                                    {column.render ? column.render(row) : <span className={'text-nowrap'}>{defaultRender(row[column.key! as keyof T] as any)}</span>}
                                </TableCell>
                            })}
                        </TableRow>
                        {(expandable) && <TableRow className={expanded ? '' : 'hidden'}>
                            <TableCell colSpan={columns.length + 1}>
                                {expandedRender && expandedRender(row)}
                            </TableCell>
                        </TableRow>}
                    </React.Fragment>
                })}
            </TableBody>
            {pageable && <TableFooter className={'sticky bottom-[-1px] bg-background'}>
                <TablePagination
                    colSpan={expandable ? columns.length + 1 : columns.length}
                    page={page} maxPage={Math.ceil(count / perPage)} perPage={perPage} setPage={handlePageChange}
                    setPerPage={handlePerPageChange} pageSizeOptions={pageSizeOptions}/>
            </TableFooter>}
        </ScrollTable>
    </>
}

type ErroredDataTableProps = {
    columns: string[],
    message: string,
    expandable?: boolean,
    className?: string
}

export function ErroredDataTable({columns, expandable, message, className}: ErroredDataTableProps) {
    return <div className={className}>
        <Table>
            <TableHeader>
                <TableRow>
                    {expandable && <TableHead></TableHead>}
                    {columns.map(column => {
                        return <TableHead key={column}>{column}</TableHead>
                    })}
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={expandable ? columns.length + 1 : columns.length}>
                        <div className="flex items-center mt-6 text-center border rounded-lg h-96 dark:border-gray-700">
                            <div className="flex flex-col w-full max-w-sm px-4 mx-auto">
                                <div className="p-3 mx-auto text-red-500 bg-red-100 rounded-full dark:bg-gray-800">
                                    <X className="w-6 h-6"/>
                                </div>
                                <h1 className="mt-3 text-lg text-gray-800 dark:text-white">Uh oh!</h1>
                                <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
}

type NoDataTableProps = {
    columns: string[],
    expandable?: boolean,
    // Singular word for the data type you're searching for
    dataTypeName: string
    clearSearch: () => void
    className?: string
}

export function NoDataTable({columns, expandable, dataTypeName, clearSearch, className}: NoDataTableProps) {
    let _dtName = dataTypeName;
    if (_dtName.endsWith('y')) {
        _dtName = _dtName.slice(0, -1) + 'ies';
    } else if (_dtName.endsWith('ch')) {
        _dtName = _dtName.slice(0, -2) + 'es';
    } else if (!_dtName.endsWith('s')) {
        _dtName += 's';
    }

    return <div className={className}>
        <Table>
            <TableHeader>
                <TableRow>
                    {expandable && <TableHead></TableHead>}
                    {columns.map(column => {
                        return <TableHead key={column}>{column}</TableHead>
                    })}
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={expandable ? columns.length + 1 : columns.length}>
                        <div
                            className="flex items-center mt-6 text-center border rounded-lg h-96 dark:border-gray-700">
                            <div className="flex flex-col w-full max-w-sm px-4 mx-auto">
                                <div
                                    className="p-3 mx-auto text-blue-500 bg-blue-100 rounded-full dark:bg-gray-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                         strokeWidth="1.5"
                                         stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                                    </svg>
                                </div>
                                <h1 className="mt-3 text-lg text-gray-800 dark:text-white">No {dataTypeName}s found</h1>
                                <p className="mt-2 text-gray-500 dark:text-gray-400">
                                    Hmmm we {"couldn't"} find any {_dtName} that match your search. Please try
                                    again.
                                </p>
                                <div className="flex items-center mt-4 sm:mx-auto gap-x-3">
                                    <button
                                        onClick={clearSearch}
                                        className="w-1/2 px-5 py-2 text-sm text-gray-700 transition-colors duration-200 bg-background border rounded-lg sm:w-auto dark:hover:bg-gray-800 dark:bg-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-700">
                                        Clear Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
}

function TablePagination({page, maxPage, perPage, setPage, setPerPage, pageSizeOptions, colSpan}: {
    page: number,
    maxPage: number,
    perPage: number,
    setPage: (page: number) => void,
    setPerPage: (perPage: number) => void,
    pageSizeOptions: number[],
    colSpan: number
}) {
    return <TableRow>
        <TableCell colSpan={colSpan}>
            <div className={'flex justify-end w-full py-2'}>
                <Select value={perPage.toString()} onValueChange={(value) => setPerPage(parseInt(value))}>
                    <SelectTrigger className="w-[180px] mr-8">
                        <SelectValue placeholder="Per Page"/>
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map(size => <SelectItem key={size}
                                                                 value={size.toString()}>{size}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Pagination>
                    <PaginationContent className={'bg-transparent mr-4'}>
                        <PaginationItem>
                            <PaginationPrevious
                                className={'cursor-pointer'}
                                onClick={() => setPage(Math.max(page - 1, 1))}
                                aria-label="Go to previous page"
                            />
                        </PaginationItem>
                        <PaginationItem>
                            {page}&nbsp;/&nbsp;{maxPage}
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                className={'cursor-pointer'}
                                onClick={() => setPage(Math.min(page + 1, maxPage))}
                                aria-label="Go to next page"
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </TableCell>
    </TableRow>
}