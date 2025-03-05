import React, {CSSProperties, useEffect, useId, useRef} from "react";
import {useQuery} from "@tanstack/react-query";
import {LoadingDataTable} from "~/components/data/LoadingDataTable";
import {DataTable, DataTableColumn, DataTableProps, ErroredDataTable, NoDataTable, Sort,} from "~/components/data/DataTable";
import {Popover, PopoverContent, PopoverTrigger} from "~/components/ui/popover";
import classNames from "classnames";
import {Label} from "~/components/ui/label";
import {Input} from "~/components/ui/input";
import {ChevronDown, Plus, SearchIcon, XCircle, XIcon} from "lucide-react";
import {cn} from "~/lib/utils";
import {Badge} from "~/components/ui/badge";
import {Separator} from "~/components/ui/separator";
import {Button} from "~/components/ui/button";
import {multiSelectVariants} from "../ui/multiselect";
import {Checkbox} from "~/components/ui/checkbox";
import {RadioGroup, RadioGroupItem} from "~/components/ui/radio-group";
import {TypeKey} from "~/db/sql/types/utility";
import {Carousel, CarouselApi, CarouselContent, CarouselItem} from "~/components/ui/carousel";

interface PickerTriggerProps<T> extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
    name?: string,
    // Renders picked items inside the trigger otherwise just a string
    render?: (value: T) => React.ReactNode
    nameKey: TypeKey<T, string>
    idKey: TypeKey<T, string>
    label?: string
    value: T[]
    remove: (value: T) => void
    clear: () => void,
    clearOverage: () => void,
    variant?: "default" | "destructive" | "inverted" | "secondary"
    placeholder?: string // Search placeholder, defaults to "Search..."
    maxDisplayCount?: number // Max number of items to display, defaults to 3
    isPopoverOpen: boolean
    handleTogglePopover: (open: boolean) => void
}

type PickerTableProps<T> = Omit<DataTableProps<T>, 'data' | 'count' | 'page' | 'perPage' | 'onPageChange' | 'onPerPageChange' | 'expandable' | 'expandedRender' | 'onRowClick' | 'pageable' | 'sortBy' | 'setSortBy' | 'height'>
type PickerPropsTriggerProps<T> = Omit<PickerTriggerProps<T>, 'value' | 'idKey' | 'remove' | 'clear' | 'clearOverage' | 'isPopoverOpen' | 'handleTogglePopover' | 'name' | 'maxDisplayCount'>

// Todo: add support for sorting
export declare type PickerPropsCommon<T> = {
    name?: string; // Form field name

    // Returns a tuple of [data, count]
    // Page is base-1 index, not base-0 index
    search: (search: string, page: number, perPage: number, sortBy?: Sort<T>) => Promise<[T[], number]>

    title: string
    description?: string
    searchPlaceholder: string // Search placeholder, defaults to "Search..."
    className?: string // Class name for picker container
    modalPopover?: boolean // If true, the picker will be a modal and screen readers will not be able to interact with the rest of the page

    datatable: PickerTableProps<T>
    dataTypeName: string // Singular word for the data type you're searching for

    trigger: PickerPropsTriggerProps<T> | React.ReactNode

    height?: CSSProperties['height']

    // Increase z-index in case the picker is in a modal
    index?: number

    // Extra search keys in case there are more than the search, page, and perPage fields used in the search.
    // E.g. further filtering like by relationship type and whatnot.
    searchKeys?: string[]
    dialog?: boolean // If in dialog, pass true

    // multi?: boolean

    open?: boolean
    setOpen?: (open: boolean) => void

    pickerKey: string,
}

type AdderProps<T> = PickerPropsCommon<T> & {
    useAdder: true,

    // If set, picker will have an add button which is this node
    adder: React.ReactNode
    adderHeight: CSSProperties['height'],
    add: () => void
    cancelAdd: () => void,
    adderTitle: string
}

type NonAdderProps<T> = PickerPropsCommon<T> & {
    useAdder?: false,
    adder?: never,
    adderHeight?: never,
    add?: never
    cancelAdd?: never,
    adderTitle?: never
}

type PickerMultiProps<T> = PickerPropsCommon<T> & {
    multi: true
    value: T[]
    onValueChange: (value: T[]) => void

    // Maximum number of items to display in the trigger. Defaults to 3.
    maxCount?: number,
}

type PickerSingleProps<T> = PickerPropsCommon<T> & {
    multi?: false
    value: T | null
    onValueChange: (value: T | null) => void,
    maxCount?: never,
}

export declare type PickerProps<T> = PickerPropsCommon<T>
    & (NonAdderProps<T> | AdderProps<T>)
    & (PickerMultiProps<T> | PickerSingleProps<T>)

export function Picker<T>({
                              name,
                              search,
                              title,
                              description,
                              searchPlaceholder = 'Search...',
                              className,
                              multi,
                              modalPopover = true,
                              value,
                              onValueChange,
                              maxCount = 3,
                              datatable,
                              dataTypeName,
                              height,
                              index = 0,
                              trigger,
                              searchKeys = [],
                              dialog,
                              pickerKey,
                              useAdder,
                              cancelAdd,
                              adder,
                              add,
                              adderHeight,
                              adderTitle,

                              open: externalOpen,
                              setOpen: externalSetOpen,
                          }: PickerProps<T>) {
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [interimSearchTerm, setInterimSearchTerm] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(25);

    const [view, setView] = React.useState('list') // List or adder

    const [api, setApi] = React.useState<CarouselApi>()
    const apiRef = useRef<CarouselApi>()

    useEffect(() => {
        if (externalOpen != null) {
            setIsPopoverOpen(externalOpen);
        }
    }, [externalOpen])

    const handleOpenChange = (open: boolean) => {
        if (externalSetOpen) {
            externalSetOpen(open);
            return;
        }
        setIsPopoverOpen(open);
    }

    useEffect(() => {
        if (api == null) {
            return;
        }

        apiRef.current = api

        api.reInit();

        api.on('select', () => {
            const page = api.selectedScrollSnap()
            switch (page) {
                case 0:
                    cancelAdd && cancelAdd()
                    setView('list')
                    break;
                case 1:
                    setView('adder')
                    break;
            }
        })
    }, [api])

    useEffect(() => {
        if (isPopoverOpen) {
            apiRef.current?.scrollTo(0)
            setView('list')
        }
    }, [isPopoverOpen])

    useEffect(() => {
        if ((view === 'list' || !isPopoverOpen) && useAdder) {
            cancelAdd()
        }
    }, [view, isPopoverOpen, useAdder, cancelAdd])

    const {data, isLoading, isError, error} = useQuery({
        queryKey: [pickerKey, searchTerm, page, perPage, dataTypeName, ...searchKeys],
        queryFn: async () => {
            return await search(searchTerm, page, perPage);
        },
    })

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const term = event.target.value
        setInterimSearchTerm(term)
    }

    const handleConfirmSearch = () => {
        setPage(1)
        setSearchTerm(interimSearchTerm)
    }

    const handlePageChange = (page: number) => {
        setPage(page)
    }

    const handlePerPageChange = (perPage: number) => {
        setPerPage(perPage)
    }

    let dt: React.JSX.Element = <></>
    if (isLoading || data == null) {
        dt = <LoadingDataTable columns={datatable.columns.map(column => column.title)} fakeRowCount={perPage}
                               pageable
                               height={height ?? 600}
                               className={className}/>
    } else if (isError || data == null) {
        dt = <ErroredDataTable columns={datatable.columns.map(column => column.title)} message={error?.message}
                               className={className}/>
    } else {
        const [rows, recordCount] = data as [T[], number]
        if (recordCount === 0) {
            dt = <NoDataTable
                columns={datatable.columns.map(column => column.title)}
                dataTypeName={dataTypeName}
                clearSearch={() => {
                    setSearchTerm('')
                    setInterimSearchTerm('')
                    setPage(1)
                }}
                className={className}/>
        } else {
            const {columns, ...dtProps} = datatable;
            let finalColumns: DataTableColumn<T>[] = [{
                key: 'picker-select',
                title: '',
                render: (row: T) => {
                    if (multi) {
                        // Checkbox
                        const selected = value.find(val => val[datatable.idKey] === row[datatable.idKey]) != null;
                        return <Checkbox
                            className="h-4 w-4"
                            checked={selected}
                        />
                    } else {
                        const selected = value != null && value[datatable.idKey] === row[datatable.idKey];
                        // Radio
                        return <RadioGroup>
                            <RadioGroupItem
                                className="h-4 w-4"
                                value={'literally-doesnt-matter'}
                                checked={selected}
                            />
                        </RadioGroup>
                    }
                }
            }]
            finalColumns = finalColumns.concat(columns)

            const toggleRow = (row: T) => {
                if (multi) {
                    if (value.find(val => val[datatable.idKey] === row[datatable.idKey])) {
                        onValueChange(value.filter(val => val[datatable.idKey] !== row[datatable.idKey]))
                    } else {
                        onValueChange([...value, row])
                    }
                } else {
                    if (value != null && value[datatable.idKey] === row[datatable.idKey]) {
                        onValueChange(null)
                    } else {
                        onValueChange(row)
                    }
                }
            }

            dt = <DataTable
                {...dtProps}
                data={rows}
                count={recordCount}
                page={page}
                perPage={perPage}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
                pageable
                height={height ?? 600}
                onRowClick={toggleRow}
                rowClassName={(row, idx) => {
                    if (!multi && value != null && value[datatable.idKey] === row[datatable.idKey]) {
                        // Active row
                        return 'bg-active text-foreground'
                    } else if (multi && (value as T[]).find(val => val[datatable.idKey] === row[datatable.idKey])) {
                        // Active row
                        return 'bg-active text-foreground'
                    } else if (idx % 2 === 0) {
                        return 'bg-gray-50 dark:bg-zinc-950 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-900'
                    }
                    return 'bg-background text-foreground hover:bg-gray-100 dark:hover:bg-zinc-900'
                }}
                columns={finalColumns}
            />
        }
    }

    const header = (
        <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
                <h4
                    className="font-medium leading-none">{view === 'adder' ? adderTitle : title}</h4>
                {(useAdder && view === 'list') &&
                    <Button variant="ghost" size="icon" onClick={() => {
                        api?.scrollTo(1)
                    }}>
                        <Plus className="h-4 w-4"/>
                    </Button>}
            </div>
            {description && <p className="text-sm text-muted-foreground">
                {description}
            </p>}
        </div>
    )
    const content = <div className={'grid gap-4'}>
        <div className="grid gap-2">
            <Label htmlFor="search" className="sr-only">
                Search
            </Label>
            <div className="flex items-center space-x-2">
                <SearchIcon className="h-4 w-4 text-muted-foreground mr-4"/>
                <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    value={interimSearchTerm}
                    onChange={handleChange}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            handleConfirmSearch()
                        }
                    }}
                    onBlur={handleConfirmSearch}
                    className="flex-grow"
                />
            </div>
        </div>
        <div className={'border border-gray-200 dark:border-zinc-900 rounded'}>
            {view === 'list' && dt}
        </div>
    </div>
    const footer = (
        <div className={'flex w-full justify-center lg:justify-end space-x-2 mt-4 mb-2'}>
            <Button variant={'destructive'} onClick={async () => {
                if (view === 'adder') {
                    useAdder && cancelAdd()
                    api?.scrollTo(0)
                } else handleOpenChange(false)
            }}>Cancel</Button>
            <Button onClick={async () => {
                useAdder && add()
                handleOpenChange(false)
            }}>{view === 'adder' ? 'Save' : 'Done'}</Button>
        </div>
    )

    const processHeight = (height: number | string | undefined) => {
        return `calc(${typeof height === 'number' ? `${height}px` : (height ?? '600px')} + 220px`
    }

    let _height = processHeight(height)
    if (view === 'adder' && useAdder && adderHeight) {
        _height = processHeight(adderHeight)
    }

    let _trigger: React.ReactNode = <></>

    if (React.isValidElement(trigger) || typeof trigger === 'string') {
        _trigger = trigger
    } else if (typeof trigger === 'object' && !React.isValidElement(trigger)) {
        _trigger = <PickerTrigger
            name={name}
            isPopoverOpen={isPopoverOpen}
            idKey={datatable.idKey}
            value={multi ? value : (value != null ? [value] : [])}
            maxDisplayCount={maxCount}
            remove={(val) => {
                if (multi) {
                    onValueChange(value.filter(v => v[datatable.idKey] !== val[datatable.idKey]))
                } else {
                    onValueChange(null)
                }
            }}
            clear={() => {
                if (multi) {
                    onValueChange([])
                } else {
                    onValueChange(null)
                }
            }}
            clearOverage={() => {
                if (multi) {
                    let _maxCount = maxCount;
                    if (_maxCount <= 0) {
                        _maxCount = 1;
                    }
                    onValueChange(value.slice(0, _maxCount))
                } else {
                    console.warn('clearOverage should only be called by multi-select pickers')
                    onValueChange(null)
                }
            }}
            handleTogglePopover={(open) => handleOpenChange(open)}
            {...trigger as PickerPropsTriggerProps<T>}
        />
    }

    return <Popover modal={modalPopover && !dialog} onOpenChange={open => {
        setIsPopoverOpen(open);
    }} open={isPopoverOpen}>
        <PopoverTrigger asChild>
            {_trigger}
        </PopoverTrigger>
        {<PopoverContent style={{
            height: _height,
            maxHeight: `var(--radix-popper-available-height)`,
        }} className={classNames(className, "popover-match-width overflow-y-auto !px-8 transition-all duration-500 ease-in-out")} index={(index ?? 0) + 5}>
            {header}

            <div>
                <Carousel setApi={setApi}>
                    <CarouselContent className={`transition-transform duration-500 ease-in-out ${view === 'adder' ? '-ml-2' : ''}`}>
                        <CarouselItem>
                            {content}
                        </CarouselItem>
                        {useAdder && <CarouselItem>
                            {adder}
                        </CarouselItem>}
                    </CarouselContent>
                </Carousel>
            </div>

            {footer}
        </PopoverContent>}
    </Popover>
}

function PickerTrigger<T>({ref, ...props}: PickerTriggerProps<T> & { ref?: React.ForwardedRef<HTMLButtonElement> }) {
    return <_PickerTrigger {...props} ref={ref}/>
}

const _PickerTrigger = React.forwardRef(({
                                             name,
                                             render,
                                             nameKey,
                                             label,
                                             idKey,
                                             value,
                                             maxDisplayCount = 3,
                                             remove,
                                             clear,
                                             clearOverage,
                                             variant,
                                             isPopoverOpen,
                                             handleTogglePopover,
                                             placeholder = 'Search...',
                                             className,
                                             ...props
                                         }: PickerTriggerProps<any>, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const id = useId();

    return <>
        {label && <Label htmlFor={id + "-trigger"}>
            {label}
        </Label>}
        <Button
            role={'combobox'}
            name={name}
            ref={ref}
            aria-haspopup={'dialog'}
            aria-expanded={isPopoverOpen}
            aria-label={'Open picker'}
            data-state={isPopoverOpen ? 'open' : 'closed'}
            id={id + "-trigger"}
            onClick={() => handleTogglePopover(!isPopoverOpen)}
            className={cn(
                "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-background hover:bg-background disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {value.length > 0 ? (
                <div className="flex justify-between items-center w-full">
                    <div className="flex flex-wrap items-center">
                        {value.slice(0, maxDisplayCount).map((value) => {
                            const child = render ? render(value) : value[nameKey] as string;
                            return (
                                <Badge
                                    key={value[idKey] as string}
                                    className={cn(
                                        multiSelectVariants({variant})
                                    )}
                                >
                                    {child}
                                    <XCircle
                                        className="ml-2 h-4 w-4 cursor-pointer"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            remove(value);
                                        }}
                                    />
                                </Badge>
                            );
                        })}
                        {value.length > maxDisplayCount && (
                            <Badge
                                className={cn(
                                    "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                                    multiSelectVariants({variant})
                                )}
                            >
                                {`+ ${value.length - maxDisplayCount} more`}
                                <XCircle
                                    className="ml-2 h-4 w-4 cursor-pointer"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        clearOverage();
                                    }}
                                />
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <XIcon
                            className="h-4 mx-2 cursor-pointer text-muted-foreground"
                            onClick={(event) => {
                                event.stopPropagation();
                                clear();
                            }}
                        />
                        <Separator
                            orientation="vertical"
                            className="flex min-h-6 h-full"
                        />
                        <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground"/>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between w-full mx-auto">
                <span className="text-sm text-muted-foreground mx-3">
                  {placeholder}
                </span>
                    <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2"/>
                </div>
            )}
        </Button>
    </>
})

_PickerTrigger.displayName = 'PickerTrigger'