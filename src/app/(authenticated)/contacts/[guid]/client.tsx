'use client';

import {Avatar, AvatarFallback} from "~/components/ui/avatar";
import {Building, ChevronLeft, House, Plus, UserRound} from "lucide-react";
import React, {useEffect} from "react";
import {ActivityPriority, ActivityStatus, ContactType} from "~/common/enum/enumerations";
import {Separator} from "~/components/ui/separator";
import {useRouter} from "next/navigation";
import {Button} from "~/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {useQueryClient} from "@tanstack/react-query";
import EmailQuickAction, {NameEmail} from "~/components/quick_actions/Email";
import {useContactSelection} from "~/app/(authenticated)/contacts/[guid]/ClientNavContext";
import CallQuickAction from "~/components/quick_actions/Call";
import ActivityDialog, {ClientActivity} from "~/app/(authenticated)/activities/ActivityForm";

type ContactNavigationProps = {
    targetId: string, // Contact's id
    name: string, // Contact's name
    caption: string, // Contact's caption
    type: ContactType, // Contact's type
    active: boolean, // Whether the contact is active or not
    setSelectedMember: () => void, // Callback to set the selected member
    topContact?: boolean; // Whether the contact is the first contact in the list
}

function ContactNavigation({
                               targetId,
                               name,
                               caption,
                               type,
                               active,
                               setSelectedMember,
                               topContact,
                           }: ContactNavigationProps) {
    return <div className={'w-full'}>
        <div
            id={'nav-' + targetId}
            className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer ${
                active ? 'bg-primary dark:bg-zinc-900 text-primary-foreground' :
                    'hover:bg-gray-100 dark:hover:bg-zinc-900'
            }`}
            onClick={() => setSelectedMember()}
        >
            <Avatar className={`h-10 w-10${topContact ? ' bg-secondary' : ''}`}>
                <AvatarFallback>
                    {type === ContactType.INDIVIDUAL &&
                        <UserRound className="h-4/5 w-4/5 text-primary"/>}
                    {type === ContactType.HOUSEHOLD &&
                        <House className="h-4/5 w-4/5 text-primary"/>}
                    {type === ContactType.COMPANY &&
                        <Building className="h-4/5 w-4/5 text-primary"/>}
                </AvatarFallback>
            </Avatar>
            <div>
                <p className="font-medium dark:text-gray-100">{name}</p>
                <p className="text-sm text-muted-foreground">{caption}</p>
            </div>
        </div>
    </div>
}

type NavContact = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    caption: string;
    type: ContactType;
    primaryAddress: {
        city: string,
        state: string,
        country: string,
        tz: string | null
    } | null
}

type ContactNavigationHandlerProps = {
    contacts: NavContact[];
    topContact: NavContact
    initialContactId: string;
    memberTitle: string;
}

export function ContactNavigationHandler({
                                             contacts,
                                             initialContactId,
                                             topContact,
                                             memberTitle
                                         }: ContactNavigationHandlerProps) {
    const [selectedMember, setSelectedMember] = React.useState(initialContactId);
    const [memberName, setMemberName] = React.useState('');

    useEffect(() => {
        document.title = memberName;
    }, [memberName])

    const router = useRouter();
    const {setSelectedContact} = useContactSelection()

    const handleSelectContact = (contact: NavContact) => {
        // Hide the current contact's info panel then show the new contact's info panel
        const element = document.getElementById(`details-${selectedMember}`);
        if (element) {
            element.classList.add('hidden');
        }
        const newElement = document.getElementById(`details-${contact.id}`);
        if (newElement) {
            newElement.classList.remove('hidden');
        }
        setSelectedMember(contact.id);
        setMemberName(contact.name);
        setSelectedContact({
            guid: contact.id,
            fullName: contact.name,
            primaryEmail: contact.email,
            type: contact.type,
            primaryPhone: contact.phone,
            primaryAddress: contact.primaryAddress ? {
                city: contact.primaryAddress.city,
                state: contact.primaryAddress.state,
                country: contact.primaryAddress.country,
                tz: contact.primaryAddress.tz,
            } : null
        })
    }

    return <>
        <div className={'flex justify-between items-center'}>
            <ChevronLeft className={'h-6 w-6 mr-2 cursor-pointer'} onClick={() => router.back()}/>
            <ContactNavigation
                targetId={topContact.id}
                name={topContact.name}
                caption={topContact.caption}
                type={topContact.type}
                active={selectedMember === topContact.id}
                setSelectedMember={() => handleSelectContact(topContact)}
                topContact
            />
        </div>
        {contacts.length > 0 &&
            <>
                <Separator className={'my-4'}/>
                <h2 className={'text-lg font-semibold mb-2'}>{memberTitle}</h2>
            </>
        }
        {contacts.map(contact => (
            <ContactNavigation
                key={contact.id}
                targetId={contact.id}
                name={contact.name}
                caption={contact.caption}
                type={contact.type}
                active={selectedMember === contact.id}
                setSelectedMember={() => handleSelectContact(contact)}
                topContact={false}
            />
        ))}
    </>
}

export function AddActivityButton({contact, name}: { contact: string, name: string }) {
    const initialActivity: ClientActivity = {
        title: '',
        subType: null,
        startDate: null,
        endDate: null,
        contacts: [{
            guid: contact,
            fullName: name,
            primaryEmail: null,
            type: ContactType.INDIVIDUAL
        }],
        users: [],
        description: null,
        notes: [],
        events: [],
        status: ActivityStatus.NOT_STARTED,
        priority: ActivityPriority.MEDIUM,
        location: null,
        phoneNumber: null,
        holdReason: null,
        waypoints: [],
        childActivities: [],
    }

    const queryClient = useQueryClient()

    return <ActivityDialog activity={initialActivity} trigger={
        <div className={'inline ml-2'}>
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant={'ghost'} size={'icon'}>
                            <Plus className="h-4 w-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Add Activity
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    } onSuccess={async () => {
        await queryClient.invalidateQueries({
            queryKey: ['infinite-list', `feed-${contact}`]
        })
    }}/>
}

export function ContactAwareEmailQuickAction({sender}: { sender: NameEmail }) {
    const {selectedContact} = useContactSelection()

    if (selectedContact == null || selectedContact.primaryEmail == null) {
        return <></>
    }

    return <EmailQuickAction sender={sender} to={[selectedContact]}/>
}

export function ContactAwareCallQuickAction() {
    const {selectedContact} = useContactSelection()

    if (selectedContact == null || selectedContact.primaryPhone == null) {
        return <></>
    }

    return <CallQuickAction contact={{
        guid: selectedContact.guid,
        name: selectedContact.fullName,
        phone: selectedContact.primaryPhone,
        tz: selectedContact.primaryAddress?.tz ?? null,
        city: selectedContact.primaryAddress?.city ?? null,
        state: selectedContact.primaryAddress?.state ?? null,
        country: selectedContact.primaryAddress?.country ?? null
    }}/>
}