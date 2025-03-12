import {Contact} from "~/db/sql/models/Contact"
import {
    ContactStatus,
    ContactStatusNameMapping,
    ContactType,
    HouseholdRelationshipStatusNameMapping,
    LifecycleStageNameMapping
} from "~/common/enum/enumerations";
import {notFound, redirect} from "next/navigation";
import React from "react";
import {ScrollArea} from "~/components/ui/scroll-area";
import {Button} from "~/components/ui/button";
import {Cake, Calendar, ChevronRight, Clock, FileText, GemIcon, Mail, MapPin, Phone, Plus, RockingChair, Star, X} from "lucide-react";
import {Avatar, AvatarFallback} from "~/components/ui/avatar";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {Badge} from "~/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card";
import {TabsContent, TabsList, TabsTrigger} from "~/components/ui/tabs";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "~/components/ui/collapsible";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "~/components/ui/table";
import classNames from 'classnames'
import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import {EmployeeAddButton, EmployeeTable} from "~/app/(authenticated)/contacts/[guid]/components/Employees";
import {
    AddActivityButton,
    ContactAwareCallQuickAction,
    ContactAwareEmailQuickAction,
    ContactNavigationHandler
} from "~/app/(authenticated)/contacts/[guid]/client";
import {User} from "~/db/sql/models/User";
import {getAuthSession} from "~/util/auth/AuthUtils";
import {ClientFeed} from "./components/Feed";
import {Relationships} from "~/app/(authenticated)/contacts/[guid]/components/Relationships";
import {TabHandler, TabProvider} from "~/app/(authenticated)/contacts/[guid]/TabContext";
import {DateRenderer} from "~/components/util/Date";

import {IncludeAttribute} from "~/db/sql/types/select";
import EditContactDialog from "~/app/(authenticated)/contacts/[guid]/components/ContactForm";
import {QueryWrapper} from "~/components/util/QueryWrapper";
import {DeleteContactButton} from "~/app/(authenticated)/contacts/client";
import {NoteInput} from "~/app/(authenticated)/contacts/[guid]/components/NoteInput";
import {ValidationProvider} from "~/components/data/ValidationProvider";
import {ContactSelectionProvider} from "~/app/(authenticated)/contacts/[guid]/ClientNavContext";
import {ContactTimelineEvent, TimelineSelect, toFeedItem} from "~/db/sql/models/ContactTimelineEvent";
import {ReadSubResult} from "~/db/sql/types/model";
import {NameEmail} from "~/components/quick_actions/Email";

const getContact = React.cache(async (guid: string, isCompany?: boolean, tenetId?: Buffer) => {
    const firstByte = guid.substring(0, 2);
    let type = ContactType.INDIVIDUAL;
    if (firstByte === '01') {
        type = ContactType.INDIVIDUAL;
    } else if (firstByte === '02') {
        type = ContactType.HOUSEHOLD;
    } else if (firstByte === '03') {
        type = ContactType.COMPANY;
    } else {
        return notFound();
    }

    const contactData: IncludeAttribute<Contact> = {
        addresses: {
            orderBy: {
                primary: 'desc',
                createdAt: 'desc'
            },
        },
        timelineEvents: {
            take: 3,
            orderBy: {
                createdAt: 'desc'
            },
            select: TimelineSelect
        },
        emails: {
            orderBy: {
                isPrimary: 'desc',
                createdAt: 'desc'
            }
        },
        phones: {
            orderBy: {
                isPrimary: 'desc',
                createdAt: 'desc'
            }
        },
        importantDates: {
            orderBy: {
                date: 'desc'
            },
        },
    }

    if (isCompany && type === ContactType.INDIVIDUAL) {
        // Reading contact but include company-specific data only (ignore household stuff)
        return await Contact.readUnique({
            where: {
                id: Buffer.from(guid, 'hex'),
                tenetId
            },
            select: {
                id: true,
                company: {
                    include: {
                        primaryContact: {
                            select: {
                                id: true,
                                fullName: true,
                            }
                        },
                        employees: {
                            include: contactData,
                            where: {
                                type: ContactType.INDIVIDUAL
                            }
                        },
                        ...contactData
                    }
                },
                household: {
                    select: {
                        id: true,
                        fullName: true
                    }
                },
            }
        })
    }

    switch (type) {
        case ContactType.INDIVIDUAL:
            return await Contact.readUnique({
                where: {
                    id: Buffer.from(guid, 'hex'),
                    tenetId
                },
                select: {
                    ...contactData,
                    household: {
                        include: {
                            headOfHousehold: {
                                select: {
                                    id: true,
                                    fullName: true,
                                }
                            },
                            householdMembers: {
                                include: {
                                    company: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                        }
                                    },
                                    ...contactData
                                },
                                where: {
                                    type: ContactType.INDIVIDUAL
                                }
                            },
                            ...contactData
                        }
                    },
                    company: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    }
                }
            })

        case ContactType.HOUSEHOLD:
            return await Contact.readUnique({
                where: {
                    id: Buffer.from(guid, 'hex'),
                    tenetId
                },
                select: {
                    headOfHousehold: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                    householdMembers: {
                        include: {
                            company: {
                                select: {
                                    id: true,
                                    fullName: true,
                                }
                            },
                            ...contactData
                        },
                        where: {
                            type: ContactType.INDIVIDUAL
                        }
                    },
                    ...contactData
                }
            })

        case ContactType.COMPANY:
            return await Contact.readUnique({
                where: {
                    id: Buffer.from(guid, 'hex'),
                    tenetId
                },
                select: {
                    primaryContact: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                    employees: {
                        include: {
                            household: {
                                select: {
                                    id: true,
                                    fullName: true,
                                }
                            },
                            ...contactData
                        },
                        where: {
                            type: ContactType.INDIVIDUAL
                        }
                    },
                    ...contactData
                }
            })
    }
})

type Props = {
    requester: User
    params: Promise<{ guid: string }>;
    searchParams: Promise<{
        company?: string,
    }>
}

export async function generateMetadata({params, searchParams}: Omit<Props, 'requester'>) {
    const requester = await getAuthSession();
    if (requester == 'refresh' || requester == null) {
        return redirect('/login');
    }
    const id = (await params).guid;
    const isCompany = (await searchParams).company === 'true';
    const contact = await getContact(id, isCompany, requester.tenetId ?? undefined);

    if (contact == null) {
        return notFound();
    }

    return {
        title: contact.fullName,
    }
}

async function _ContactDetailsPage({requester, params, searchParams}: Props) {
    const id = (await params).guid;
    const isCompany = (await searchParams).company === 'true';
    const contact = await getContact(id, isCompany, requester.tenetId ?? undefined);

    if (contact == null) {
        return notFound();
    }

    if (isCompany && !contact.company) {
        return redirect(`/contacts/${contact.guid.toString('hex')}`);
    }

    let memberContacts: Contact[] = [];
    if (contact.type === ContactType.HOUSEHOLD) {
        memberContacts = contact.householdMembers! as Contact[]
    } else if (contact.type === ContactType.COMPANY) {
        memberContacts = contact.employees! as Contact[]
    } else {
        if (isCompany) {
            memberContacts = (contact.company?.employees) ?? []
        } else if (contact.household) {
            memberContacts = (contact.household?.householdMembers) ?? []
        }
    }

    let topContact: Contact = contact as Contact;
    if (contact.type === ContactType.INDIVIDUAL) {
        if (isCompany && contact.company) {
            topContact = contact.company as Contact
        } else if (contact.household) {
            topContact = contact.household as Contact
        }
    }

    const getMemberContactData = (member: Contact) => {
        let caption = ContactStatusNameMapping[member.status!];
        if (member.type === ContactType.INDIVIDUAL) {
            if ((isCompany || topContact.type === ContactType.COMPANY) && member.position) {
                caption = member.position!
            } else if (member.householdStatus && topContact.type === ContactType.HOUSEHOLD) {
                caption = HouseholdRelationshipStatusNameMapping[member.householdStatus!].replace(/of$/, '').replace(/for$/, '')
            } else {
                caption = ContactStatusNameMapping[member.status!]
            }
        }

        return {
            id: member.guid.toString('hex'),
            name: member.fullName!,
            caption: caption,
            type: member.type!,
            email: member.primaryEmail ?? null,
            phone: member.primaryPhone ?? null,
            primaryAddress: member.primaryAddress ? {
                city: member.primaryAddress.city!,
                state: member.primaryAddress.state!,
                country: member.primaryAddress.country!,
                tz: member.primaryAddress.timezone!
            } : null
        }
    }

    let keyIndividuals: Contact[] = [];

    if (topContact.type === ContactType.COMPANY) {
        keyIndividuals = memberContacts.filter(member => member.status !== ContactStatus.PLAN_PARTICIPANT);
    }

    const navMembers = topContact.type === ContactType.COMPANY ? keyIndividuals : memberContacts;

    return <div className="min-h-screen bg-background text-gray-900 dark:text-gray-100 font-sans">
        <QueryWrapper>
            <div className="flex h-screen">
                <ContactSelectionProvider defaultValue={{
                    guid: contact.guid.toString('hex'),
                    fullName: contact.fullName!,
                    primaryEmail: contact.primaryEmail ?? null,
                    primaryPhone: contact.primaryPhone ?? null,
                    type: contact.type!,
                    primaryAddress: contact.primaryAddress ? {
                        city: contact.primaryAddress.city!,
                        state: contact.primaryAddress.state!,
                        country: contact.primaryAddress.country!,
                        tz: contact.primaryAddress.timezone ?? null
                    } : null
                }}>
                    <aside className="w-64 bg-background border-r border-gray-200 p-4">
                        <div className="mb-6">
                            <ScrollArea>
                                <ContactNavigationHandler
                                    initialContactId={contact.guid.toString('hex')}
                                    contacts={navMembers.map(getMemberContactData)}
                                    memberTitle={isCompany || contact.type === ContactType.COMPANY ? 'Employees' : 'Household Members'}
                                    topContact={getMemberContactData(topContact)}/>
                            </ScrollArea>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
                            <div className="space-y-2">
                                <ContactAwareCallQuickAction/>
                                <ContactAwareEmailQuickAction sender={{
                                    guid: contact.guid.toString('hex'),
                                    name: contact.fullName!,
                                    email: contact.primaryEmail!
                                }}/>
                                <Button variant="outline" className="w-full justify-start">
                                    <Calendar className="mr-2 h-4 w-4"/> Schedule Meeting
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <FileText className="mr-2 h-4 w-4"/> Add Note
                                </Button>
                            </div>
                        </div>
                    </aside>
                    <TabProvider>
                        <ContactInfo contact={topContact} visible={topContact.guid.equals(contact.guid)} sender={{
                            guid: requester.guid.toString('hex'),
                            name: requester.fullName!,
                            email: requester.email!
                        }}/>

                        {navMembers.map(member => {
                            if (topContact.type === ContactType.COMPANY) {
                                member.company = new Contact(topContact.guid, {
                                    fullName: topContact.fullName,
                                }, ContactType.COMPANY)
                            }
                            return <ContactInfo key={member.guid.toString('hex')} contact={member}
                                                sender={{
                                                    guid: requester.guid.toString('hex'),
                                                    name: requester.fullName!,
                                                    email: requester.email!
                                                }}
                                                visible={member.guid.equals(contact.guid)}/>
                        })}
                    </TabProvider>
                </ContactSelectionProvider>
            </div>
        </QueryWrapper>
    </div>
}

const marketingTemplates = {
    Etiquette: [
        {
            id: 1,
            name: "Thank You Note",
            content: "Dear [Name],\n\nThank you for [reason]. Your [action/gift] is greatly appreciated.\n\nSincerely,\n[Your Name]"
        },
        {
            id: 2,
            name: "Congratulations",
            content: "Dear [Name],\n\nCongratulations on your [achievement]! We're thrilled to hear about your success.\n\nBest wishes,\n[Your Name]"
        }
    ],
    Birthdays: [
        {
            id: 3,
            name: "Birthday Letter (Under 30)",
            content: "Dear [Name],\n\nHappy [Age]th Birthday! As you celebrate this milestone, we hope your day is filled with joy and excitement for the future ahead.\n\nBest wishes,\n[Your Name]"
        },
        {
            id: 4,
            name: "Birthday Letter (30-60)",
            content: "Dear [Name],\n\nWishing you a wonderful [Age]th Birthday! May this year bring you continued success and fulfillment in all aspects of your life.\n\nBest regards,\n[Your Name]"
        },
        {
            id: 5,
            name: "Birthday Letter (Over 60)",
            content: "Dear [Name],\n\nHappy [Age]th Birthday! We hope this day finds you surrounded by loved ones, reflecting on a life well-lived and looking forward to the adventures yet to come.\n\nWarm wishes,\n[Your Name]"
        }
    ],
    Anniversaries: [
        {
            id: 6,
            name: "Wedding Anniversary Note",
            content: "Dear [Names],\n\nCongratulations on your [Number]th wedding anniversary! Your enduring love and commitment are truly inspiring.\n\nBest wishes for many more years of happiness together,\n[Your Name]"
        }
    ],
    Invitations: [
        {
            id: 7,
            name: "Meeting Invite",
            content: "Dear [Name],\n\nI would like to invite you to a meeting on [Date] at [Time] to discuss [Topic]. Your input would be greatly valued.\n\nPlease let me know if you're available.\n\nBest regards,\n[Your Name]"
        },
        {
            id: 8,
            name: "Event Invite",
            content: "Dear [Name],\n\nWe are pleased to invite you to our upcoming [Event Name] on [Date] at [Time], [Location].\n\n[Brief description of the event]\n\nWe hope you can join us for this special occasion.\n\nSincerely,\n[Your Name]"
        }
    ]
}

const opportunities = [
    {
        id: 1,
        name: "Retirement Planning Review",
        client: "John Smith",
        value: "$250,000",
        stage: "Discovery",
        nextStep: "Schedule follow-up meeting",
        dueDate: "2023-07-15"
    },
    {
        id: 2,
        name: "College Savings Plan",
        client: "Sarah Smith",
        value: "$100,000",
        stage: "Proposal",
        nextStep: "Present 529 plan options",
        dueDate: "2023-07-20"
    },
    {
        id: 3,
        name: "Estate Planning",
        client: "Lisa Smith",
        value: "$500,000",
        stage: "Negotiation",
        nextStep: "Review trust options with attorney",
        dueDate: "2023-08-01"
    },
    {
        id: 4,
        name: "Investment Portfolio Rebalancing",
        client: "Michael Smith",
        value: "$75,000",
        stage: "Closing",
        nextStep: "Finalize new asset allocation",
        dueDate: "2023-07-25"
    },
    {
        id: 5,
        name: "Life Insurance Policy",
        client: "John Smith",
        value: "$1,000,000",
        stage: "Needs Analysis",
        nextStep: "Conduct health assessment",
        dueDate: "2023-08-10"
    }
]

function ContactInfo({contact, visible, sender}: { contact: Contact, visible: boolean, sender: NameEmail }) {
    const tags = ['this', 'is', 'not', 'implemented']

    return <div id={`details-${contact.guid.toString('hex')}`} className={classNames("flex-1 overflow-y-auto", {
        'hidden': !visible
    })}>
        <div className="bg-background shadow-sm p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <Avatar className={`h-16 w-16`}>
                        <AvatarFallback>{contact.fullName!.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold">{contact.fullName}</h1>
                            <TooltipProvider delayDuration={0}>
                                {contact.type === ContactType.INDIVIDUAL && <div>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Cake className="h-5 w-5 text-muted-foreground"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {/*<p>Birthday: {selectedMember.importantDates?.birthday}</p>*/}
                                            Birthday: <DateRenderer date={contact.birthday ?? null}/>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>}
                                <div>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Clock className="h-5 w-5 text-muted-foreground"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Last Contacted: <DateRenderer date={contact.lastContactedDate ?? null}
                                                                             fallback={'Never'}/></p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Star className="h-5 w-5 text-muted-foreground"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Next Follow-up: <DateRenderer date={contact.followUpDate ?? null}
                                                                             fallback={'Unset'}/></p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </TooltipProvider>
                        </div>
                        {(contact.position && contact.company) &&
                            <p className="text-muted-foreground">{contact.position} at <a
                                href={`/contacts/${contact.company.guid.toString('hex')}`}
                                className="text-blue-400 font-bold hover:underline hover:text-blue-600">
                                {contact.company.fullName!}
                            </a></p>}
                        {!(contact.position && contact.company) &&
                            <p className="text-muted-foreground">{ContactStatusNameMapping[contact.status!]}</p>}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <ValidationProvider>
                        <EditContactDialog
                            type={contact.type!}
                            contact={{
                                guid: contact.guid.toString('hex'),
                                firstName: contact.firstName!,
                                lastName: contact.lastName!,
                                household: contact.household ? {
                                    guid: contact.household.guid.toString('hex'),
                                    fullName: contact.household.fullName!,
                                    primaryEmail: null
                                } : null,
                                company: contact.company ? {
                                    guid: contact.company.guid.toString('hex'),
                                    fullName: contact.company.fullName!,
                                    primaryEmail: null
                                } : null,
                                emails: contact.emails?.map((email) => ({
                                    guid: email.guid.toString('hex'),
                                    email: email.email!,
                                    isPrimary: email.isPrimary!
                                })) ?? [],
                                phones: contact.phones?.map((phone) => ({
                                    guid: phone.guid.toString('hex'),
                                    number: phone.formattedNumber!,
                                    isPrimary: phone.isPrimary!,
                                    type: phone.type!
                                })) ?? [],
                                addresses: contact.addresses?.map((address) => address.clientSafeJson()) ?? [],
                                status: contact.status!,
                                lifecycleStage: contact.lifecycleStage!,
                                importantDates: contact.importantDates?.map((date) => ({
                                    guid: date.guid.toString('hex'),
                                    date: date.date!.toISOString().split('T')[0],
                                    type: date.type!
                                })) ?? [],
                                importantNotes: contact.importantNotes!,
                                householdStatus: contact.householdStatus!,
                                companyStatus: contact.companyStatus!,
                                industry: contact.industry!,
                                size: contact.size!,
                                website: contact.website!,
                                position: contact.position!,
                                headOfHousehold: contact.headOfHousehold ? {
                                    guid: contact.headOfHousehold.guid.toString('hex'),
                                    fullName: contact.headOfHousehold.fullName!,
                                    primaryEmail: null,
                                    primaryPhone: null
                                } : null,
                                primaryContact: contact.primaryContact ? {
                                    guid: contact.primaryContact.guid.toString('hex'),
                                    fullName: contact.primaryContact.fullName!,
                                    primaryEmail: null,
                                    primaryPhone: null
                                } : null,
                            }}/>
                    </ValidationProvider>
                    <DeleteContactButton contact={contact.guid.toString('hex')} name={contact.fullName!}/>
                </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
                {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-sm">
                        {tag}
                        <Button variant="ghost" size="sm" className="ml-1 h-4 w-4 p-0"
                            /*onClick={() => handleRemoveTag(tag)}*/>
                            <X className="h-3 w-3"/>
                        </Button>
                    </Badge>
                ))}
                {/*{isAddingTag ? (*/}
                {/*    <Select*/}
                {/*        onValueChange={(value) => {*/}
                {/*            setNewTag(value)*/}
                {/*            handleAddTag()*/}
                {/*        }}*/}
                {/*    >*/}
                {/*        <SelectTrigger className="w-[180px]">*/}
                {/*            <SelectValue placeholder="Select or type a tag"/>*/}
                {/*        </SelectTrigger>*/}
                {/*        <SelectContent>*/}
                {/*            {tagSuggestions.map((tag) => (*/}
                {/*                <SelectItem key={tag} value={tag}>*/}
                {/*                    {tag}*/}
                {/*                </SelectItem>*/}
                {/*            ))}*/}
                {/*        </SelectContent>*/}
                {/*    </Select>*/}
                {/*) : (*/}
                {/*    <Button variant="outline" size="sm" onClick={() => setIsAddingTag(true)}>*/}
                {/*        <Plus className="h-4 w-4 mr-2"/> Add Tag*/}
                {/*    </Button>*/}
                {/*)}*/}
            </div>
            {contact.type === ContactType.HOUSEHOLD && <HouseholdIndividualInfoCard contact={contact}/>}
            {contact.type === ContactType.INDIVIDUAL && <HouseholdIndividualInfoCard contact={contact}/>}
            {contact.type === ContactType.COMPANY && <CompanyInfoCard contact={contact}/>}
        </div>
        <div className="p-6">
            <TabHandler>
                <TabsList
                    className={`grid w-full ${contact.type === ContactType.COMPANY ? 'grid-cols-7' : 'grid-cols-6'}`}>
                    <TabsTrigger value="overview">Overview & Activity</TabsTrigger>
                    {contact.type === ContactType.COMPANY &&
                        <TabsTrigger value={'employees'}>Employees</TabsTrigger>}
                    <TabsTrigger value="relationships"
                                 id={`relationships-${contact.guid.toString('hex')}`}>Relationships</TabsTrigger>
                    <TabsTrigger value="marketing">Marketing</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                    <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <ValidationProvider>
                                <CardTitle className={'text-lg'}>
                                    Activity Feed <AddActivityButton contact={contact.guid.toString('hex')}
                                                                     name={contact.fullName!}/>
                                </CardTitle>
                            </ValidationProvider>
                        </CardHeader>
                        <CardContent className={'space-y-4'}>
                            <ScrollArea className="h-[500px]">
                                <ClientFeed contact={contact.guid.toString('hex')}/>
                            </ScrollArea>
                            <NoteInput contact={contact.guid.toString('hex')}/>
                        </CardContent>
                    </Card>
                </TabsContent>
                {contact.type === ContactType.COMPANY && <TabsContent value="employees">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Employees</CardTitle>
                                <EmployeeAddButton contact={contact.guid.toString('hex')}/>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <EmployeeTable
                                    sender={sender}
                                    employees={contact.employees?.map(employee => ({
                                        id: employee.guid.toString('hex'),
                                        name: employee.fullName!,
                                        position: employee.position,
                                        email: employee.primaryEmail!,
                                        phone: employee.primaryPhone!,
                                        primaryAddress: employee.primaryAddress ? {
                                            city: employee.primaryAddress.city!,
                                            state: employee.primaryAddress.state!,
                                            country: employee.primaryAddress.country!,
                                            tz: employee.primaryAddress.timezone ?? null
                                        } : null,
                                        companyRelationship: employee.companyStatus ?? null,
                                        recentInteractions: employee.timelineEvents?.map((event) => toFeedItem(event as ReadSubResult<ContactTimelineEvent, {
                                            select: typeof TimelineSelect
                                        }>)) ?? []
                                    })) ?? []}/>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>}
                <Relationships id={contact.guid.toString('hex')} name={contact.fullName!} type={contact.type!}/>
                <TabsContent value="marketing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Marketing Templates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Template Categories</h3>
                                    {Object.entries(marketingTemplates).map(([category, templates]) => (
                                        <Collapsible key={category}>
                                            <CollapsibleTrigger
                                                className="flex items-center justify-between w-full p-2 bg-gray-100 dark:bg-zinc-950 rounded-md mb-2">
                                                <span>{category}</span>
                                                <ChevronRight className="h-4 w-4"/>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                {templates.map(template => (
                                                    <Button
                                                        key={template.id}
                                                        variant="ghost"
                                                        // onClick={() => handleTemplateSelect(category, template.id)}
                                                        className="w-full justify-start"
                                                    >
                                                        <span>{template.name}</span>
                                                    </Button>
                                                ))}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ))}
                                </div>
                                <div>
                                    {/*{selectedTemplate && (*/}
                                    {/*    <>*/}
                                    {/*        <h3 className="text-lg font-semibold mb-2">Selected Template</h3>*/}
                                    {/*        <Textarea value={emailContent}*/}
                                    {/*                  onChange={(e) => setEmailContent(e.target.value)}*/}
                                    {/*                  className="h-48"/>*/}
                                    {/*        <Button className="mt-4">Send Email</Button>*/}
                                    {/*    </>*/}
                                    {/*)}*/}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="documents">Documents</TabsContent>
                <TabsContent value="audit">Audit Trail</TabsContent>
                <TabsContent value="opportunities">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Opportunities</CardTitle>
                                <Button><Plus className="mr-2 h-4 w-4"/> Add Opportunity</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Stage</TableHead>
                                        <TableHead>Next Step</TableHead>
                                        <TableHead>Due Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {opportunities.map((opportunity) => (
                                        <TableRow key={opportunity.id}>
                                            <TableCell>{opportunity.name}</TableCell>
                                            <TableCell>{opportunity.client}</TableCell>
                                            <TableCell>{opportunity.value}</TableCell>
                                            <TableCell>{opportunity.stage}</TableCell>
                                            <TableCell>{opportunity.nextStep}</TableCell>
                                            <TableCell>{opportunity.dueDate}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </TabHandler>
        </div>
    </div>
}

function CompanyInfoCard({contact}: { contact: Contact }) {
    return <Card className="mt-4">
        <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <h3 className="font-semibold mb-1">Contact Information</h3>
                    <p><Mail className="inline-block mr-2 h-4 w-4"/>{contact.primaryEmail}</p>
                    <p><Phone className="inline-block mr-2 h-4 w-4"/>{contact.primaryPhone}</p>
                    <p><MapPin className="inline-block mr-2 h-4 w-4"/>{contact.addresses?.[0]?.address}</p>
                </div>
                <div>
                    <h3 className="font-semibold mb-1">Business Details</h3>
                    <p>Industry: {contact.industry}</p>
                    <p>Size: {contact.size}</p>
                    <p>Website: {contact.website}</p>
                </div>
                <div>
                    <h3 className="font-semibold mb-1">Relationship</h3>
                    <p>Status: {ContactStatusNameMapping[contact.status!]}</p>
                    <p>Manager: {contact.primaryContact?.fullName}</p>
                    <p>Last Contact: Sometime that is not implemented</p>
                </div>
            </div>
        </CardContent>
    </Card>
}

// Households and Individuals
function HouseholdIndividualInfoCard({contact}: { contact: Contact }) {
    return <Card className="mt-4">
        <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TooltipProvider delayDuration={0}>
                    <div>
                        <h3 className="font-semibold mb-1">Contact Information</h3>
                        <Tooltip>
                            <TooltipTrigger>
                                <Mail className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                Primary Email
                            </TooltipContent>
                        </Tooltip>
                        {contact.primaryEmail}
                        <br/>
                        <Tooltip>
                            <TooltipTrigger>
                                <Phone className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                Primary Phone
                            </TooltipContent>
                        </Tooltip>
                        {contact.primaryPhone}
                        <br/>
                        <Tooltip>
                            <TooltipTrigger>
                                <MapPin className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                Primary Address
                            </TooltipContent>
                        </Tooltip>
                        {contact.addresses?.[0]?.get('address')}
                    </div>
                    <div>
                        <h3 className="font-semibold mb-1">Important Dates</h3>
                        {contact.type === ContactType.INDIVIDUAL && <>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Cake className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Birthday
                                </TooltipContent>
                            </Tooltip>
                            <DateRenderer date={contact.birthday ?? null}/>
                            <br/>
                            <Tooltip>
                                <TooltipTrigger>
                                    <GemIcon className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Anniversary
                                </TooltipContent>
                            </Tooltip>
                            <DateRenderer date={contact.anniversary ?? null}/>
                            <br/>
                            <Tooltip>
                                <TooltipTrigger>
                                    <RockingChair className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Retirement
                                </TooltipContent>
                            </Tooltip>
                            <DateRenderer date={contact.retirement ?? null}/>
                        </>}
                        {(contact.type === ContactType.HOUSEHOLD || contact.type === ContactType.COMPANY) &&
                            <>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Clock className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Last Contacted
                                    </TooltipContent>
                                </Tooltip>
                                <DateRenderer date={contact.lastContactedDate ?? null} fallback={'Never'}/>
                                <br/>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Star className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Next Follow-up
                                    </TooltipContent>
                                </Tooltip>
                                <DateRenderer date={contact.followUpDate ?? null} fallback={'Unset'}/>
                            </>
                        }
                    </div>
                </TooltipProvider>
                <div>
                    <h3 className="font-semibold mb-1">Relationship Details</h3>
                    <p>Relation to Head of
                        Household: {contact.householdStatus ? HouseholdRelationshipStatusNameMapping[contact.householdStatus!] : 'Unspecified'}</p>
                    <p>Advisor Team: Not implemented (might be changed?)</p>
                </div>
                <div>
                    <h3 className="font-semibold mb-1">Lifecycle Stage</h3>
                    {contact.lifecycleStage ? LifecycleStageNameMapping[contact.lifecycleStage] : 'Unspecified'}
                </div>
            </div>
        </CardContent>
    </Card>
}

const ContactDetailsPage = withAuthentication(_ContactDetailsPage);
export default ContactDetailsPage;