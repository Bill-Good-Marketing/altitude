'use client'
import React, {useEffect, useState} from "react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "~/components/ui/table";
import {Button} from "~/components/ui/button";
import {ChevronDown, ChevronUp, Edit, Mail, Phone, Plus, Trash2} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog";
import {FeedItem, FeedWithItems} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {Picker} from "~/components/data/Picker";
import {handleServerAction} from "~/util/api/client/APIClient";
import {readContact} from "~/common/actions/read";
import {CompanyRelationshipStatus, CompanyRelationshipStatusNameMapping, ContactType} from "~/common/enum/enumerations";
import {useAsyncRouter} from "~/util/useRouterRefresh";
import {addEmployee, deleteEmployee, updateEmployee} from "~/app/(authenticated)/contacts/[guid]/components/Actions";
import {FormField} from "~/components/form/FormUtils";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {Input} from "~/components/ui/input";
import EmailQuickAction, {NameEmail} from "~/components/quick_actions/Email";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {isEmptyString} from "~/util/strings";
import CallQuickAction from "~/components/quick_actions/Call";
import {toast} from "sonner";
import {usePrevious} from "~/hooks/use-previous";
import {useConfirmation} from "~/hooks/use-confirmation";


type Employee = {
    id: string,
    name: string,
    position?: string | null,
    email: string,
    phone: string,
    recentInteractions: FeedItem[]
    primaryAddress: {
        city: string,
        state: string,
        country: string,
        tz: string | null,
    } | null,
    companyRelationship: CompanyRelationshipStatus | null
}

type Props = {
    employees: Employee[];
    sender: NameEmail;
}

export const EmployeeTable = ({employees, sender}: Props) => {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
    const [editing, setEditing] = useState<Employee | null>(null)

    const previousRelation = usePrevious(editing?.companyRelationship)

    useEffect(() => {
        if (editing == null) return;
        const {companyRelationship, position} = editing

        if (companyRelationship !== CompanyRelationshipStatus.EMPLOYEE && isEmptyString(position) && companyRelationship) {
            setEditing(prev => ({...prev!, position: CompanyRelationshipStatusNameMapping[companyRelationship]}))
        } else if (previousRelation != null && position === CompanyRelationshipStatusNameMapping[previousRelation]) {
            if (companyRelationship === CompanyRelationshipStatus.EMPLOYEE) {
                setEditing(prev => ({...prev!, position: null}))
            } else if (companyRelationship != null) {
                setEditing(prev => ({...prev!, position: CompanyRelationshipStatusNameMapping[companyRelationship]}))
            }
        }
    }, [editing?.companyRelationship])

    const {confirm, confirmation} = useConfirmation()

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({...prev, [id]: !prev[id]}))
    }

    const router = useAsyncRouter()

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.map((employee) => (
                        <React.Fragment key={employee.id}>
                            <TableRow>
                                <TableCell>
                                    <Button variant="ghost" size="sm" onClick={() => toggleRow(employee.id)}>
                                        {expandedRows[employee.id] ? <ChevronUp className="h-4 w-4"/> :
                                            <ChevronDown className="h-4 w-4"/>}
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <a href={`/contacts/${employee.id}`} className="font-medium hover:underline">{employee.name}</a>
                                </TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>{employee.phone}</TableCell>
                                <TableCell>
                                    <div className="flex space-x-2">
                                        <TooltipProvider delayDuration={0}>
                                            {!isEmptyString() && <EmailQuickAction sender={sender} to={[{
                                                guid: employee.id,
                                                fullName: employee.name,
                                                primaryEmail: employee.email,
                                                type: ContactType.INDIVIDUAL
                                            }]} trigger={
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Button variant={'ghost'} size={'icon'}>
                                                            <Mail className="h-4 w-4"/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Email</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            }/>}
                                            {!isEmptyString(employee.phone) &&
                                                <CallQuickAction
                                                    contact={{
                                                        guid: employee.id,
                                                        name: employee.name,
                                                        phone: employee.phone,
                                                        tz: employee.primaryAddress?.tz ?? null,
                                                        city: employee.primaryAddress?.city ?? null,
                                                        state: employee.primaryAddress?.state ?? null,
                                                        country: employee.primaryAddress?.country ?? null,
                                                    }}
                                                    trigger={<Tooltip>
                                                        <TooltipTrigger>
                                                            <Button variant={'ghost'} size={'icon'}>
                                                                <Phone className="h-4 w-4"/>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Call</p>
                                                        </TooltipContent>
                                                    </Tooltip>}
                                                />}
                                        </TooltipProvider>
                                        <Button variant={'ghost'} size={'icon'} onClick={() => setEditing(employee)}>
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                        <Button variant={'ghost'} size={'icon'}
                                                onClick={() => confirm(`Are you sure you want to delete ${employee.name}?`, async () => {
                                                    const result = handleServerAction(await deleteEmployee(employee.id));
                                                    if (result.success) {
                                                        await router.refresh();
                                                        toast.info(`Removed ${employee.name} from company`)
                                                    }
                                                }, 'Delete Employee')}>
                                            <Trash2 className="text-destructive h-4 w-4"/>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            {expandedRows[employee.id] && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Recent Interactions</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <FeedWithItems items={employee.recentInteractions}/>
                                            </CardContent>
                                        </Card>
                                    </TableCell>
                                </TableRow>
                            )}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={editing != null} onOpenChange={(open) => {
                if (!open) {
                    setEditing(null)
                }
            }}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Edit Employee</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <FormField label={'Employee'} htmlFor="name" grid={false}>
                            <Input
                                id="name"
                                value={editing?.name ?? ''}
                                readOnly
                            />
                        </FormField>
                        <FormField label={'Position'} htmlFor="position" grid={false}>
                            <Input
                                id="position"
                                value={editing?.position ?? ''}
                                onChange={(e) => setEditing(prev => ({...prev!, position: e.target.value}))}
                                placeholder="Enter position..."
                            />
                        </FormField>
                        <FormField label={'Relation to Company'} htmlFor="relationship" grid={false}>
                            <Select
                                name="relationship"
                                value={editing?.companyRelationship ?? ''}
                                onValueChange={(value) => setEditing(prev => ({
                                    ...prev!,
                                    companyRelationship: value as CompanyRelationshipStatus
                                }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select relationship"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(CompanyRelationshipStatusNameMapping).map((status) => (
                                        <SelectItem key={status}
                                                    value={status}>{CompanyRelationshipStatusNameMapping[status as CompanyRelationshipStatus]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    </div>

                    <DialogFooter>
                        <Button variant="destructive" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button variant="linkHover2" className={'force-border'} onClick={async () => {
                            if (editing == null) return;
                            const result = handleServerAction(await updateEmployee(editing.id, editing.position ?? null, editing.companyRelationship ?? null));
                            if (result.success) {
                                await router.refresh();
                                toast.info(`Updated ${editing.name}`)
                                setEditing(null);
                            }
                        }}>Complete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {confirmation}
        </>
    )
}

export function EmployeeAddButton({
                                      contact
                                  }: {
    contact: string
}) {
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [position, setPosition] = useState<string | null>(null)
    const [companyRelationship, setCompanyRelationship] = useState<CompanyRelationshipStatus>(CompanyRelationshipStatus.EMPLOYEE)
    const previousRelation = usePrevious(companyRelationship)
    const [isOpen, setIsOpen] = useState(false)

    type Employee = {
        guid: string,
        fullName: string,
        primaryEmail: string | null
    }

    useEffect(() => {
        if (!isOpen) {
            setSelectedEmployee(null)
            setPosition(null)
            setCompanyRelationship(CompanyRelationshipStatus.EMPLOYEE)
        }
    }, [isOpen])

    useEffect(() => {
        if (companyRelationship !== CompanyRelationshipStatus.EMPLOYEE && isEmptyString(position)) {
            setPosition(CompanyRelationshipStatusNameMapping[companyRelationship])
        } else if (position === CompanyRelationshipStatusNameMapping[previousRelation]) {
            if (companyRelationship === CompanyRelationshipStatus.EMPLOYEE) {
                setPosition(null)
            } else setPosition(CompanyRelationshipStatusNameMapping[companyRelationship])
        }
    }, [companyRelationship])

    const router = useAsyncRouter()

    const submit = async () => {
        if (selectedEmployee == null) {
            return toast.error('Please select an employee')
        }

        const result = handleServerAction(await addEmployee(contact, selectedEmployee.guid, position, companyRelationship))
        if (result.success) {
            await router.refresh()
            toast.success(`Added ${selectedEmployee.fullName} to company`)
            setIsOpen(false)
        }
    }

    return <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button variant={'linkHover2'} className={'force-border'}><Plus className="mr-2 h-4 w-4"/>Add Employee</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
                <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>

            <FormField grid={false} label={'Contact'} htmlFor="contact">
                <Picker<Employee>
                    dialog
                    name={'employee'}
                    trigger={{
                        placeholder: 'Select employee',
                        nameKey: 'fullName',
                    }}
                    search={async (search, page, perPage) => {
                        const result = handleServerAction(await readContact(search, page, perPage, ['fullName', 'primaryEmail'], {
                            type: ContactType.INDIVIDUAL,
                        }))

                        if (!result.success) {
                            throw new Error(`Error reading contacts: ${result.message}`);
                        }
                        return result.result!;
                    }}
                    title={'Pick an employee'}
                    searchPlaceholder={'Search contacts...'}
                    datatable={{
                        idKey: 'guid',
                        columns: [{
                            title: 'Name',
                            key: 'fullName',
                        }, {
                            title: 'Email',
                            key: 'primaryEmail',
                        }]
                    }}
                    dataTypeName={'contact'}
                    pickerKey={'contacts'}
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                />
            </FormField>

            <FormField grid={false} label={'Position'} htmlFor="position">
                <Input
                    id="position"
                    value={position ?? ''}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Enter position"
                />
            </FormField>
            <FormField grid={false} label={'Relation to Company'} htmlFor="relationship">
                <Select
                    name="relationship"
                    value={companyRelationship}
                    onValueChange={(value) => setCompanyRelationship(value as CompanyRelationshipStatus)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select relationship"/>
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(CompanyRelationshipStatusNameMapping).map((status) => (
                            <SelectItem key={status}
                                        value={status}>{CompanyRelationshipStatusNameMapping[status as CompanyRelationshipStatus]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <DialogFooter>
                <Button variant="destructive" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button variant="linkHover2" className={'force-border'} onClick={submit}>Complete</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}