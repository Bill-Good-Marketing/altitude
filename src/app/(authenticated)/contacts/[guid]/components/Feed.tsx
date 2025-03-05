'use client';
import {
    ActivityType,
    ActivityTypeNameMapping,
    ContactRelationshipType,
    ContactRelationshipTypeNameMapping,
    ContactTimelineEventJoinType,
    ContactTimelineEventType,
    ContactTimelineEventTypeNameMapping,
    ContactType,
    familialRelationships,
    NoteType,
    NoteTypeNameMapping,
    OpportunityStatus,
    OpportunityStatusNameMapping,
    professionalRelationships
} from "~/common/enum/enumerations";
import {
    BadgeAlert,
    Building,
    CalendarCheck,
    CalendarCog,
    CalendarOff,
    CalendarPlus2,
    ClipboardCheck,
    ClipboardPen,
    ClipboardPlus,
    ClipboardX,
    DollarSign,
    Edit,
    House,
    ListTodoIcon,
    Mail,
    MessageCircle,
    Phone, PhoneIncoming, PhoneOutgoing,
    Plus,
    StepForward,
    UserCircle,
    UserIcon,
    UserMinus,
    UserPlus,
    XIcon
} from "lucide-react";
import {EnglishList} from "~/components/util/EnglishList";
import React, {useState} from "react";
import {handleServerAction} from "~/util/api/client/APIClient";
import {getFeed} from "~/app/(authenticated)/contacts/[guid]/components/Actions";
import {InfiniteList} from "~/components/ui/infinitelist";
import {DateRenderer, DateTimeRenderer} from "~/components/util/Date";
import {useContactSelection} from "~/app/(authenticated)/contacts/[guid]/ClientNavContext";
import {pluralize, properArticle} from "~/util/strings";
import Markdown from "react-markdown";
import {FormattedLink} from "~/components/util/FormattedLink";
import {Button} from "~/components/ui/button";
import {Textarea} from "~/components/ui/textarea";
import {updateNote} from "~/app/(authenticated)/activities/Actions";

export declare type FeedItem = {
    guid: string,
    type: ContactTimelineEventType,
    contacts: {
        name: string,
        href: string,
        type: ContactTimelineEventJoinType,
        contactType: ContactType,
        deleted: boolean
    }[],
    extraInfo?: string,
    user: string,
    eventAt: Date,
    activity?: {
        guid: string,
        title: string,
        description?: string,
        start: Date,
        end: Date | null,
        type: ActivityType,
        assigned?: string[],
        deleted: boolean,
    },
    waypoint?: {
        title: string,
    },
    note?: {
        content: string,
        guid: string,
        noteType: NoteType,
    },
    opportunity?: {
        guid: string,
        title: string,
        status: OpportunityStatus,
        probability: number,
        expectedCloseDate: Date,
        actualCloseDate: Date | null,
        value: number,
        deleted: boolean,
        assigned: string[]
        description: string | null
    }
    relationshipType?: ContactRelationshipType
}

const ICON_CLASSES = 'h-5 w-5 text-gray-500 dark:text-gray-400'

export function Feed({contact, includeActivityDetails, includeOpportunityDetails}: {
    contact: string,
    includeActivityDetails: boolean,
    includeOpportunityDetails: boolean
}) {
    const FEED_COUNT = 5;

    return (
        <div className="space-y-4">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    <InfiniteList<FeedItem>
                        listKey={`feed-${contact}`}
                        load={async (offset) => {
                            const result = handleServerAction(await getFeed(contact, offset, FEED_COUNT));
                            if (!result.success) {
                                throw new Error(`Error reading feed: ${result.message}`);
                            }
                            return result.result!;
                        }}
                        viewportClassName={'p-4'}
                        render={(item, idx, count) => <li key={item.guid}>
                            <FeedItem feedItem={item} idx={idx} length={count}
                                      includeActivityDetails={includeActivityDetails}
                                      includeOpportunityDetails={includeOpportunityDetails}
                            />
                        </li>}
                        filterItems={items => {
                            // Dedupe items
                            const seen = new Set<string>();
                            return items.filter(item => {
                                if (seen.has(item.guid)) {
                                    return false;
                                }
                                seen.add(item.guid);
                                return true;
                            });
                        }}
                    />
                </ul>
            </div>
        </div>
    )
}

export function FeedWithItems({items}: { items: FeedItem[] }) {
    return (
        <div className="space-y-4">
            <div className="flow-root">
                <ul role="list" className="-mb-8 p-4">
                    {items.map((feedItem, feedItemIdx) => (
                        <li key={feedItem.guid}>
                            <FeedItem feedItem={feedItem} idx={feedItemIdx} length={items.length}
                                      includeActivityDetails={true} includeOpportunityDetails={true}/>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export function FeedItem({feedItem, idx, length, includeActivityDetails, includeOpportunityDetails}: {
    feedItem: FeedItem,
    idx: number,
    length: number,
    includeActivityDetails: boolean,
    includeOpportunityDetails: boolean
}) {
    let feedElement: React.ReactNode

    switch (feedItem.type) {
        case ContactTimelineEventType.NOTE:
            feedElement = <NoteItem feedItem={feedItem} includeActivityDetails={includeActivityDetails} includeOpportunityDetails={includeOpportunityDetails}/>
            break;

        case ContactTimelineEventType.ACTIVITY_CREATED:
        case ContactTimelineEventType.ACTIVITY_COMPLETED:
        case ContactTimelineEventType.ACTIVITY_REMOVED:
        case ContactTimelineEventType.ACTIVITY_FAILED:
        case ContactTimelineEventType.ACTIVITY_CANCELLED:
        case ContactTimelineEventType.ACTIVITY_STATUS_CHANGED:
        case ContactTimelineEventType.ACTIVITY_STEP_CHANGED:
        case ContactTimelineEventType.ACTIVITY_ADDED_TO:
        case ContactTimelineEventType.ACTIVITY_REMOVED_FROM:
            feedElement = <ActivityItem feedItem={feedItem} includeActivityDetails={includeActivityDetails}/>
            break;

        case ContactTimelineEventType.WAYPOINT_CREATED:
            feedElement =
                <WaypointItem feedItem={feedItem}/>
            break;

        case ContactTimelineEventType.CONTACT_CREATED:
        case ContactTimelineEventType.CONTACT_REMOVED:
            feedElement = <ContactItem feedItem={feedItem}/>
            break;

        case ContactTimelineEventType.MEMBER_ADDED:
        case ContactTimelineEventType.MEMBER_REMOVED:
            feedElement = <MemberItem feedItem={feedItem}/>
            break;

        case ContactTimelineEventType.RELATIONSHIP_ADDED:
        case ContactTimelineEventType.RELATIONSHIP_REMOVED:
            feedElement = <RelationshipItem feedItem={feedItem}/>
            break;

        case ContactTimelineEventType.OPPORTUNITY_CREATED:
        case ContactTimelineEventType.OPPORTUNITY_REMOVED:
        case ContactTimelineEventType.OPPORTUNITY_WON:
        case ContactTimelineEventType.OPPORTUNITY_LOST:
        case ContactTimelineEventType.OPPORTUNITY_CANCELLED:
        case ContactTimelineEventType.OPPORTUNITY_STATUS_CHANGED:
            feedElement = <OpportunityItem feedItem={feedItem} includeOpportunityDetails={includeOpportunityDetails}/>
            break;

        case ContactTimelineEventType.EMAIL_SENT:
        case ContactTimelineEventType.EMAIL_RECEIVED:
            feedElement = <EmailItem feedItem={feedItem}/>
            break;
    }

    return (
        <div className="relative pb-8">
            {idx !== length - 1 ? (
                <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-zinc-900"
                      aria-hidden="true"/>
            ) : null}
            <div className="relative flex items-start space-x-3">
                {feedElement}
            </div>
        </div>
    )
}

function EmailItem({feedItem}: { feedItem: FeedItem }) {
    return (<>
        <div>
            <div className="relative px-1">
                <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 ring-8 ring-white dark:ring-gray-900">
                    <Mail className={ICON_CLASSES}/>
                </div>
            </div>
        </div>
        <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {feedItem.user}
                </span>
                sent an email to{' '}
                <EnglishList
                    strs={feedItem.contacts.map(person => person.name)}
                    Component={({children, idx}) => {
                        const contact = feedItem.contacts[idx]
                        return <FormattedLink deleted={contact.deleted} href={contact.href}>{children}</FormattedLink>
                    }}/>
            </div>
        </div>
    </>)
}

// TODO: IMPLEMENT
function OpportunityItem({feedItem, includeOpportunityDetails}: { feedItem: FeedItem, includeOpportunityDetails: boolean }) {
    const moneyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    if (feedItem.opportunity == null || feedItem.opportunity.guid == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Opportunity is **Unspecified ❌**\n\n`}
            {`Opportunity internal identifier is **${feedItem.opportunity?.guid == null ? 'Unspecified ❌' : 'Specified ✔'}**\n\n`}
        </ErrorItem>
    } else if (feedItem.opportunity.status == null || feedItem.opportunity.probability == null || feedItem.opportunity.expectedCloseDate == null || feedItem.opportunity.value == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Opportunity status is **${OpportunityStatusNameMapping[feedItem.opportunity.status ?? OpportunityStatus.UNSTARTED] ?? 'Unspecified ❌'}**\n\n`}
            {`Opportunity probability is **${feedItem.opportunity.probability ? feedItem.opportunity.probability * 100 + '%' : 'Unspecified ❌'}**\n\n`}
            {`Opportunity expected close date is **${feedItem.opportunity.expectedCloseDate.toLocaleDateString() ?? 'Unspecified ❌'}**\n\n`}
            {`Opportunity value is **${feedItem.opportunity.value ? moneyFormatter.format(feedItem.opportunity.value) : 'Unspecified ❌'}**\n\n`}
        </ErrorItem>
    }

    let description = <></>

    const title = feedItem.opportunity.title + ` (${moneyFormatter.format(feedItem.opportunity.value)})`

    switch (feedItem.type) {
        case ContactTimelineEventType.OPPORTUNITY_CREATED:
            description = <span>created <FormattedLink deleted={feedItem.opportunity.deleted}
                                                       href={`/opportunities/${feedItem.opportunity.guid}`}>{title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.OPPORTUNITY_REMOVED:
            description = <span>deleted <FormattedLink deleted={feedItem.opportunity.deleted}
                                                       href={`/opportunities/${feedItem.opportunity.guid}`}>{title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.OPPORTUNITY_WON:
            description = <span>closed <FormattedLink deleted={feedItem.opportunity.deleted}
                                                      href={`/opportunities/${feedItem.opportunity.guid}`}>{title}</FormattedLink></span>
            break;


        case ContactTimelineEventType.OPPORTUNITY_LOST:
            description = <span>lost <FormattedLink deleted={feedItem.opportunity.deleted}
                                                    href={`/opportunities/${feedItem.opportunity.guid}`}>{title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.OPPORTUNITY_CANCELLED:
            description = <span>cancelled <FormattedLink deleted={feedItem.opportunity.deleted}
                                                         href={`/opportunities/${feedItem.opportunity.guid}`}>{title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.OPPORTUNITY_STATUS_CHANGED:
            description = <span>changed <FormattedLink deleted={feedItem.opportunity.deleted}
                                                       href={`/opportunities/${feedItem.opportunity.guid}`}>{title}</FormattedLink>{"'s "}
                <Markdown>{`status ${feedItem.extraInfo}`}</Markdown></span>
            break;
    }
    return (<>
        <div>
            <div className="relative px-1">
                <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 ring-8 ring-white dark:ring-gray-900">
                    <DollarSign className={ICON_CLASSES}/>
                </div>
            </div>
        </div>
        <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                On {feedItem.eventAt.toLocaleDateString()} at {feedItem.eventAt.toLocaleTimeString()}, {feedItem.user} {description}
                {includeOpportunityDetails && <>
                    <b>With:{' '}</b>
                    <EnglishList
                        strs={feedItem.contacts.map(person => person.name)}
                        Component={({children, idx}) => {
                            const contact = feedItem.contacts[idx]
                            return <FormattedLink deleted={contact.deleted} href={contact.href}>{children}</FormattedLink>
                        }}/>
                    <br/>
                    <b>Assigned to:</b>
                    {feedItem.opportunity.assigned == null || feedItem.opportunity.assigned.length === 0 ? 'None' :
                        <EnglishList
                            strs={feedItem.opportunity.assigned ?? []}
                            Component={({children}) => <span
                                className="font-medium text-gray-900 dark:text-gray-100">{children}</span>}/>}
                    <br/>
                    <div className="flex items-center space-x-2">
                        <span>Expected Close: <b><DateRenderer date={feedItem.opportunity.expectedCloseDate}/></b></span>
                        {feedItem.opportunity.actualCloseDate && <span>Actual Close: <b><DateRenderer date={feedItem.opportunity.actualCloseDate}/></b></span>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span>Status: <b><span
                            className={feedItem.opportunity.status == OpportunityStatus.WON ? 'text-green-500' : feedItem.opportunity.status == OpportunityStatus.LOST ? 'text-red-500' : 'text-gray-500'}>{OpportunityStatusNameMapping[feedItem.opportunity.status]}</span></b></span>
                        <span>Close Probability: <b>{feedItem.opportunity.probability * 100}%</b></span>
                    </div>
                    {feedItem.opportunity.description}
                </>}
            </div>
        </div>
    </>)
}

function NoteItem({feedItem, includeActivityDetails, includeOpportunityDetails}: {
    feedItem: FeedItem,
    includeActivityDetails: boolean,
    includeOpportunityDetails: boolean
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [currentContent, setCurrentContent] = useState(feedItem.note?.content ?? '')

    if (feedItem.note == null || feedItem.note.content == null || feedItem.note.guid == null || feedItem.note.noteType == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Note is **${feedItem.note?.content ?? 'Unspecified ❌'}**\n\n`}
            {`Note internal identifier is **${feedItem.note?.guid ? 'Specified ✔' : 'Unspecified ❌'}**\n\n`}
            {`Note type is **${NoteTypeNameMapping[feedItem.note?.noteType as NoteType] ?? 'Unspecified ❌'}**`}
        </ErrorItem>
    } else if (includeActivityDetails && feedItem.activity != null && (feedItem.activity?.guid == null || feedItem.activity?.title == null)) {
        const strs = [
            `Note is related to an activity, but the activity is improperly formed\n\n`,
            `Activity internal identifier is **${feedItem.activity?.guid == null ? 'Unspecified ❌' : 'Specified ✔'}**\n\n`,
            `Activity title is **${feedItem.activity?.title ?? 'Unspecified ❌'}**`
        ]

        if (includeOpportunityDetails && feedItem.opportunity != null && (feedItem.opportunity?.guid == null || feedItem.opportunity?.title == null)) {
            strs.push(`Note is also related to an opportunity, but the opportunity is improperly formed\n\n`)
            strs.push(`Opportunity internal identifier is **${feedItem.opportunity?.guid == null ? 'Unspecified ❌' : 'Specified ✔'}**\n\n`)
            strs.push(`Opportunity title is **${feedItem.opportunity?.title ?? 'Unspecified ❌'}**`)
        }

        return <ErrorItem feedItem={feedItem}>
            {strs}
        </ErrorItem>
    } else if (includeOpportunityDetails && feedItem.opportunity != null && (feedItem.opportunity?.guid == null || feedItem.opportunity?.title == null)) {
        return <ErrorItem feedItem={feedItem}>
            {`Note is related to an opportunity, but the opportunity is improperly formed\n\n`}
            {`Opportunity internal identifier is **${feedItem.opportunity?.guid == null ? 'Unspecified ❌' : 'Specified ✔'}**\n\n`}
            {`Opportunity title is **${feedItem.opportunity?.title ?? 'Unspecified ❌'}**\n\n`}
        </ErrorItem>
    }

    const handleSave = async () => {
        const result = handleServerAction(await updateNote(feedItem.note!.guid, currentContent));
        if (!result.success) {
            throw new Error(`Error saving note: ${result.message}`);
        }
        setIsEditing(false)
    }

    const classes = 'h-5 w-5 text-gray-400'

    let primaryIcon = <MessageCircle aria-hidden="true" className={classes}/>

    switch (feedItem.note.noteType) {
        case NoteType.CALL:
            primaryIcon = <Phone aria-hidden="true" className={classes}/>
            break

        case NoteType.CALL_OUTBOUND:
            primaryIcon = <PhoneOutgoing aria-hidden="true" className={classes}/>
            break

        case NoteType.CALL_INBOUND:
            primaryIcon = <PhoneIncoming aria-hidden="true" className={classes}/>
            break
    }

    return (<>
        <div className="relative">
            <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-950 ring-8 ring-white dark:ring-zinc-950">
                <UserIcon className={ICON_CLASSES}/>
            </div>

            <span className="absolute -bottom-0.5 -right-1 rounded-tl bg-background px-0.5 py-px">
                {primaryIcon}
            </span>
        </div>
        <div className="min-w-0 flex-1">
            <div>
                <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                        {feedItem.user} <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                            <Edit className="h-4 w-4"/>
                        </Button>
                    </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    Commented on
                    {' '}<FormattedLink deleted={feedItem.contacts[0].deleted} href={feedItem.contacts[0].href}>{feedItem.contacts[0].name}</FormattedLink>,
                    {' '}{feedItem.eventAt.toLocaleString()}
                </p>
                {feedItem.activity && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    Related to <FormattedLink deleted={feedItem.activity.deleted}
                                              href={`/activities/${feedItem.activity.guid}`}>{feedItem.activity.title}</FormattedLink>
                    {feedItem.opportunity && <>
                        {' '}and{' '}
                        <FormattedLink deleted={feedItem.opportunity.deleted}
                                       href={`/opportunities/${feedItem.opportunity.guid}`}>{feedItem.opportunity.title}</FormattedLink>
                    </>}
                </p>}
                {(feedItem.opportunity && !feedItem.activity) && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    Related to <FormattedLink deleted={feedItem.opportunity.deleted}
                                              href={`/opportunities/${feedItem.opportunity.guid}`}>{feedItem.opportunity.title}</FormattedLink>
                </p>}
            </div>
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {!isEditing && <p>{currentContent}</p>}
                {isEditing && <div className="grid grid-cols-4 items-start gap-4">
                    <Textarea
                        value={currentContent}
                        onChange={(e) => setCurrentContent(e.target.value)}
                        className="col-span-3"
                        placeholder="Add any additional notes here..."
                    />
                    <Button onClick={handleSave}>Save</Button>
                </div>}
            </div>
        </div>
    </>)
}

const ErrorItem = ({children, feedItem}: { children: string | string[], feedItem: FeedItem }) => {
    const msg = Array.isArray(children) ? children.join('') : children
    return (<>
        <div>
            <div className="relative px-1">
                <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 ring-8 ring-white dark:ring-gray-900">
                    <BadgeAlert className={'h-5 w-5 text-red-500'}/>
                </div>
            </div>
        </div>
        <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm text-amber-700 dark:text-amber-300">
                <p>
                    This timeline item seems to be improperly formed. Please contact the site administrators and tell
                    them that {pluralize(ContactTimelineEventTypeNameMapping[feedItem.type])} are being incorrectly
                    created.
                </p>
                <Markdown>
                    {`Provide this extra information: ${msg}`}
                </Markdown>
            </div>
        </div>
    </>)
}

function RelationshipItem({feedItem}: { feedItem: FeedItem }) {
    const target = feedItem.contacts.find(contact => contact.type === ContactTimelineEventJoinType.RELATIONSHIP_TO)
    const source = feedItem.contacts.find(contact => contact.type === ContactTimelineEventJoinType.RELATIONSHIP_FROM)

    if (target == null || source == null || feedItem.relationshipType == null) {
        `This timeline seems to be improperly formed. Please contact the site administrators and tell them that ${pluralize(ContactTimelineEventType[feedItem.type])} are being incorrectly created.`
        return <ErrorItem feedItem={feedItem}>
            {`Relationship target is **${target?.name ?? 'Unspecified ❌'}**\n\n`}
            {`Relationship source is **${source?.name ?? 'Unspecified ❌'}**\n\n`}
            {`Relationship type is **${ContactRelationshipTypeNameMapping[feedItem.relationshipType!] ?? 'Unspecified ❌'}**`}
        </ErrorItem>
    }

    let subIcon = <></>
    switch (target?.contactType) {
        case ContactType.HOUSEHOLD:
            subIcon = <House className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-300"/>
            break;

        case ContactType.COMPANY:
            subIcon = <Building className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-300"/>
            break;

        case ContactType.INDIVIDUAL:
            subIcon = <UserCircle className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-300"/>
            break;
    }

    let description: string
    const mappedRelType = ContactRelationshipTypeNameMapping[feedItem.relationshipType!]

    if (feedItem.type === ContactTimelineEventType.RELATIONSHIP_ADDED) {
        if (mappedRelType.endsWith('of') || mappedRelType.endsWith('for')) {
            description = `made ${source.name} ${properArticle(mappedRelType)} ${target.name}`
        } else if (feedItem.relationshipType === ContactRelationshipType.OWNS_COMPANY) {
            description = `made ${source.name} the owner of ${target.name}`
        } else if (feedItem.relationshipType === ContactRelationshipType.REFERRED) {
            description = `indicated that ${source.name} referred ${target.name}`
        } else if (familialRelationships.includes(feedItem.relationshipType)) {
            description = `made ${target.name} ${source.name}'s ${mappedRelType}`
        } else if (professionalRelationships.includes(feedItem.relationshipType)) {
            description = `made ${source.name} ${target.name}'s ${mappedRelType}`
        } else {
            description = `Not sure how to describe this relationship (type: ${mappedRelType}, this should be reported as a bug)`
        }
    } else {
        if (mappedRelType.endsWith('of') || mappedRelType.endsWith('for')) {
            description = `removed ${source.name} as ${properArticle(mappedRelType)} ${target.name}`
        } else if (feedItem.relationshipType === ContactRelationshipType.OWNS_COMPANY) {
            description = `removed ${source.name}'s ownership of ${target.name}`
        } else if (feedItem.relationshipType === ContactRelationshipType.REFERRED) {
            description = `removed ${source.name}'s referal of ${target.name}`
        } else if (familialRelationships.includes(feedItem.relationshipType)) {
            description = `made ${target.name} no longer ${source.name}'s ${mappedRelType}`
        } else if (professionalRelationships.includes(feedItem.relationshipType)) {
            description = `made ${source.name} no longer ${target.name}'s ${mappedRelType}`
        } else {
            description = `Not sure how to describe this relationship (type: ${mappedRelType}, this should be reported as a bug)`
        }
    }

    return (<>
        <div className="relative">
            <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-950 ring-8 ring-white dark:ring-zinc-950">
                <UserIcon className={ICON_CLASSES}/>
            </div>

            <span className="absolute -bottom-0.5 -right-1 rounded-tl bg-background px-0.5 py-px">
                {subIcon}
            </span>
        </div>
        <div className="min-w-0 flex-1">
            <div>
                <div className="text-sm text-gray-500 dark:text-gray-300">
                    On {feedItem.eventAt.toLocaleDateString()} at {feedItem.eventAt.toLocaleTimeString()}, <span
                    className="font-medium text-gray-900 dark:text-gray-100">
                        {feedItem.user}
                    </span> {description}
                </div>
            </div>
        </div>
    </>)
}

function ActivityItem({feedItem, includeActivityDetails}: { feedItem: FeedItem, includeActivityDetails: boolean }) {
    if (feedItem.activity == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Activity is **Unspecified ❌**\n\n`}
        </ErrorItem>
    } else if (!includeActivityDetails && (feedItem.activity.guid == null || feedItem.activity.title == null)) {
        return <ErrorItem feedItem={feedItem}>
            {`Activity internal identifier is **${feedItem.activity.guid == null ? 'Unspecified ❌' : 'Specified ✔'}**\n\n`}
            {`Activity title is **${feedItem.activity.title ?? 'Unspecified ❌'}**\n\n`}
        </ErrorItem>
    } else if (feedItem.activity.type == null || feedItem.activity.start == null || feedItem.activity.guid == null || feedItem.activity.title == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Activity internal identifier is **${feedItem.activity.guid == null ? 'Unspecified ❌' : 'Specified ✔'}**\n\n`}
            {`Activity title is **${feedItem.activity.title ?? 'Unspecified ❌'}**\n\n`}
            {`Activity type is **${ActivityTypeNameMapping[feedItem.activity.type] ?? 'Unspecified ❌'}**\n\n`}
            {`Activity start is **${feedItem.activity.start.toLocaleString() ?? 'Unspecified ❌'}**`}
            {((feedItem.activity.type === ActivityType.TASK || feedItem.activity.type === ActivityType.SCHEDULED) && feedItem.activity.end == null)
                ? `\n\nActivity due date is **${feedItem.activity.start.toLocaleString() ?? 'Unspecified ❌'}**` : ''}
        </ErrorItem>
    }

    let description = <></>;

    switch (feedItem.type) {
        case ContactTimelineEventType.ACTIVITY_CREATED:
            description =
                <span>created <FormattedLink deleted={feedItem.activity.deleted}
                                             href={`/activities/${feedItem.activity.guid}`}>{feedItem.activity.title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.ACTIVITY_COMPLETED:
            description =
                <span>completed <FormattedLink deleted={feedItem.activity.deleted}
                                               href={`/activities/${feedItem.activity.guid}`}>{feedItem.activity.title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.ACTIVITY_FAILED:
            description =
                <span>marked <FormattedLink deleted={feedItem.activity.deleted}
                                            href={`/activities/${feedItem.activity.guid}`}>{feedItem.activity.title}</FormattedLink> as a failure</span>
            break;

        case ContactTimelineEventType.ACTIVITY_REMOVED:
            description =
                <span>deleted <FormattedLink deleted={feedItem.activity.deleted}
                                             href={`/activities/${feedItem.activity.guid}`}>{feedItem.activity.title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.ACTIVITY_CANCELLED:
            description =
                <span>cancelled <FormattedLink deleted={feedItem.activity.deleted}
                                               href={`/activities/${feedItem.activity.guid}`}>{feedItem.activity.title}</FormattedLink></span>
            break;

        case ContactTimelineEventType.ACTIVITY_STATUS_CHANGED:
            description = <span>
                changed <FormattedLink deleted={feedItem.activity.deleted}
                                       href={`/activities/${feedItem.activity.guid}`}>{feedItem.activity.title}</FormattedLink>{"'s "}
                <Markdown disallowedElements={['p']} unwrapDisallowed>{`status ${feedItem.extraInfo}`}</Markdown>
            </span>
            break;

        case ContactTimelineEventType.ACTIVITY_STEP_CHANGED:
            description = <>{'Not implemented, so this shouldn\'t be here'}</>
            break;

        case ContactTimelineEventType.ACTIVITY_ADDED_TO:
            description = <span>added <EnglishList
                strs={feedItem.contacts.map(person => person.name)}
                Component={({children, idx}) =>
                    <FormattedLink href={feedItem.contacts[idx].href} deleted={feedItem.contacts[idx].deleted}>
                        {children}
                    </FormattedLink>}/> to
                <FormattedLink deleted={feedItem.activity.deleted} href={feedItem.activity.guid}>{feedItem.activity.title}</FormattedLink>
            </span>
            break;

        case ContactTimelineEventType.ACTIVITY_REMOVED_FROM:
            description = <span>removed <EnglishList
                strs={feedItem.contacts.map(person => person.name)}
                Component={({children, idx}) =>
                    <FormattedLink href={feedItem.contacts[idx].href} deleted={feedItem.contacts[idx].deleted}>
                        {children}
                    </FormattedLink>}/> from
                <FormattedLink href={feedItem.activity.guid} deleted={feedItem.activity.deleted}>{feedItem.activity.title}</FormattedLink>
            </span>
            break;
    }

    return (<>
        <div>
            <div className="relative px-1">
                <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 ring-8 ring-white dark:ring-gray-900">
                    <ActivityIcon type={feedItem.type} activityType={feedItem.activity.type}/>
                </div>
            </div>
        </div>
        <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                On {feedItem.eventAt.toLocaleDateString()} at {feedItem.eventAt.toLocaleTimeString()}, {feedItem.user} {description}
                {includeActivityDetails && <>
                    <br/>
                    <b>With: </b>
                    <EnglishList
                        strs={feedItem.contacts.map(person => person.name)}
                        Component={({children, idx}) => {
                            const contact = feedItem.contacts[idx]
                            return <FormattedLink deleted={contact.deleted} href={contact.href}>{children}</FormattedLink>
                        }}/>

                    <br/>
                    <b>Assigned to: </b>
                    {feedItem.activity.assigned == null || feedItem.activity.assigned.length === 0 ? 'None' :
                        <EnglishList
                            strs={feedItem.activity.assigned ?? []}
                            Component={({children}) => <span
                                className="font-medium text-gray-900 dark:text-gray-100">{children}</span>}/>}
                    <br/>
                    {feedItem.activity.type === ActivityType.TASK &&
                        <div className="flex items-center space-x-2">
                            <span>Started: <b><DateRenderer date={feedItem.activity.start}/></b></span>
                            <span>Due: <b><DateRenderer date={feedItem.activity.end}/></b></span>
                        </div>}
                    {feedItem.activity.type === ActivityType.SCHEDULED &&
                        <div className="flex items-center space-x-2">
                            <span>At: <b><DateTimeRenderer date={feedItem.activity.start}/></b></span>
                            <span>Until: <b><DateTimeRenderer date={feedItem.activity.end}/></b></span>
                        </div>}
                    {feedItem.activity.description}
                </>}
            </div>
        </div>
    </>)
}

function WaypointItem({feedItem}: {
    feedItem: FeedItem,
}) {
    if (feedItem.waypoint == null || feedItem.waypoint.title == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Waypoint is **Unspecified ❌**\n\n`}
            {`Waypoint title is **${feedItem.waypoint?.title ?? 'Unspecified ❌'}**`}
        </ErrorItem>
    } else if (feedItem.activity == null || feedItem.activity.title == null || feedItem.activity.guid == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Waypoint is related to an activity, but the activity is improperly formed\n\n`}
            {`Activity internal identifier is **${feedItem.activity?.guid == null ? 'Unspecified ❌' : 'Specified ✔'}**\n\n`}
            {`Activity title is **${feedItem.activity?.title ?? 'Unspecified ❌'}**`}
        </ErrorItem>
    }

    return <>
        <div className="relative">
            <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-950 ring-8 ring-white dark:ring-zinc-950">
                <ListTodoIcon className={ICON_CLASSES}/>
            </div>
        </div>

        <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <b><DateRenderer date={feedItem.eventAt}/></b>
                — {feedItem.user} started the waypoint {feedItem.waypoint.title} for{' '}
                <FormattedLink
                    deleted={feedItem.activity.deleted}
                    href={`/activity/${feedItem.activity.guid}`}
                >
                    {feedItem.activity.title}
                </FormattedLink>
            </div>
        </div>
    </>
}

function ContactItem({feedItem}: { feedItem: FeedItem }) {
    let icon: React.ReactNode = <></>;
    let subIcon: React.ReactNode = <></>;
    let action = '';

    switch (feedItem.type) {
        case ContactTimelineEventType.CONTACT_CREATED:
            subIcon = <Plus className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-300"/>
            action = 'created'
            break;

        case ContactTimelineEventType.CONTACT_REMOVED:
            subIcon = <XIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-300"/>
            action = 'removed'
            break;
    }

    switch (feedItem.contacts[0].contactType) {
        case ContactType.HOUSEHOLD:
            icon = <House className={ICON_CLASSES}/>
            break;
        case ContactType.COMPANY:
            icon = <Building className={ICON_CLASSES}/>
            break;
        case ContactType.INDIVIDUAL:
            icon = <UserCircle className={ICON_CLASSES}/>
            break;
    }

    return (<>
        <div className="relative">
            <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-950 ring-8 ring-white dark:ring-zinc-950">
                {icon}
            </div>

            <span className="absolute -bottom-0.5 -right-1 rounded-tl bg-background px-0.5 py-px">
                {subIcon}
            </span>
        </div>
        <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <b><DateRenderer date={feedItem.eventAt}/></b>
                — {feedItem.user} {action}{' '}
                <FormattedLink deleted={feedItem.contacts[0].deleted} href={feedItem.contacts[0].href}>
                    {feedItem.contacts[0].name}
                </FormattedLink>
                {feedItem.extraInfo != null && <br/>}
                {feedItem.extraInfo}
            </div>
        </div>
    </>)
}

function MemberItem({feedItem}: { feedItem: FeedItem }) {
    const parent = feedItem.contacts.find(contact => contact.type === ContactTimelineEventJoinType.MEMBER_PARENT)
    const child = feedItem.contacts.find(contact => contact.type === ContactTimelineEventJoinType.MEMBER_CONTACT)

    if (parent == null || child == null) {
        return <ErrorItem feedItem={feedItem}>
            {`Parent is **${parent?.name ?? 'Unspecified ❌'}**\n\n`}
            {`Child is **${child?.name ?? 'Unspecified ❌'}**\n\n`}
        </ErrorItem>
    } else if (parent.contactType === ContactType.INDIVIDUAL) {
        return <ErrorItem feedItem={feedItem}>
            Somehow {child.name} ended up as a member of {parent.name} who is an individual. This should not be
            possible.
        </ErrorItem>
    }

    let icon: React.ReactNode = <></>;
    let subIcon: React.ReactNode = <></>;
    let action = '';

    switch (feedItem.type) {
        case ContactTimelineEventType.MEMBER_ADDED:
            icon = <UserPlus className={ICON_CLASSES}/>
            action = 'added'
            break;

        case ContactTimelineEventType.MEMBER_REMOVED:
            icon = <UserMinus className={ICON_CLASSES}/>
            action = 'removed'
            break;
    }

    switch (parent.contactType) {
        case ContactType.HOUSEHOLD:
            subIcon = <House className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-300"/>
            break;

        case ContactType.COMPANY:
            subIcon = <Building className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-3000"/>
            break;
    }

    return (<>
        <div className="relative">
            <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-950 ring-8 ring-white dark:ring-zinc-950">
                {icon}
            </div>

            <span className="absolute -bottom-0.5 -right-1 rounded-tl bg-background px-0.5 py-px">
                {subIcon}
            </span>
        </div>
        <div className="min-w-0 flex-1 py-1.5">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                <b><DateRenderer date={feedItem.eventAt}/></b>
                — {feedItem.user} {action}{' '}
                <FormattedLink deleted={child.deleted} href={child.href}>
                    {child.name}
                </FormattedLink> to
                <FormattedLink deleted={parent.deleted} href={parent.href}>
                    {parent.name}
                </FormattedLink>
            </div>
        </div>
    </>)
}

function ActivityIcon({type, activityType}: { type: ContactTimelineEventType, activityType?: ActivityType }) {
    switch (type) {
        case ContactTimelineEventType.ACTIVITY_CREATED:
            if (activityType === ActivityType.TASK) {
                return <ClipboardPlus className={ICON_CLASSES}/>
            } else {
                return <CalendarPlus2 className={ICON_CLASSES}/>
            }

        case ContactTimelineEventType.ACTIVITY_COMPLETED:
            if (activityType === ActivityType.TASK) {
                return <ClipboardCheck className={ICON_CLASSES}/>
            } else {
                return <CalendarCheck className={ICON_CLASSES}/>
            }

        case ContactTimelineEventType.ACTIVITY_FAILED:
            return <BadgeAlert className={ICON_CLASSES}/>

        case ContactTimelineEventType.ACTIVITY_REMOVED:
        case ContactTimelineEventType.ACTIVITY_CANCELLED:
            if (activityType === ActivityType.TASK) {
                return <ClipboardX className={ICON_CLASSES}/>
            } else {
                return <CalendarOff className={ICON_CLASSES}/>
            }

        case ContactTimelineEventType.ACTIVITY_STATUS_CHANGED:
            if (activityType === ActivityType.TASK) {
                return <ClipboardPen className={ICON_CLASSES}/>
            } else {
                return <CalendarCog className={ICON_CLASSES}/>
            }

        case ContactTimelineEventType.ACTIVITY_STEP_CHANGED:
            return <StepForward className={ICON_CLASSES}/>
    }
}

export function ClientFeed({contact}: { contact: string }) {
    const navContext = useContactSelection()

    if (navContext.selectedContact?.guid === contact) {
        return <Feed contact={contact} includeActivityDetails={true} includeOpportunityDetails={true}/>
    } else {
        return <></>
    }
}

