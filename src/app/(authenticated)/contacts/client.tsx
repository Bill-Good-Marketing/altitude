'use client';
import {Building, Calendar, Edit, House, Mail, Phone, Search, Trash2, UserRound} from "lucide-react";
import {Input} from "~/components/ui/input";
import React, {useEffect, useState} from "react";
import {Avatar, AvatarFallback} from "~/components/ui/avatar";
import Link from "next/link";
import {Badge} from "~/components/ui/badge";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {Button} from "~/components/ui/button";
import {
    ContactStatus,
    ContactStatusNameMapping,
    ContactType,
    ContactTypeNameMapping,
    HouseholdRelationshipStatus,
    HouseholdRelationshipStatusNameMapping
} from "~/common/enum/enumerations";
import {useQuery} from "@tanstack/react-query";
import {deleteContact, searchContacts} from "~/app/(authenticated)/contacts/Actions";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {DataTable, ErroredDataTable, NoDataTable, Sort} from "~/components/data/DataTable";
import EditContactDialog, {NewContactButton} from "~/app/(authenticated)/contacts/[guid]/components/ContactForm";
import {useConfirmation} from "~/hooks/use-confirmation";
import {useRouter} from "next/navigation";
import {handleServerAction} from "~/util/api/client/APIClient";
import {ValidationProvider} from "~/components/data/ValidationProvider";
import {FeedItem, FeedWithItems} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {badgeColors} from "~/common/ui/BadgeColors";
import EmailQuickAction from "~/components/quick_actions/Email";
import CallQuickAction from "~/components/quick_actions/Call";
import { usePersisted } from "~/hooks/use-persisted";

export type ContactSearchFilter = {
    type?: ContactType;
    status?: ContactStatus;
    householdStatus?: HouseholdRelationshipStatus;
}

export type ContactResult = {
    id: string;
    fullName: string;
    type: ContactType;
    status: ContactStatus;
    email: string | null;
    phone: string | null;
    city?: string;
    state?: string;
    tz?: string;
    country?: string;
    householdStatus?: HouseholdRelationshipStatus;
    members: { name: string, id: string, status: ContactStatus }[];
    companyName?: string;
    companyId?: string;
    position?: string;
    householdName?: string;
    householdId?: string;
    headOfHouseholdName?: string;
    headOfHouseholdId?: string;
    recentActivities: FeedItem[];
}

export function ClientPage({user}: {
    user: {
        guid: string,
        fullName: string,
        email: string
    }
}) {
    const [searchTerm, setSearchTerm] = usePersisted('')
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(25)

    const [interimSearchTerm, setInterimSearchTerm] = useState('')

    const [typeFilter, setTypeFilter] = usePersisted<ContactType | null>(null)
    const [statusFilter, setStatusFilter] = usePersisted<ContactStatus | null>(null)
    const [householdStatusFilter, setHouseholdStatusFilter] = usePersisted<HouseholdRelationshipStatus | null>(null)

    const [viewing, setViewing] = useState<{ guid: string, type: ContactType } | null>(null)

    const [initPersisted, setInitPersisted] = useState(false)

    useEffect(() => {
        if (initPersisted || searchTerm === '') {
            return
        }
        // Only on init in case there's a persisted value
        setInterimSearchTerm(searchTerm)
        setInitPersisted(true)
    }, [searchTerm, initPersisted])

    const [sortBy, setSortBy] = usePersisted<Sort<ContactResult>>({
        fullName: 'asc'
    })

    const [toCall, setToCall] = useState<ContactResult | null>(null)
    const [toEmail, setToEmail] = useState<ContactResult | null>(null)

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const term = event.target.value
        setInterimSearchTerm(term)
    }

    const confirmSearch = () => {
        setPage(1)
        setSearchTerm(interimSearchTerm)
    }

    const handleTypeFilter = (value: string) => {
        setPage(1)
        if (value === 'null') {
            setTypeFilter(null)
        } else {
            setTypeFilter(value as ContactType)
        }
    }

    const handleStatusFilter = (value: string) => {
        setPage(1)
        if (value === 'null') {
            setStatusFilter(null)
        } else {
            setStatusFilter(value as ContactStatus)
        }
    }

    const handleHouseholdStatusFilter = (value: string) => {
        setPage(1)
        if (value === 'null') {
            setHouseholdStatusFilter(null)
        } else {
            setHouseholdStatusFilter(value as HouseholdRelationshipStatus)
        }
    }

    const {data, isError, error} = useQuery({
        queryKey: ['contacts', searchTerm, typeFilter, statusFilter, householdStatusFilter, page, perPage, sortBy],
        queryFn: async () => {
            const result = handleServerAction(await searchContacts(searchTerm, page, perPage, sortBy, {
                type: typeFilter ?? undefined,
                status: statusFilter ?? undefined,
                householdStatus: householdStatusFilter ?? undefined
            }))

            if (!result.success) {
                throw new Error(`Error searching contacts: ${result.message}`)
            }

            return result.result
        },
    })

    let content: React.ReactNode
    if (isError || data == null) {
        content =
            <ErroredDataTable columns={['Name', 'Type', 'Status', 'Contact Info', 'Location', 'Actions']} expandable
                              message={error?.message ?? 'Error loading contacts'}/>
    } else {
        const [rows, recordCount] = data

        if (recordCount === 0) {
            content = <NoDataTable columns={['Name', 'Type', 'Status', 'Contact Info', 'Location', 'Actions']} expandable
                                   dataTypeName={'contact'} clearSearch={() => {
                setSearchTerm('')
                setInterimSearchTerm('')
                setPage(1)
                setPerPage(25)
                setTypeFilter(null)
                setStatusFilter(null)
                setHouseholdStatusFilter(null)
            }}/>
        } else if (!isError) {
            // content = <Table>
            //     <TableHeader>
            //         <TableRow>
            //             <TableHead>Name</TableHead>
            //             <TableHead>Type</TableHead>
            //             <TableHead>Status</TableHead>
            //             <TableHead>Contact Info</TableHead>
            //             <TableHead>Location</TableHead>
            //             <TableHead>Actions</TableHead>
            //         </TableRow>
            //     </TableHeader>
            //     <SearchContents rows={rows}/>
            //     <TableFooter>
            //         <TablePagination page={page} maxPage={maxPage} perPage={perPage} setPage={setPage}
            //                          setPerPage={setPerPage}/>
            //     </TableFooter>
            // </Table>
            content = <DataTable
                height={'70vh'}
                data={rows} count={recordCount} idKey={'id'} columns={[{
                title: 'Name',
                key: 'fullName',
                render: (entity: ContactResult) => (
                    <div className="flex items-center">
                        <Link href={`/contacts/${entity.id}`}>
                            <Avatar className="h-10 w-10 mr-4">
                                <AvatarFallback>
                                    {entity.type === ContactType.INDIVIDUAL &&
                                        <UserRound className="h-4/5 w-4/5"/>}
                                    {entity.type === ContactType.HOUSEHOLD &&
                                        <House className="h-4/5 w-4/5"/>}
                                    {entity.type === ContactType.COMPANY &&
                                        <Building className="h-4/5 w-4/5"/>}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <Link href={`/contacts/${entity.id}`}
                                  className="font-medium hover:underline">
                                {entity.fullName}
                            </Link>
                            {(entity.type === ContactType.INDIVIDUAL && entity.householdStatus && entity.headOfHouseholdId && entity.householdId) && (
                                entity.householdStatus === HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD ?
                                    <div
                                        className="text-sm text-muted-foreground">
                                        {HouseholdRelationshipStatusNameMapping[entity.householdStatus!]} of <a
                                        className="text-blue-400 font-bold hover:underline hover:text-blue-600"
                                        href={`/contacts/${entity.householdId}`}>{entity.householdName}</a>
                                    </div>
                                    : <div
                                        className="text-sm text-muted-foreground">
                                        {HouseholdRelationshipStatusNameMapping[entity.householdStatus!]} of <a
                                        className="text-blue-400 font-bold hover:underline hover:text-blue-600"
                                        href={`/contacts/${entity.headOfHouseholdId}`}>{entity.headOfHouseholdName}</a> in <a
                                        className="text-blue-400 font-bold hover:underline hover:text-blue-600"
                                        href={`/contacts/${entity.householdId}`}>{entity.householdName}</a>
                                    </div>
                            )}

                            {(entity.type === ContactType.INDIVIDUAL && entity.companyName && entity.position) &&
                                <div
                                    className="text-sm text-muted-foreground">
                                    <b>{entity.position}</b>
                                    @ <a
                                    className="text-blue-400 font-bold hover:underline hover:text-blue-600"
                                    href={`/contacts/${entity.companyId}`}>{entity.companyName}</a>
                                </div>}

                            {(entity.members.length > 0 &&
                                <div
                                    className="text-sm text-muted-foreground">
                                    {entity.members.map((member, idx) => {
                                        let combiner = ', '
                                        if (idx === entity.members.length - 2 && entity.members.length > 2) {
                                            combiner = ', and '
                                        } else if (idx === entity.members.length - 1) {
                                            combiner = ''
                                        }

                                        if (member.id === 'others') {
                                            return <span
                                                key={idx}>
                                                                {combiner}
                                                <span className="font-bold">others</span>
                                                            </span>
                                        }

                                        let link = `/contacts/${member.id}`
                                        if (entity.type === ContactType.COMPANY && member.status !== ContactStatus.PLAN_PARTICIPANT) {
                                            link = `/contacts/${member.id}?company=true`
                                        }

                                        return <span
                                            key={idx}>
                                                            <a className="text-blue-400 font-bold hover:underline hover:text-blue-600"
                                                               href={link}>{member.name}</a>
                                            {combiner}</span>
                                    })} {entity.members.length > 1 ? 'are' : 'is'} {entity.type === ContactType.HOUSEHOLD ? (entity.members.length > 1 ? 'household members' : 'a household member') : (entity.members.length > 1 ? 'employees' : 'an employee')}
                                </div>)}
                        </div>
                    </div>
                ),
                sortable: true
            }, {
                title: 'Type',
                key: 'type',
                render: (row: ContactResult) => ContactTypeNameMapping[row.type],
                sortable: true
            }, {
                title: 'Status',
                key: 'status',
                render: (entity: ContactResult) => (
                    <Badge className={`${badgeColors[entity.status]} text-white text-nowrap`}>
                        {ContactStatusNameMapping[entity.status]}
                    </Badge>
                ),
                sortable: true
            }, {
                title: 'Contact Info',
                key: 'primaryEmail',
                render: (entity: ContactResult) => (
                    <div className="flex flex-col">
                        {entity.email != null && <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-muted-foreground"/>
                            <span className="text-sm">{entity.email}</span>
                        </div>}
                        {entity.phone != null && <div className="flex items-center mt-1">
                            <Phone className="w-4 h-4 mr-2 text-muted-foreground"/>
                            <span className="text-sm">{entity.phone}</span>
                        </div>}
                        {(entity.email == null && entity.phone == null) && 'No contact info'}
                    </div>
                ),
            }, {
                title: 'Location',
                key: 'location',
                render: (entity: ContactResult) => (
                    <div className="text-sm">{[entity.city, entity.state].filter(Boolean).join(', ')}</div>
                ),
            }, {
                title: 'Actions',
                key: 'actions',
                render: (entity: ContactResult) => (
                    <div className="flex flex-row space-x-2">
                        <TooltipProvider delayDuration={0}>
                            {entity.phone != null &&
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setToCall(entity)}>
                                            <Phone className="h-4 w-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Call</p>
                                    </TooltipContent>
                                </Tooltip>
                            }
                            {entity.email != null &&
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setToEmail(entity)}>
                                            <Mail className="h-4 w-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Email</p>
                                    </TooltipContent>
                                </Tooltip>
                            }
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Calendar className="h-4 w-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Schedule Meeting</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant='ghost' size="icon" onClick={() => setViewing({
                                        guid: entity.id,
                                        type: entity.type
                                    })}>
                                        <Edit className="h-4 w-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Edit</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                ),
            }]} expandable expandedRender={(entity) => {
                return <>
                    <h3 className="font-semibold mb-2">Recent Activities</h3>
                    <FeedWithItems items={entity.recentActivities}/>
                </>
            }} pageable pageSizeOptions={[10, 25, 50, 100]} onPageChange={setPage} onPerPageChange={setPerPage}
                perPage={perPage} page={page} sortBy={sortBy} setSortBy={setSortBy}/>
        }
    }


    return <div className="container w-4/5 mx-auto py-10">
        {
            viewing != null && <ValidationProvider>
                <EditContactDialog
                    type={viewing.type}
                    open={true}
                    setOpen={(open) => {
                        if (!open) {
                            setViewing(null)
                        }
                    }}
                    toLoad={viewing.guid}
                    trigger={<></>}
                />
            </ValidationProvider>
        }
        {(toCall != null && toCall.phone != null) &&
            <CallQuickAction
                trigger={null}
                isOpen={true}
                setOpen={(open) => {
                    if (!open) {
                        setToCall(null)
                    }
                }}
                contact={{
                    guid: toCall.id,
                    name: toCall.fullName!,
                    phone: toCall.phone,
                    tz: toCall.tz ?? null,
                    city: toCall.city ?? null,
                    state: toCall.state ?? null,
                    country: toCall.country ?? null,
                }}/>
        }
        {(toEmail != null && toEmail.email != null) &&
            <EmailQuickAction
                open={true}
                setOpen={(open) => {
                    if (!open) {
                        setToEmail(null)
                    }
                }}
                sender={{
                    guid: user.guid,
                    name: user.fullName,
                    email: user.email
                }} to={[{
                guid: toEmail.id,
                fullName: toEmail.fullName!,
                primaryEmail: toEmail.email,
                type: ContactType.INDIVIDUAL // Type is irrelevant for this case
            }]} trigger={null}/>
        }
        <div className="mb-6 flex justify-between">
            <div>
                <h1 className="text-3xl font-bold mb-2">Search Contacts</h1>
                <p className="text-muted-foreground">
                    Search for contacts, households, and companies.
                </p>
            </div>
            <div>
                <NewContactButton/>
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
            <Select value={typeFilter ?? 'null'} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Type"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Types</SelectItem>
                    {Object.keys(ContactTypeNameMapping).map((name) => (
                        <SelectItem key={name} value={name}>{ContactTypeNameMapping[name as ContactType]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={statusFilter ?? 'null'} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Statuses</SelectItem>
                    {Object.keys(ContactStatusNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{ContactStatusNameMapping[name as ContactStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={householdStatusFilter ?? 'null'} onValueChange={handleHouseholdStatusFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Household Status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Household Statuses</SelectItem>
                    {Object.keys(HouseholdRelationshipStatusNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{HouseholdRelationshipStatusNameMapping[name as HouseholdRelationshipStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="rounded-md border">
            {content}
        </div>
    </div>
}

export function DeleteContactButton({contact, name}: { contact: string, name: string }) {
    const {confirm, confirmation} = useConfirmation();
    const router = useRouter();

    return <>
        {confirmation}
        <Button variant={'ghost'} onClick={() => confirm(`Are you sure you want to delete ${name}?`, async () => {
            const result = handleServerAction(await deleteContact(contact));
            if (result.success) {
                router.push('/contacts');
                return;
            }
        }, 'Delete Contact')}>
            <Trash2 className="h-4 w-4 text-destructive"/>
        </Button>
    </>
}