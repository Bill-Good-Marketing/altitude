"use client"

import React, {useEffect, useState} from "react"
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog"
import {Button} from "~/components/ui/button"
import {Input} from "~/components/ui/input"
import {Label} from "~/components/ui/label"
import {Textarea} from "~/components/ui/textarea"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Switch} from "~/components/ui/switch"
import {Building, Edit, Globe, House, Plus, Trash, User} from "lucide-react"
import {ScrollArea} from "~/components/ui/scroll-area"
import {
    AddressType,
    AddressTypeNameMapping,
    CompanyRelationshipStatus,
    CompanyRelationshipStatusNameMapping,
    ContactStatus,
    ContactStatusNameMapping,
    ContactType,
    ContactTypeNameMapping,
    HouseholdRelationshipStatus,
    HouseholdRelationshipStatusNameMapping,
    ImportantDateType,
    ImportantDateTypeNameMapping,
    LifecycleStage,
    LifecycleStageNameMapping,
    PhoneType,
    PhoneTypeNameMapping
} from "~/common/enum/enumerations";
import {handleServerAction} from "~/util/api/client/APIClient";
import {toast} from "sonner";
import {Picker} from "~/components/data/Picker"
import {readContact} from "~/common/actions/read";
import {createContact, getEditContact, updateContact} from "~/app/(authenticated)/contacts/[guid]/components/Actions";
import {ClientSideReadResult} from "~/db/sql/types/utility";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "~/components/ui/dropdown-menu";
import {englishList, formatPhoneNumber, isEmptyString, isPhoneNumber} from "~/util/strings";
import {useRouter} from "next/navigation";
import {validateEmail} from "~/util/db/validation";
import {RequiredString, Validation, ValidationProvider} from "~/components/data/ValidationProvider";
import {useValidation} from "~/hooks/use-validation";
import {useStateRef} from "~/hooks/use-state-ref";
import {FormField} from "~/components/form/FormUtils"
import {ContactAdder} from "~/components/data/pickers/adders/ContactAdder"
import SkeletonForm from "~/components/util/SkeletonForm";
import {useContactSelection} from "../ClientNavContext"
import {getTimezone} from "~/common/actions/timezone";
import {isCountrySupported, normalizeCountry, normalizeState, timezoneStateLookup} from "~/util/time/tzutils";

interface Email {
    guid?: string;
    email: string;
    isPrimary: boolean;
}

interface Phone {
    guid?: string;
    number: string;
    type: PhoneType;
    isPrimary: boolean;
}

interface ClientAddress {
    guid?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    type: AddressType;
    primary: boolean;
    timezone?: string | null;
}

interface ImportantDate {
    guid?: string;
    date: string;
    type: ImportantDateType;
}

type ExistingEntity = {
    guid: string,
    fullName: string,
    primaryEmail: string | null
}

type NewEntity = {
    guid: '_new',
    fullName: string,
    primaryEmail: null
}

type ExistingIndividual = {
    guid: string,
    fullName: string,
    primaryEmail: string | null
    primaryPhone: string | null
}

type NewIndividual = {
    guid: '_new',
    fullName: string,
    primaryEmail: null,
    primaryPhone: null
}

export interface ClientContact {
    guid: string | null;
    firstName: string | null;
    lastName: string;
    household: ExistingEntity | null | NewEntity;
    company: ExistingEntity | null | NewEntity;
    headOfHousehold: ExistingIndividual | null | NewIndividual;
    primaryContact: ExistingIndividual | null | NewIndividual;
    position: string | null;
    emails: Email[];
    phones: Phone[];
    addresses: ClientAddress[];
    status: ContactStatus | null;
    lifecycleStage: LifecycleStage | null;
    importantDates: ImportantDate[];
    importantNotes: string | null;
    householdStatus: HouseholdRelationshipStatus | null;
    companyStatus: CompanyRelationshipStatus | null;
    industry: string | null,
    size: number | null,
    website: string | null
}

interface EditContactDialogProps {
    contact?: ClientContact | null;
    type: ContactType
    iconOnly?: boolean
    toLoad?: string; // Contact guid to load
    trigger?: React.ReactNode
    setOpen?: (open: boolean) => void
    open?: boolean
}

const defaultContact: ClientContact = {
    guid: null,
    firstName: null,
    lastName: '',
    household: null,
    company: null,
    position: null,
    headOfHousehold: null,
    primaryContact: null,
    emails: [],
    phones: [],
    addresses: [],
    status: null,
    lifecycleStage: null,
    importantDates: [],
    importantNotes: '',
    householdStatus: null,
    companyStatus: null,
    industry: null,
    size: null,
    website: null
}

export const INDIVIDUAL_ADDER_HEIGHT = 50;
export const ENTITY_ADDER_HEIGHT = -25;

export default function EditContactDialog({
                                              contact,
                                              type,
                                              iconOnly = false,
                                              toLoad,
                                              trigger,
                                              setOpen: onOpen,
                                              open: externalOpen
                                          }: EditContactDialogProps) {
    const [editedContact, setEditedContact] = useState<ClientContact>(contact ?? defaultContact)
    const editedContactRef = useStateRef(editedContact)
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const {selectedContact, setSelectedContact} = useContactSelection()

    const [newIndividual, setNewIndividual] = useState<NewIndividual & { fName: string, lName: string }>({
        guid: '_new',
        fullName: '',
        fName: '',
        lName: '',
        primaryEmail: null,
        primaryPhone: null,
    })

    const [newEntity, setNewEntity] = useState<NewEntity>({
        guid: '_new',
        fullName: '',
        primaryEmail: null,
    })

    const resetAddable = () => {
        setNewEntity({
            guid: '_new',
            fullName: '',
            primaryEmail: null,
        })
        setNewIndividual({
            guid: '_new',
            fullName: '',
            fName: '',
            lName: '',
            primaryEmail: null,
            primaryPhone: null,
        })
    }

    const updateNewIndividual = (fName: string, lName: string) => {
        setNewIndividual(prev => ({...prev, fullName: `${fName} ${lName}`, fName, lName}))
    }

    const updateNewEntity = (name: string) => {
        setNewEntity(prev => ({...prev, fullName: name}))
    }

    const {validate, resetValidation} = useValidation()

    useEffect(() => {
        if (externalOpen != null) {
            setOpen(externalOpen);
        }
    }, [externalOpen])

    useEffect(() => {
        if (contact) {
            setEditedContact(contact)
        }
    }, [contact])

    const handleOpenChange = (open: boolean) => {
        if (onOpen == null) {
            setOpen(open)
            return
        }
        onOpen(open)
    }

    const {isLoading, error, data} = useQuery<ClientContact | 'noload'>({
        queryKey: ['contact', open, toLoad],
        queryFn: async () => {
            if (toLoad && open && editedContact.guid == null) {
                const result = handleServerAction(await getEditContact(toLoad));
                if (!result.success) {
                    throw new Error(`Error reading contacts: ${result.message}`);
                }
                setEditedContact(result.result!);
                return result.result! as ClientContact;
            }
            return 'noload';
        },
        enabled: open && toLoad != null
    })

    useEffect(() => {
        if (open && data != null && data != 'noload' && editedContact.guid == null && (data as ClientContact).guid != null && toLoad == data.guid) {
            setEditedContact(data as ClientContact)
        }
    }, [open, data, toLoad, editedContact.guid])

    const queryClient = useQueryClient()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target
        setEditedContact(prev => ({...prev, [name]: value}))

        if (name === 'firstName' || name === 'lastName') {
            resetValidation(name)
        }
    }

    const handleSelectChange = (name: string, value: string) => {
        setEditedContact(prev => ({
            ...prev,
            [name]: value
        }))

        if (name === 'status') {
            resetValidation('status')
        }
    }

    const handleSave = async () => {
        const validation = validate();
        if (!validation[0]) {
            toast.error('Please fix the errors in your input')
            return
        }
        if (editedContact.guid) {
            const prevPrimaryAddress = contact!.addresses.find(address => address.primary) ?? contact!.addresses[0]
            const primaryAddress = editedContact.addresses.find(address => address.primary) ?? editedContact.addresses[0]
            const [result, primaryTZ] = await Promise.all([
                handleServerAction(await updateContact(editedContact)),
                (async () => {
                    let primaryTZ = null as string | null
                    if (primaryAddress && (prevPrimaryAddress.city !== primaryAddress.city || prevPrimaryAddress.state !== primaryAddress.state || prevPrimaryAddress.country !== primaryAddress.country)) {
                        if (!isCountrySupported(primaryAddress.country)) {
                            return null
                        }

                        const normalizedCountry = normalizeCountry(primaryAddress.country);
                        const normalizedState = normalizeState(normalizedCountry, primaryAddress.state);
                        if (timezoneStateLookup[normalizedCountry] == null) {
                            return null
                        } else if (timezoneStateLookup[normalizedCountry][normalizedState] != null) {
                            primaryTZ = timezoneStateLookup[normalizedCountry][normalizedState]
                        } else {
                            const tz = handleServerAction(await getTimezone(primaryAddress.city, normalizedState, normalizedCountry))
                            if (tz.success) {
                                primaryTZ = tz.result ?? null
                            }
                        }
                    } else if (prevPrimaryAddress.timezone != null) {
                        primaryTZ = prevPrimaryAddress.timezone
                    }
                    return primaryTZ
                })()
            ])
            if (result.success) {
                queryClient.invalidateQueries().then(() => {
                    handleOpenChange(false)
                    router.refresh()

                    if (selectedContact && selectedContact.guid === editedContact.guid) {
                        setSelectedContact({
                            guid: editedContact.guid,
                            fullName: (editedContact.firstName ? editedContact.firstName + ' ' : '') + (editedContact.lastName ? editedContact.lastName : ''),
                            primaryEmail: (editedContact.emails.find(email => email.isPrimary)?.email ?? editedContact.emails[0]?.email) ?? null,
                            primaryPhone: (editedContact.phones.find(phone => phone.isPrimary)?.number ?? editedContact.phones[0]?.number) ?? null,
                            type: type,
                            primaryAddress: primaryAddress ? {
                                city: primaryAddress.city,
                                state: primaryAddress.state,
                                country: primaryAddress.country,
                                tz: primaryTZ || null,
                            } : null
                        })
                    }
                })
            }
        } else {
            const result = handleServerAction(await createContact(type, editedContact))
            if (result.success) {
                queryClient.invalidateQueries().then(() => {
                    handleOpenChange(false)
                    router.refresh()
                })
            }
        }
    }

    const handleAddEmail = () => {
        setEditedContact(prev => ({
            ...prev,
            emails: [...prev.emails, {email: "", isPrimary: false}]
        }))
    }

    const handleRemoveEmail = (index: number) => {
        setEditedContact(prev => ({
            ...prev,
            emails: prev.emails.filter((_, i) => i !== index)
        }))

        for (let i = 0; i < editedContact.emails.length; i++) {
            resetValidation(`emails-${i}`)
        }
    }

    const handleEmailChange = (index: number, field: keyof Email, value: string | boolean) => {
        setEditedContact(prev => ({
            ...prev,
            emails: prev.emails.map((email, i) =>
                i === index ? {...email, [field]: value} : email
            )
        }))

        if (field === 'email') {
            resetValidation(`emails-${index}`)
        }
    }

    const handleAddPhone = () => {
        setEditedContact(prev => ({
            ...prev,
            phones: [...prev.phones, {number: "", type: PhoneType.HOME, isPrimary: false}]
        }))
    }

    const handleRemovePhone = (index: number) => {
        setEditedContact(prev => ({
            ...prev,
            phones: prev.phones.filter((_, i) => i !== index)
        }))

        for (let i = 0; i < editedContact.phones.length; i++) {
            resetValidation(`phones-${i}`)
        }
    }

    const handlePhoneChange = (index: number, field: keyof Phone, value: string | boolean) => {
        setEditedContact(prev => ({
            ...prev,
            phones: prev.phones.map((phone, i) =>
                i === index ? {...phone, [field]: value} : phone
            )
        }))

        if (field === 'number') {
            resetValidation(`phones-${index}`)
        }
    }

    const handleAddAddress = () => {
        setEditedContact(prev => ({
            ...prev,
            addresses: [...prev.addresses, {
                street: "",
                city: "",
                state: "",
                zip: "",
                country: "",
                type: AddressType.HOME,
                primary: false
            }]
        }))
    }

    const handleRemoveAddress = (index: number) => {
        setEditedContact(prev => ({
            ...prev,
            addresses: prev.addresses.filter((_, i) => i !== index)
        }))

        for (let i = 0; i < editedContact.addresses.length; i++) {
            resetValidation(`addresses-${i}`)
        }
    }

    const handleAddressChange = (index: number, field: keyof ClientAddress, value: string | boolean) => {
        setEditedContact(prev => ({
            ...prev,
            addresses: prev.addresses.map((address, i) =>
                i === index ? {...address, [field]: value} : address
            )
        }))

        resetValidation(`addresses-${index}`)

        if (field === 'zip') {
            resetValidation(`addresses-${index}-zip`)
        }
    }

    const handleAddImportantDate = () => {
        setEditedContact(prev => ({
            ...prev,
            importantDates: [...prev.importantDates, {date: "", type: ImportantDateType.BIRTHDAY}]
        }))
    }

    const handleRemoveImportantDate = (index: number) => {
        setEditedContact(prev => ({
            ...prev,
            importantDates: prev.importantDates.filter((_, i) => i !== index)
        }))

        resetValidation(`importantDates-${index}`)
    }

    const handleImportantDateChange = (index: number, field: keyof ImportantDate, value: string) => {
        setEditedContact(prev => ({
            ...prev,
            importantDates: prev.importantDates.map((date, i) =>
                i === index ? {...date, [field]: value} : date
            )
        }))

        if (field === 'date') {
            resetValidation(`importantDates-${index}`)
        }
    }

    type ReadResult = ClientSideReadResult<typeof readContact<['fullName', 'primaryEmail']>>

    let content = <div className="grid gap-4 py-4">
        {type === ContactType.INDIVIDUAL && <FormField label={'First Name'} htmlFor="firstName">
            <Input
                id="firstName"
                name="firstName"
                value={editedContact.firstName ?? ''}
                onChange={handleInputChange}
                className="col-span-3"
            />
            <RequiredString element={'firstName'} friendlyName={'First Name'} value={editedContact.firstName ?? ''}
                            render={(value) => (<>
                                <div/>
                                <p className={'text-red-500 col-span-3'}>{value}</p>
                            </>)}/>
        </FormField>}
        <FormField label={type === ContactType.INDIVIDUAL ? 'Last Name' : `${ContactTypeNameMapping[type]} Name`}
                   htmlFor="lastName">
            <Input
                id="lastName"
                name="lastName"
                value={editedContact.lastName}
                onChange={handleInputChange}
                className="col-span-3"
            />
            <RequiredString element={'lastName'}
                            friendlyName={type === ContactType.INDIVIDUAL ? 'Last Name' : `${ContactTypeNameMapping[type]} Name`}
                            value={editedContact.lastName ?? ''} render={(value) => (<>
                <div/>
                <p className={'text-red-500 col-span-3'}>{value}</p>
            </>)}/>
        </FormField>
        {/* Companies and individuals can have a household */}
        {type !== ContactType.HOUSEHOLD && <FormField label={'Household'} htmlFor="household">
            <Picker
                pickerKey={'household-picker'}
                dialog
                name={'household'}
                value={editedContact.household}
                onValueChange={(value) => setEditedContact(prev => ({...prev, household: value}))}
                title="Select household"
                searchPlaceholder={'Search households...'}
                modalPopover={true}
                dataTypeName={'household'}
                search={async (search, page, perPage) => {
                    const result = handleServerAction(await readContact(search, page, perPage, ['fullName', 'primaryEmail'], {
                        type: ContactType.HOUSEHOLD,
                    }));
                    if (!result.success) {
                        throw new Error(`Error reading households: ${result.message}`);
                    }
                    return result.result!;
                }}
                searchKeys={[ContactType.HOUSEHOLD]}
                index={1}
                trigger={{
                    placeholder: 'Select household',
                    nameKey: 'fullName',
                    className: 'col-span-3',
                    render: (value: ReadResult) => (
                        <a href={`/contacts/${value.guid}`} className="font-medium hover:underline text-nowrap">
                            {value.fullName}
                        </a>
                    ),
                }}
                datatable={{
                    idKey: 'guid',
                    columns: [{
                        title: 'Name',
                        key: 'fullName',
                        render: (row: ReadResult) => (
                            <a href={`/contacts/${row.guid}`} className="font-medium hover:underline text-nowrap">
                                {row.fullName}
                            </a>
                        )
                    }, {
                        title: 'Email',
                        key: 'primaryEmail',
                    }],
                }}
                useAdder={true}
                adder={<ContactAdder type={ContactType.HOUSEHOLD} fName={''} lName={newEntity.fullName}
                                     onChange={(_, lName) => updateNewEntity(lName)}/>}
                adderHeight={ENTITY_ADDER_HEIGHT}
                add={() => {
                    if (newEntity.fullName.trim().length > 0) {
                        setEditedContact(prev => ({...prev, household: newEntity}))
                        resetAddable()
                    }
                }}
                cancelAdd={resetAddable}
                adderTitle={'Add Household'}
            />
        </FormField>}

        {type === ContactType.HOUSEHOLD && <FormField label={'Head of Household'} htmlFor="headOfHousehold">
            <Picker
                pickerKey={'headOfHousehold-picker'}
                dialog
                name={'headOfHousehold'}
                value={editedContact.headOfHousehold}
                onValueChange={(value) => setEditedContact(prev => ({...prev, headOfHousehold: value}))}
                title="Select Head of Household"
                searchPlaceholder={'Search contacts...'}
                modalPopover={true}
                dataTypeName={'contact'}
                search={async (search, page, perPage) => {
                    const result = handleServerAction(await readContact(search, page, perPage, ['fullName', 'primaryEmail', 'primaryPhone'], {
                        type: ContactType.INDIVIDUAL,
                    }));
                    if (!result.success) {
                        throw new Error(`Error reading contacts: ${result.message}`);
                    }
                    return result.result!;
                }}
                searchKeys={[ContactType.INDIVIDUAL]}
                index={1}
                trigger={{
                    placeholder: 'Select Head of Household',
                    nameKey: 'fullName',
                    className: 'col-span-3',
                    render: (value: ReadResult) => (
                        <a href={`/contacts/${value.guid}`} className="font-medium hover:underline text-nowrap">
                            {value.fullName}
                        </a>
                    ),
                }}
                datatable={{
                    idKey: 'guid',
                    columns: [{
                        title: 'Name',
                        key: 'fullName',
                        render: (row: ReadResult) => (
                            <a href={`/contacts/${row.guid}`} className="font-medium hover:underline text-nowrap">
                                {row.fullName}
                            </a>
                        )
                    }, {
                        title: 'Email',
                        key: 'primaryEmail',
                    }, {
                        title: 'Phone Number',
                        key: 'primaryPhone',
                    }],
                }}
                useAdder={true}
                adder={<ContactAdder type={ContactType.INDIVIDUAL} fName={newIndividual.fName}
                                     lName={newIndividual.lName}
                                     onChange={(fName, lName) => updateNewIndividual(fName, lName)}/>}
                adderHeight={INDIVIDUAL_ADDER_HEIGHT}
                add={() => {
                    if (newIndividual.fullName.trim().length > 0) {
                        setEditedContact(prev => ({
                            ...prev,
                            headOfHousehold: {
                                guid: '_new',
                                fullName: newIndividual.fullName,
                                primaryEmail: newIndividual.primaryEmail,
                                primaryPhone: newIndividual.primaryPhone,
                            }
                        }))
                        resetAddable()
                    }
                }}
                cancelAdd={resetAddable}
                adderTitle={'Add Individual'}
            />
        </FormField>}

        {editedContact.household != null &&
            <FormField label={'Relation to Head of Household'} htmlFor="householdStatus">
                <Select
                    name="householdStatus"
                    value={editedContact.householdStatus ?? ''}
                    onValueChange={(value) => setEditedContact(prev => ({
                        ...prev,
                        householdStatus: value as HouseholdRelationshipStatus | null
                    }))}
                >
                    <SelectTrigger className={'w-full'} id="householdStatus">
                        <SelectValue placeholder="Select status"/>
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(HouseholdRelationshipStatusNameMapping).map((status) => (
                            <SelectItem key={status}
                                        value={status}>{HouseholdRelationshipStatusNameMapping[status as HouseholdRelationshipStatus]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>}

        {type !== ContactType.COMPANY && <FormField label={'Company'} htmlFor="company">
            <Picker
                pickerKey={'company-picker'}
                dialog
                name={'company'}
                value={editedContact.company}
                onValueChange={(value) => setEditedContact(prev => ({...prev, company: value}))}
                title="Select company"
                searchPlaceholder={'Search companies...'}
                modalPopover={true}
                dataTypeName={'company'}
                search={async (search, page, perPage) => {
                    const result = handleServerAction(await readContact(search, page, perPage, ['fullName', 'primaryEmail'], {
                        type: ContactType.COMPANY,
                    }));
                    if (!result.success) {
                        throw new Error(`Error reading companies: ${result.message}`);
                    }
                    return result.result!;
                }}
                searchKeys={[ContactType.COMPANY]}
                index={1}
                trigger={{
                    placeholder: 'Select company',
                    nameKey: 'fullName',
                    className: 'col-span-3',
                    render: (value: ReadResult) => (
                        <a href={`/contacts/${value.guid}`} className="font-medium hover:underline">
                            {value.fullName}
                        </a>
                    ),
                }}
                datatable={{
                    idKey: 'guid',
                    columns: [{
                        title: 'Name',
                        key: 'fullName',
                        render: (row: ReadResult) => (
                            <a href={`/contacts/${row.guid}`} className="font-medium hover:underline text-nowrap">
                                {row.fullName}
                            </a>
                        )
                    }, {
                        title: 'Email',
                        key: 'primaryEmail',
                    }],
                }}
                useAdder={true}
                adder={<ContactAdder type={ContactType.COMPANY} fName={''} lName={newEntity.fullName}
                                     onChange={(_, lName) => updateNewEntity(lName)}/>}
                adderHeight={ENTITY_ADDER_HEIGHT}
                add={() => {
                    if (newEntity.fullName.trim().length > 0) {
                        setEditedContact(prev => ({...prev, household: newEntity}))
                        resetAddable()
                    }
                }}
                cancelAdd={resetAddable}
                adderTitle={'Add Company'}
            />
        </FormField>}

        {type === ContactType.COMPANY && <>
            <FormField label={'Primary Contact'} htmlFor="primaryContact">
                <Picker
                    pickerKey={'primaryContact-picker'}
                    dialog
                    name={'primaryContact'}
                    value={editedContact.primaryContact}
                    onValueChange={(value) => setEditedContact(prev => ({
                        ...prev,
                        primaryContact: value
                    }))}
                    title="Select Primary Contact"
                    searchPlaceholder={'Search contacts...'}
                    modalPopover={true}
                    dataTypeName={'contact'}
                    search={async (search, page, perPage) => {
                        const result = handleServerAction(await readContact(search, page, perPage, ['fullName', 'primaryEmail', 'primaryPhone'], {
                            type: ContactType.INDIVIDUAL,
                        }));
                        if (!result.success) {
                            throw new Error(`Error reading contacts: ${result.message}`);
                        }
                        return result.result!;
                    }}
                    searchKeys={[ContactType.INDIVIDUAL]}
                    index={1}
                    trigger={{
                        placeholder: 'Select Primary Contact',
                        className: 'col-span-3',
                        nameKey: 'fullName',
                        render: (value: ReadResult) => (
                            <a href={`/contacts/${value.guid}`} className="font-medium hover:underline">
                                {value.fullName}
                            </a>
                        ),
                    }}
                    datatable={{
                        idKey: 'guid',
                        columns: [{
                            title: 'Name',
                            key: 'fullName',
                            render: (row: ReadResult) => (
                                <a href={`/contacts/${row.guid}`}
                                   className="font-medium hover:underline">
                                    {row.fullName}
                                </a>
                            )
                        }, {
                            title: 'Email',
                            key: 'primaryEmail',
                        }, {
                            title: 'Phone Number',
                            key: 'primaryPhone',
                        }],
                    }}
                    useAdder={true}
                    adder={<ContactAdder type={ContactType.INDIVIDUAL} fName={newIndividual.fName}
                                         lName={newIndividual.lName}
                                         onChange={(fName, lName) => updateNewIndividual(fName, lName)}/>}
                    adderHeight={INDIVIDUAL_ADDER_HEIGHT}
                    add={() => {
                        if (newIndividual.fullName.trim().length > 0) {
                            setEditedContact(prev => ({
                                ...prev, headOfHousehold: {
                                    guid: '_new',
                                    fullName: newIndividual.fullName,
                                    primaryEmail: newIndividual.primaryEmail,
                                    primaryPhone: newIndividual.primaryPhone,
                                }
                            }))
                            resetAddable()
                        }
                    }}
                    cancelAdd={resetAddable}
                    adderTitle={'Add Individual'}
                />
            </FormField>
            <FormField label={'Industry'} htmlFor="industry">
                <Input
                    id="industry"
                    name="industry"
                    value={editedContact.industry ?? ''}
                    onChange={handleInputChange}
                    placeholder="Enter industry"
                />
            </FormField>
            <FormField label={'Size'} htmlFor="size">
                <Input
                    id="size"
                    name="size"
                    value={editedContact.size == null || isNaN(editedContact.size) || editedContact.size < 0 ? '' : editedContact.size.toString()}
                    onChange={(event) => {
                        const _val = event.target.value;
                        if (!isNaN(parseInt(_val))) {
                            setEditedContact(prev => ({...prev, size: parseInt(_val)}));
                        }
                    }}
                    placeholder="Enter size"
                />
            </FormField>
            <FormField label={'Website'} htmlFor="website" prefix={<Globe/>}>
                <Input
                    id="website"
                    name="website"
                    value={editedContact.website ?? ''}
                    onChange={handleInputChange}
                    placeholder="Enter website"
                />
            </FormField>
        </>}

        {editedContact.company != null && <FormField label={'Relation to Company'} htmlFor="companyStatus">
            <Select
                name="companyStatus"
                value={editedContact.companyStatus ?? ''}
                onValueChange={(value) => setEditedContact(prev => ({
                    ...prev,
                    companyStatus: value as CompanyRelationshipStatus | null
                }))}
            >
                <SelectTrigger className={'w-full col-span-3'}>
                    <SelectValue placeholder="Select status"/>
                </SelectTrigger>
                <SelectContent>
                    {Object.keys(CompanyRelationshipStatusNameMapping).map((status) => (
                        <SelectItem key={status}
                                    value={status}>{CompanyRelationshipStatusNameMapping[status as CompanyRelationshipStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Validation value={editedContact.companyStatus} validator={(value: string | null) => {
                if (editedContactRef.current.company != null && value == null) {
                    return 'Company relationship is required'
                }
                return true
            }} element={'companyStatus'} render={(value) => (<>
                <div/>
                <p className={'text-red-500 col-span-3'}>{value}</p>
            </>)}/>
        </FormField>}

        {editedContact.company != null && <FormField label={'Position'} htmlFor="position">
            <Input
                id="position"
                name="position"
                value={editedContact.position ?? ''}
                onChange={handleInputChange}
                className="col-span-3"
            />
        </FormField>}

        <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Emails</Label>
            <div className="col-span-3 space-y-2">
                {editedContact.emails.map((email, index) => (
                    <div key={index}>
                        <div className="flex items-center space-x-2">
                            <Input
                                id={`emails-${index}`}
                                value={email.email}
                                onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                                placeholder="Email address"
                            />
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={email.isPrimary}
                                    onCheckedChange={(checked) => handleEmailChange(index, 'isPrimary', checked)}
                                />
                                <Label>Primary</Label>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveEmail(index)}
                            >
                                <Trash className="h-4 w-4"/>
                            </Button>
                        </div>

                        <Validation value={email.email} validator={(email: string) => {
                            if (isEmptyString(email)) {
                                return 'Email cannot be empty'
                            } else if (!validateEmail(email)) {
                                return 'Invalid email address'
                            }
                            return true
                        }} element={`emails-${index}`} render={(value) => (<>
                            <p className={'text-red-500 col-span-3'}>{value}</p>
                        </>)}/>
                    </div>
                ))}
                <Button variant="linkHover2" className={'force-border'} size="sm" onClick={handleAddEmail}>
                    <Plus className="mr-2 h-4 w-4"/> Add Email
                </Button>
            </div>
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Phone Numbers</Label>
            <div className="grid grid-cols-2 col-span-3 space-y-2">
                {editedContact.phones.map((phone, index) => (
                    <React.Fragment key={index}>
                        <div className="col-span-2 grid grid-cols-2 items-center gap-2">
                            <Input
                                id={`phones-${index}`}
                                value={phone.number}
                                onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                                placeholder="Phone number"
                                onBlur={(e) => {
                                    // Format phone number
                                    handlePhoneChange(index, 'number', formatPhoneNumber(e.target.value as string)!)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handlePhoneChange(index, 'number', formatPhoneNumber((e.target as HTMLInputElement).value)!)
                                    }
                                }}
                            />
                            <div>
                                <Select
                                    value={phone.type}
                                    onValueChange={(value) => handlePhoneChange(index, 'type', value)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Type"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(PhoneTypeNameMapping).map((type) => (
                                            <SelectItem key={type}
                                                        value={type}>{PhoneTypeNameMapping[type as PhoneType]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={phone.isPrimary}
                                onCheckedChange={(checked) => handlePhoneChange(index, 'isPrimary', checked)}
                            />
                            <Label>Primary</Label>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePhone(index)}
                            >
                                <Trash className="h-4 w-4"/>
                            </Button>
                        </div>
                        <Validation render={(value) => (<>
                            <div/>
                            <p className={'text-red-500'}>{value}</p></>)} validator={() => {
                            if (isEmptyString(phone.number)) {
                                return 'Phone number cannot be empty'
                            } else if (!isPhoneNumber(phone.number)) {
                                return 'Invalid phone number'
                            }
                            return true
                        }} element={`phones-${index}`}/>
                    </React.Fragment>
                ))}
                {editedContact.phones.length > 0 && <div/>}
                <Button className={'w-min force-border'} variant={'linkHover2'} size="sm" onClick={handleAddPhone}>
                    <Plus className="mr-2 h-4 w-4"/> Add Phone
                </Button>
            </div>
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Addresses</Label>
            <div className="col-span-3 space-y-2">
                {editedContact.addresses.map((address, index) => (
                    <div key={index} className="space-y-2">
                        <div className={'space-y-2'} id={`addresses-${index}`}>
                            <Input
                                value={address.street}
                                onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                                placeholder="Street"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    value={address.city}
                                    onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                                    placeholder="City"
                                />
                                <Input
                                    value={address.state}
                                    onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                                    placeholder="State"
                                />
                                <Input
                                    id={`addresses-${index}-zip`}
                                    value={address.zip}
                                    onChange={(e) => handleAddressChange(index, 'zip', e.target.value)}
                                    placeholder="ZIP"
                                />
                                <Input
                                    value={address.country}
                                    onChange={(e) => handleAddressChange(index, 'country', e.target.value)}
                                    placeholder="Country"
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div>
                                <Select
                                    value={address.type}
                                    onValueChange={(value) => handleAddressChange(index, 'type', value)}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Address Type"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(AddressTypeNameMapping).map((type) => (
                                            <SelectItem key={type}
                                                        value={type}>{AddressTypeNameMapping[type as AddressType]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={address.primary}
                                    onCheckedChange={(checked) => handleAddressChange(index, 'primary', checked)}
                                />
                                <Label>Primary</Label>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAddress(index)}
                            >
                                <Trash className="h-4 w-4"/>
                            </Button>
                        </div>
                        <Validation validator={(address: ClientAddress) => {
                            const missingFields: string[] = []
                            if (isEmptyString(address.street)) {
                                missingFields.push('Street')
                            }
                            if (isEmptyString(address.city)) {
                                missingFields.push('City')
                            }
                            if (isEmptyString(address.state)) {
                                missingFields.push('State')
                            }
                            if (isEmptyString(address.zip)) {
                                missingFields.push('ZIP')
                            }
                            if (isEmptyString(address.country)) {
                                missingFields.push('Country')
                            }

                            if (missingFields.length > 0) {
                                return englishList(missingFields) + ' cannot be empty'
                            }
                            return true
                        }} value={address} element={`addresses-${index}`}/>
                        <Validation validator={(zip: string) => {
                            // Technically, an empty zip code is invalid, but it's validated by a separate validator
                            if (/^[0-9]{5}(?:-[0-9]{4})?$/.test(zip) || isEmptyString(zip)) {
                                return true
                            }
                            return 'Invalid ZIP code'
                        }} element={`addresses-${index}-zip`} value={address.zip}/>
                    </div>
                ))}
                <Button variant="linkHover2" className={'force-border'} size="sm" onClick={handleAddAddress}>
                    <Plus className="mr-2 h-4 w-4"/> Add Address
                </Button>
            </div>
        </div>

        <FormField label={'Status'} htmlFor="status">
            <Select
                name="status"
                value={editedContact.status ?? ''}
                onValueChange={(value) => handleSelectChange('status', value)}
            >
                <SelectTrigger className="col-span-3" id="status">
                    <SelectValue placeholder="Select status"/>
                </SelectTrigger>
                <SelectContent>
                    {Object.keys(ContactStatusNameMapping).map((status) => (
                        <SelectItem key={status}
                                    value={status}>{ContactStatusNameMapping[status as ContactStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <RequiredString element={'status'} friendlyName="Status" value={editedContact.status ?? ''}
                            render={(value) => (<>
                                <div/>
                                <p className={'text-red-500 col-span-3'}>{value}</p>
                            </>)}/>
        </FormField>
        <FormField label={'Lifecycle Stage'} htmlFor="lifecycleStage">
            <Select
                name="lifecycleStage"
                value={editedContact.lifecycleStage ?? ""}
                onValueChange={(value) => handleSelectChange('lifecycleStage', value)}
            >
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select lifecycle stage"/>
                </SelectTrigger>
                <SelectContent>
                    {Object.keys(LifecycleStageNameMapping).map((stage) => (
                        <SelectItem key={stage}
                                    value={stage}>{LifecycleStageNameMapping[stage as LifecycleStage]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
        <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Important Dates</Label>
            <div className="col-span-3 space-y-2">
                {editedContact.importantDates.map((date, index) => (
                    <div key={index}>
                        <div className="flex items-center space-x-2">
                            {/* Extra divs are for loading state */}
                            <div>
                                <Input
                                    id={`importantDates-${index}`}
                                    type="date"
                                    value={date.date}
                                    onChange={(e) => handleImportantDateChange(index, 'date', e.target.value)}
                                />
                            </div>
                            <div>
                                <Select
                                    value={date.type}
                                    onValueChange={(value) => handleImportantDateChange(index, 'type', value)}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Date Type"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(ImportantDateTypeNameMapping).map((type) => (
                                            <SelectItem key={type}
                                                        value={type}>{ImportantDateTypeNameMapping[type as ImportantDateType]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveImportantDate(index)}
                            >
                                <Trash className="h-4 w-4"/>
                            </Button>
                        </div>
                        <Validation validator={(value: string) => {
                            if (isEmptyString(value)) {
                                return 'Date cannot be empty'
                            } else if (isNaN(new Date(value).getTime())) {
                                return 'Invalid date'
                            }
                            return true
                        }} element={`importantDates-${index}`} value={date.date}/>
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddImportantDate}>
                    <Plus className="mr-2 h-4 w-4"/> Add Important Date
                </Button>
            </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="importantNotes" className="text-right">
                Important Notes
            </Label>
            <Textarea
                id="importantNotes"
                name="importantNotes"
                value={editedContact.importantNotes ?? ''}
                onChange={handleInputChange}
                className="col-span-3"
            />
        </div>
    </div>
    if (isLoading) {
        content = <SkeletonForm>
            {content}
        </SkeletonForm>
    } else if (error) {
        content = <div className="text-red-500">Error loading contact: {(error as Error).message}</div>
    }

    let triggerContent: React.JSX.Element
    if (trigger) {
        triggerContent = <div className={'p-0 m-0'} onClick={(event) => {
            handleOpenChange(true);
            event.stopPropagation();
        }}>{trigger}</div>
    } else if (iconOnly) {
        triggerContent = <Button variant='ghost' size="icon">
            <Edit className="h-4 w-4"/>
        </Button>
    } else {
        triggerContent = <Button variant="outline">Edit Contact</Button>
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {triggerContent}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                    <DialogDescription>
                        Make changes to the contact here. Click save when you{"'"}re done.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[600px] pr-4">
                    {content}
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                    <Button type="submit"
                            onClick={handleSave}>{contact == null && toLoad == null ? `Create ${ContactTypeNameMapping[type]}` : 'Save changes'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function NewContactButton() {
    const [openIndex, setOpenIndex] = React.useState(-1)
    const [openedAt, setOpenedAt] = React.useState(0)

    let type: ContactType | undefined = undefined
    switch (openIndex) {
        case 0:
            type = ContactType.INDIVIDUAL
            break
        case 1:
            type = ContactType.HOUSEHOLD
            break
        case 2:
            type = ContactType.COMPANY
            break
    }

    useEffect(() => {
        if (openIndex !== -1) {
            setOpenedAt(Date.now())
        }
    }, [openIndex])

    return <>
        {type != null && <ValidationProvider>
            <EditContactDialog open={true} setOpen={(open) => {
                if (!open && Date.now() - openedAt > 1000) {
                    setOpenIndex(-1)
                }
            }} type={type} trigger={<></>}/>
        </ValidationProvider>}
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant={'linkHover2'} className={'force-border'}>
                    <Plus className="h-4 w-4 mr-2"/> New Contact
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem>
                    <Button variant={'ghost'} onClick={() => {
                        setOpenIndex(0)
                    }}><User className="h-5 w-5 mr-2"/> Individual</Button>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Button variant={'ghost'} onClick={() => {
                        setOpenIndex(1)
                    }}><House className="h-5 w-5 mr-2"/> Household</Button>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Button variant={'ghost'} onClick={() => {
                        setOpenIndex(2)
                    }}><Building className="h-5 w-5 mr-2"/> Company</Button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </>
}