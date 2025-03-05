'use client';
import {
    ActivityPriority,
    ActivityPriorityNameMapping,
    ActivityStatus,
    ActivityStatusNameMapping,
    ActivityType,
    ActivityTypeNameMapping,
    ContactType,
    TaskScheduleType,
    TaskScheduleTypeNameMapping
} from "~/common/enum/enumerations";
import {ActivityStatusColors, ActivityStatusIconColors, PriorityColors} from "~/common/ui/BadgeColors";
import {
    BanIcon,
    Calendar,
    CheckCircle,
    CircleAlert,
    CircleEllipsis,
    CircleHelp,
    CirclePause,
    Clock,
    Edit,
    Info,
    Plus,
    ScanEye,
    Search,
    Trash2,
    UserCircle,
    UserCog
} from "lucide-react";
import React, { useEffect } from "react";
import {DataTable, ErroredDataTable, NoDataTable, Sort} from "~/components/data/DataTable";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {ClientSideReadResult} from "~/db/sql/types/utility";
import {readContact, readUser} from "~/common/actions/read";
import {createNote, deleteActivity, searchTasks} from "~/app/(authenticated)/activities/Actions";
import {handleServerAction} from "~/util/api/client/APIClient";
import {LoadingDataTable} from "~/components/data/LoadingDataTable";
import {Badge} from "~/components/ui/badge";
import {DateRenderer} from "~/components/util/Date";
import {Button} from "~/components/ui/button";
import {Input} from "~/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {EnglishList} from "~/components/util/EnglishList";
import {ContactPicker} from "~/components/data/pickers/ContactPicker";
import {UserPicker} from "~/components/data/pickers/UserPicker";
import {useConfirmation} from "~/hooks/use-confirmation";
import {ValidationProvider} from "~/components/data/ValidationProvider";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "~/components/ui/dialog";
import {Textarea} from "~/components/ui/textarea";
import {Label} from "~/components/ui/label";
import {toast} from "sonner";
import {ActivityTypeIcon} from "~/components/data/models/ActivityTypeIcon";
import Link from "next/link";
import ActivityDialog from "~/app/(authenticated)/activities/ActivityForm";
import {useRouter} from "next/navigation";
import {ContactHoverCard} from "~/common/components/hover-cards/ContactHoverCard";
import { usePersisted } from "~/hooks/use-persisted";

export declare type Activity = {
    guid: string;
    title: string;
    type: TaskScheduleType | null;
    status: ActivityStatus;
    priority: ActivityPriority;
    startDate: Date;
    endDate: Date;
    users: string[];
    contacts: {
        guid: string,
        name: string;
        primaryEmail: string | null,
        primaryPhone: string | null,
        primaryAddress: string | null,
        type: ContactType,
    }[];
    baseType: ActivityType;
}

export function ClientPage() {
    const [searchTerm, setSearchTerm] = usePersisted('')
    const [interimSearchTerm, setInterimSearchTerm] = React.useState('')

    const [initPersisted, setInitPersisted] = React.useState(false)

    useEffect(() => {
        if (initPersisted || searchTerm === '') {
            return
        }
        // Only on init in case there's a persisted value
        setInterimSearchTerm(searchTerm)
        setInitPersisted(true)
    }, [searchTerm, initPersisted])

    const [page, setPage] = React.useState(1)
    const [perPage, setPerPage] = React.useState(25)
    const [sortBy, setSortBy] = usePersisted<Sort<Activity>>({
        startDate: 'desc'
    })

    type ContactReadResult = ClientSideReadResult<typeof readContact<['fullName', 'primaryEmail', 'type']>>
    type UserReadResult = ClientSideReadResult<typeof readUser>

    const [classificationFilter, setClassificationFilter] = usePersisted<ActivityType | null>(null)
    const [statusFilter, setStatusFilter] = usePersisted<ActivityStatus | null>(null)
    const [typeFilter, setTypeFilter] = usePersisted<TaskScheduleType | null>(null)
    const [priorityFilter, setPriorityFilter] = usePersisted<ActivityPriority | null>(null)
    const [assigneeFilter, setAssigneeFilter] = usePersisted<UserReadResult[]>([])
    const [contactFilter, setContactFilter] = usePersisted<ContactReadResult[]>([])

    const [viewing, setViewing] = React.useState<string | null>(null)
    const [addingNote, setAddingNote] = React.useState<string | null>(null)
    const [note, setNote] = React.useState('')

    const router = useRouter()

    const {data, isError, error, isLoading} = useQuery<[Activity[], number]>({
        queryKey: ['activityTable', searchTerm, page, perPage, sortBy, classificationFilter, statusFilter, typeFilter, priorityFilter, assigneeFilter, contactFilter],
        queryFn: async () => {
            const result = handleServerAction(await searchTasks(searchTerm, page, perPage, sortBy, {
                baseType: classificationFilter ?? undefined,
                type: typeFilter ?? undefined,
                status: statusFilter ?? undefined,
                priority: priorityFilter ?? undefined,
                users: assigneeFilter.map(user => user.guid),
                contacts: contactFilter.map(contact => contact.guid)
            }))

            if (!result.success) {
                throw new Error(`Error searching tasks: ${result.message}`);
            }

            return result.result!;
        },
    })

    const queryClient = useQueryClient()

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const term = event.target.value
        setInterimSearchTerm(term)
    }

    const confirmSearch = () => {
        setPage(1)
        setSearchTerm(interimSearchTerm)
    }

    const handleClassificationFilter = (value: string) => {
        setPage(1)
        if (value === 'null') {
            setClassificationFilter(null)
        } else {
            setClassificationFilter(value as ActivityType)
        }
    }

    const handleTypeFilter = (value: string) => {
        setPage(1)
        if (value === 'null') {
            setTypeFilter(null)
        } else {
            setTypeFilter(value as TaskScheduleType)
        }
    }

    const handleStatusFilter = (value: string) => {
        setPage(1)
        if (value === 'null') {
            setStatusFilter(null)
        } else {
            setStatusFilter(value as ActivityStatus)
        }
    }

    const handlePriorityFilter = (value: string) => {
        setPage(1)
        if (value === 'null') {
            setPriorityFilter(null)
        } else {
            setPriorityFilter(value as ActivityPriority)
        }
    }

    const headers = ['Title', 'Contacts', 'Type', 'Status', 'Priority', 'Start Date', 'Due Date', 'Assignees', 'Actions']

    let content: React.ReactNode;
    if (isLoading) {
        content = <LoadingDataTable columns={headers} fakeRowCount={perPage} pageable={true} height={'70vh'}/>
    } else if (isError || data == null) {
        content = <ErroredDataTable columns={headers} message={(error as Error)?.message ?? 'Error loading tasks'}/>
    } else {
        const [rows, recordCount] = data

        if (recordCount === 0) {
            content = <NoDataTable columns={headers} dataTypeName={'task'} clearSearch={() => {
                setSearchTerm('')
                setInterimSearchTerm('')
                setPage(1)
                setTypeFilter(null)
                setStatusFilter(null)
                setPriorityFilter(null)
                setAssigneeFilter([])
                setContactFilter([])
            }}/>
        } else {
            content = <DataTable
                height={'70vh'}
                data={rows} count={recordCount} idKey={'guid'}
                columns={[{
                    title: 'Title',
                    key: 'title',
                    sortable: true,
                    render: (row: Activity) => (
                        <Link className="font-medium hover:underline" href={`/activities/${row.guid}`} onClick={(event) => {
                            // If left click (i.e. open in current tab), we want to specify "goBack" as true
                            if (event.button === 0) {
                                router.push(`/activities/${row.guid}?goBack=true`)
                                event.preventDefault()
                                event.stopPropagation()
                            }
                        }}>
                        {row.title}
                    </Link>
                    )
                }, {
                    title: 'Contacts',
                    key: 'contacts',
                    render: (row: Activity) => <div className={'max-w-[20vw]'}>
                        <EnglishList strs={row.contacts.map(contact => contact.name)}
                                     Component={({children, idx}) => {
                                         return <ContactHoverCard
                                             guid={row.contacts[idx].guid}
                                             name={children}
                                             type={row.contacts[idx].type}
                                             email={row.contacts[idx].primaryEmail}
                                             phone={row.contacts[idx].primaryPhone}
                                             address={row.contacts[idx].primaryAddress}
                                             showTypeIcon={true}
                                         />
                                     }}/>

                        {row.contacts.length === 0 && <span className="text-sm text-muted-foreground">Internal</span>}
                    </div>,
                }, {
                    title: 'Type',
                    key: 'type',
                    render: (row: Activity) => <span className={'flex'}>
                    <ActivityTypeIcon type={row.type} baseType={row.baseType}/>
                        {!(row.baseType === ActivityType.SCHEDULED || row.baseType === ActivityType.TASK)
                            ? ActivityTypeNameMapping[row.baseType]
                            : (row.type != null
                                ? TaskScheduleTypeNameMapping[row.type]
                                : 'Unspecified'
                            )
                        }
                </span>
                }, {
                    title: 'Status',
                    key: 'status',
                    render: (row: Activity) => <ActivityStatusBadge status={row.status}/>
                }, {
                    title: 'Priority',
                    key: 'priority',
                    render: (row: Activity) => <Badge
                        className={`${PriorityColors[row.priority]}`}>{ActivityPriorityNameMapping[row.priority]}</Badge>,
                    sortable: true
                }, {
                    title: 'Start Date',
                    key: 'startDate',
                    render: (row: Activity) => <DateRenderer date={row.startDate} includeTime={row.baseType === ActivityType.SCHEDULED}/>,
                    sortable: true
                }, {
                    title: 'Due Date',
                    key: 'endDate',
                    render: (row: Activity) => <DateRenderer date={row.endDate} includeTime={row.baseType === ActivityType.SCHEDULED}/>,
                    sortable: true
                }, {
                    title: 'Assignees',
                    key: 'users',
                    render: (row: Activity) => <EnglishList strs={row.users}/>,
                }, {
                    title: 'Actions',
                    key: 'actions',
                    render: (row: Activity) => (
                        <div className={'flex items-center'}>
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setAddingNote(row.guid)}>
                                            <Plus className="h-4 w-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Add Note
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setViewing(row.guid)}>
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Edit {ActivityTypeNameMapping[row.baseType]}
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DeleteButton guid={row.guid} baseType={row.baseType}/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Delete {ActivityTypeNameMapping[row.baseType]}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )
                }]} pageable onPageChange={setPage} onPerPageChange={setPerPage} perPage={perPage} page={page}
                setSortBy={setSortBy} sortBy={sortBy}/>
        }
    }

    const handleSave = async () => {
        if (addingNote == null) {
            return;
        }

        const result = handleServerAction(await createNote(addingNote!, note));
        if (result.success) {
            toast.success('Note saved')
            setNote('')
            setAddingNote(null)
            await queryClient.invalidateQueries({
                queryKey: ['infinite-list', `feed-${addingNote}`]
            })
        }
    }

    const result = <div className="container w-4/5 mx-auto py-10">
        {
            viewing != null && <ValidationProvider>
                <ActivityDialog
                    open={true}
                    setOpen={(open) => {
                        if (!open) {
                            setViewing(null)
                        }
                    }}
                    toLoad={viewing}
                    trigger={null}
                />
            </ValidationProvider>
        }
        <Dialog open={addingNote != null} onOpenChange={(open) => {
            if (!open) {
                setAddingNote(null)
            }
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Note</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-6 items-start gap-4">
                    <Label htmlFor="notes" className="text-right pt-2">
                        Notes
                    </Label>
                    <Textarea
                        id="notes"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="col-span-5"
                        placeholder="Add notes here..."
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                                // Create note
                                await handleSave();
                            }
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setAddingNote(null)}>Cancel</Button>
                    <Button onClick={handleSave}>Add Note</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <div className="mb-6 flex justify-between">
            <div>
                <h1 className="text-3xl font-bold mb-2">Search Activities</h1>
                <p className="text-muted-foreground">
                    Search for tasks, schedule items, flows, and one-off waypoints.
                </p>
            </div>
            <div>
                <ValidationProvider>
                    <ActivityDialog trigger={(
                        <Button variant={'linkHover2'} className={'force-border'}>
                            <Plus className="h-4 w-4 mr-2"/> New Activity
                        </Button>
                    )}/>
                </ValidationProvider>
            </div>
        </div>
        <div className="flex items-center space-x-2 mb-6">
            <Search className="w-5 h-5 text-muted-foreground"/>
            <Input
                type="text"
                placeholder="Search by name, email, or phone number"
                value={interimSearchTerm}
                onChange={handleSearch}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        confirmSearch()
                    }
                }}
                onBlur={confirmSearch}
                className="flex-grow"
            />
        </div>
        <div className="flex space-x-4 mb-6">
            <Select value={classificationFilter ?? 'null'} onValueChange={handleClassificationFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Classification"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Classifications</SelectItem>
                    {Object.keys(ActivityTypeNameMapping).map((name) => (
                        <SelectItem key={name} value={name}>
                            {ActivityTypeNameMapping[name as ActivityType]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={typeFilter ?? 'null'} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Type"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Types</SelectItem>
                    {Object.keys(TaskScheduleTypeNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{TaskScheduleTypeNameMapping[name as TaskScheduleType]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={statusFilter ?? 'null'} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Statuses</SelectItem>
                    {Object.keys(ActivityStatusNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{ActivityStatusNameMapping[name as ActivityStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={priorityFilter ?? 'null'} onValueChange={handlePriorityFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Priority"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Priorities</SelectItem>
                    {Object.keys(ActivityPriorityNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{ActivityPriorityNameMapping[name as ActivityPriority]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <ContactPicker modal={false} multi value={contactFilter} onValueChange={setContactFilter}
                           fieldPlaceholder={'Filter by Contact'}/>
            <UserPicker modal={false} multi value={assigneeFilter} onValueChange={setAssigneeFilter}
                        fieldPlaceholder={'Filter by Assignee'}/>
        </div>
        <div className="rounded-md border">
            {content}
        </div>
    </div>
    return result
}

export function ActivityStatusBadge({status}: { status: ActivityStatus }) {
    let icon = <></>;
    const color = ActivityStatusColors[status] ?? 'bg-gray-100 dark:bg-neutral-900 text-primary';
    const iconColor = (ActivityStatusIconColors[status] ?? 'text-primary-foreground') + ' hover:text-white';

    const classes = `w-5 h-5 ${iconColor} mr-2`

    if (status == null) {
        icon = <CircleHelp className={classes}/>
    }

    switch (status) {
        case ActivityStatus.NOT_STARTED:
            icon = <CircleAlert className={classes}/>
            break;

        case ActivityStatus.ASSIGNED:
            icon = <UserCircle className={classes}/>
            break;

        case ActivityStatus.IN_PROGRESS:
            icon = <Clock className={classes}/>
            break;

        case ActivityStatus.WAITING_FOR_INFO:
            icon = <Info className={classes}/>
            break;

        case ActivityStatus.CANCELLED:
            icon = <BanIcon className={classes}/>
            break;

        case ActivityStatus.COMPLETED:
            icon = <CheckCircle className={classes}/>
            break;

        case ActivityStatus.REASSIGNED:
            icon = <UserCog className={classes}/>
            break;

        case ActivityStatus.PENDING_APPROVAL:
            icon = <CircleEllipsis className={classes}/>
            break;

        case ActivityStatus.IN_REVIEW:
            icon = <ScanEye className={classes}/>
            break;

        case ActivityStatus.PAUSED:
            icon = <CirclePause className={classes}/>
            break;

        case ActivityStatus.SCHEDULED:
            icon = <Calendar className={classes}/>
            break;
    }

    return <Badge
        className={`${color} hover:bg-[#333333] dark:hover:bg-[#333333] hover:text-white dark:hover:text-white text-nowrap`}>
        {icon} {status != null ? ActivityStatusNameMapping[status] : 'Unspecified'}
    </Badge>
}

function DeleteButton({guid, baseType}: { guid: string, baseType: ActivityType }) {
    const {confirm, confirmation} = useConfirmation();
    const queryClient = useQueryClient()

    return <>
        {confirmation}
        <Button variant={'ghost'} size="icon"
                onClick={() => confirm(`Are you sure you want to delete this ${ActivityTypeNameMapping[baseType]}?`, async () => {
                    const result = handleServerAction(await deleteActivity(guid));
                    if (result.success) {
                        await queryClient.invalidateQueries({
                            queryKey: ['activityTable']
                        })
                    }
                })}>
            <Trash2 className="h-4 w-4 text-destructive"/>
        </Button>
    </>
}