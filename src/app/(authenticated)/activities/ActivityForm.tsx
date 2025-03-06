"use client"

import React, {Dispatch, SetStateAction, useEffect, useState} from "react"

import {Button} from "~/components/ui/button"
import {Dialog, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog"
import {Input} from "~/components/ui/input"
import {Label} from "~/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Textarea} from "~/components/ui/textarea"
import {TimePicker} from "~/components/ui/datetime-picker";
import {handleServerAction} from "~/util/api/client/APIClient";
import {readUser} from "~/common/actions/read"
import {ClientSideReadResult} from "~/db/sql/types/utility";
import {
    ActivityPriority,
    ActivityPriorityNameMapping,
    ActivityStatus,
    ActivityStatusNameMapping,
    ActivityStepType,
    ActivityStepTypeNameMapping,
    ActivityType,
    ActivityTypeNameMapping,
    ContactType,
    TaskParents,
    TaskScheduleSubtypes,
    TaskScheduleSubtypeToParent,
    TaskScheduleType,
    TaskScheduleTypeNameMapping
} from "~/common/enum/enumerations";
import {createActivity, createNote, getActivity, getActivityTimeline, updateActivity} from "~/app/(authenticated)/activities/Actions";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {UserPicker} from "~/components/data/pickers/UserPicker"
import {ContactPicker} from "~/components/data/pickers/ContactPicker"
import SkeletonForm from "~/components/util/SkeletonForm";
import {RequiredDate, RequiredString, Validation} from "~/components/data/ValidationProvider";
import {toast} from "sonner";
import {englishList, isEmptyString} from "~/util/strings";
import {useValidation} from "~/hooks/use-validation";
import {invalidDate} from "~/util/db/validation";
import {useStateRef} from "~/hooks/use-state-ref";
import {FormField} from "~/components/form/FormUtils";
import {InfiniteList} from "~/components/ui/infinitelist";
import {ActivityTypeIcons} from "~/components/data/models/ActivityTypeIcon"
import {motion} from "framer-motion";
import {Badge} from "~/components/ui/badge";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {ContactAdder} from "~/components/data/pickers/adders/ContactAdder";
import {ENTITY_ADDER_HEIGHT, INDIVIDUAL_ADDER_HEIGHT} from "../contacts/[guid]/components/ContactForm"
import {Calendar, CheckCircle, ListTodoIcon, LucideIcon, Plus, Trash2, User, WorkflowIcon} from "lucide-react";
import {DatePicker} from "~/components/ui/date-picker";
import {DialogPage, PagedDialogContent, PagedDialogFooter} from "~/components/form/PagedDialog";
import classNames from "classnames";
import {SubActivity, Waypoint} from "~/app/(authenticated)/activities/[guid]/client";
import {PriorityColors} from "~/common/ui/BadgeColors";
import {ActivityStatusBadge} from "~/app/(authenticated)/activities/client";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {Card, CardContent, CardHeader} from "~/components/ui/card";
import {format} from "date-fns";
import {dateGreater} from "~/util/time/date";
import {generateClientId} from "~/lib/utils";
import {Checkbox} from "~/components/ui/checkbox";

export declare type ActivityDialogProps = {
    type?: ActivityType,
    canChangeType?: boolean,
    trigger: React.ReactNode,
    toLoad?: string,
    activity?: ClientActivity,
    onSuccess?: (activity: ClientActivity) => Promise<void>
    open?: boolean
    setOpen?: (open: boolean) => void
}

const EventTypeColors = {
    [TaskScheduleType.COMMUNICATION]: "bg-blue-500 dark:bg-blue-700 dark:text-white",
    [TaskScheduleType.MEETING]: "bg-emerald-500 dark:bg-emerald-700 dark:text-white",
    [TaskScheduleType.FINANCIAL_PLANNING]: "bg-amber-500 dark:bg-amber-700 dark:text-white",
    [TaskScheduleType.TASK]: "bg-rose-500 dark:bg-rose-700 dark:text-white",
    [TaskScheduleType.HOLD]: "bg-purple-500 dark:bg-purple-700 dark:text-white",
}

const eventTypes = Object.keys(TaskScheduleSubtypes).map(type => {
    'use no memo'
    return {
        id: type,
        name: TaskScheduleTypeNameMapping[type as TaskScheduleType],
        icon: ActivityTypeIcons[type as TaskScheduleType],
        color: EventTypeColors[type as keyof typeof EventTypeColors],
        subtypes: TaskScheduleSubtypes[type as TaskParents].map(subtype => {
            return {
                id: subtype,
                label: TaskScheduleTypeNameMapping[subtype as TaskScheduleType],
                icon: ActivityTypeIcons[subtype as TaskScheduleType]
            }
        })
    }
})

type NewContact = {
    guid: string,
    fullName: string,
    primaryEmail: null,
    type: ContactType;
    fName: string,
    lName: string,
}

const ActivityBaseTypeIcons: Record<ActivityType, {
    icon: LucideIcon,
    color: string
}> = {
    [ActivityType.SCHEDULED]: {
        icon: Calendar,
        color: 'bg-blue-900 text-white'
    },
    [ActivityType.TASK]: {
        icon: CheckCircle,
        color: 'bg-cyan-900 text-white'
    },
    [ActivityType.PATH]: {
        icon: WorkflowIcon,
        color: 'bg-red-600 text-white'
    },
    [ActivityType.WAYPOINT]: {
        icon: ListTodoIcon,
        color: 'bg-amber-600 text-white'
    }
}

export declare type ClientActivity = {
    guid?: string;
    title: string;
    type?: ActivityType;
    subType: TaskScheduleType | null;
    description: string | null;
    status: ActivityStatus;
    priority: ActivityPriority;
    startDate: Date | null;
    endDate: Date | null;
    contacts: {
        guid: string;
        fullName: string;
        primaryEmail: string | null;
        type: ContactType;
    }[];
    users: {
        guid: string;
        fullName: string;
        email: string;
    }[];
    location: string | null;
    phoneNumber: string | null;
    holdReason: string | null;
    events: FeedItem[];
    notes?: {
        guid: string;
        content: string;
        author: string;
        createdAt: Date;
    }[],
    waypoints: WaypointConfig[]
    childActivities: SubActivityConfig[]
}

export default function ActivityDialog({
                                           type,
                                           canChangeType = true,
                                           trigger,
                                           toLoad,
                                           activity: initialActivity,
                                           onSuccess,
                                           open: externalOpen,
                                           setOpen: externalSetOpen
                                       }: ActivityDialogProps) {
    type UserReadResult = ClientSideReadResult<typeof readUser>

    const [activity, setActivity] = useState<ClientActivity>(initialActivity ?? {
        title: '',
        type,
        subType: null,
        startDate: null,
        endDate: null,
        description: null,
        users: [],
        contacts: [],
        events: [],
        status: ActivityStatus.NOT_STARTED,
        priority: ActivityPriority.MEDIUM,
        location: null,
        phoneNumber: null,
        holdReason: null,
        waypoints: [],
        childActivities: [],
    })

    const [eventType, setEventType] = useState<TaskParents | null>(null)
    const [eventSubtype, setEventSubtype] = useState<TaskScheduleType | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
    const [currentEventType, setCurrentEventType] = useState<typeof eventTypes[number] | null>(null)

    const [prevType, setPrevType] = useState<ActivityType | null>(null)

    const [newContact, setNewContact] = useState<NewContact>({
        guid: '_new',
        fullName: '',
        primaryEmail: null,
        type: ContactType.INDIVIDUAL,
        fName: '',
        lName: '',
    })

    const [page, setPage] = useState<'details' | 'waypoints' | 'children'>('details')

    // const resetContact = () => {
    //     setNewContact({
    //         guid: '_new',
    //         fullName: '',
    //         primaryEmail: null,
    //         type: ContactType.INDIVIDUAL,
    //         fName: '',
    //         lName: '',
    //     })
    // }

    const setNewContactType = (type: ContactType) => {
        setNewContact(prev => ({...prev, type}))
    }

    const updateNewContact = (fName: string, lName: string) => {
        setNewContact(prev => ({...prev, fullName: `${fName} ${lName}`, fName, lName}))
    }

    const handleDurationSelect = (duration: number) => {
        setActivity(prev => {
            const end = new Date(prev.startDate!);
            if (activity.type === ActivityType.SCHEDULED) {
                end.setMinutes(end.getMinutes() + duration);
            } else {
                end.setDate(end.getDate() + duration);
            }
            return {...prev, endDate: end}
        })
        setSelectedDuration(duration)
    }

    const activityRef = useStateRef(activity);

    const validatedElements = new Set<string>(['title', 'startDate', 'endTime', 'assignedTo'])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target
        setActivity(prev => ({...prev, [name]: value}))

        if (validatedElements.has(name)) {
            resetValidation(name)
        }
    }

    useEffect(() => {
        if (externalOpen != null) {
            setIsOpen(externalOpen)
        }
    }, [externalOpen])

    const _setOpen = (open: boolean) => {
        if (externalSetOpen) {
            externalSetOpen(open)
        } else {
            setIsOpen(open)
        }
    }

    // Initial set of notes to create for this activity
    const [initialNotes, setInitialNotes] = useState('')

    const [newNotes, setNewNotes] = useState<FeedItem[]>([])

    useEffect(() => {
        if (initialActivity) {
            setActivity(initialActivity)

            if (initialActivity.subType) {
                if (TaskScheduleSubtypeToParent[initialActivity.subType]) {
                    const parent = TaskScheduleSubtypeToParent[initialActivity.subType]
                    const type = eventTypes.find(type => type.id === parent)
                    setEventType(TaskScheduleSubtypeToParent[initialActivity.subType]!)
                    setCurrentEventType(type!)
                    setEventSubtype(initialActivity.subType)
                } else if (TaskScheduleSubtypes[initialActivity.subType as TaskParents]) {
                    const type = eventTypes.find(type => type.id === initialActivity.subType)
                    setEventType(initialActivity.subType as TaskParents)
                    setCurrentEventType(type!)
                    setEventSubtype(null)
                }
            }
        }
    }, [initialActivity])

    useEffect(() => {
        if (eventType && eventSubtype) {
            setActivity(prev => ({...prev, subType: eventSubtype}))
        } else if (eventType) {
            setActivity(prev => ({...prev, subType: eventType as TaskScheduleType}))
        } else {
            setActivity(prev => ({...prev, subType: null}))
        }
    }, [eventType, eventSubtype])

    const {validate, resetValidation, clear} = useValidation()

    useEffect(() => {
        // Reset data
        if (!isOpen) {
            clear()
            setPage('details')
            setActivity(initialActivity ?? {
                title: '',
                type,
                subType: null,
                startDate: null,
                endDate: null,
                description: null,
                users: [],
                contacts: [],
                events: [],
                status: ActivityStatus.NOT_STARTED,
                priority: ActivityPriority.MEDIUM,
                location: null,
                phoneNumber: null,
                holdReason: null,
                waypoints: [],
                childActivities: [],
            })
            setEventType(null)
            setEventSubtype(null)
            setCurrentEventType(null)
            setSelectedDuration(null)
            setNewContact({
                guid: '_new',
                fullName: '',
                primaryEmail: null,
                type: ContactType.INDIVIDUAL,
                fName: '',
                lName: '',
            })
            setNewNotes([])
        }
    }, [isOpen])

    const queryClient = useQueryClient()

    const handleSave = async () => {
        // In a real application, this would save the task to the database

        const validation = validate()
        if (!validation[0]) {
            toast.error('Please fix the errors in your input')
            return
        }

        const invalidWaypoints = [] as string[];
        const waypointRecord = {} as Record<string, { waypoint: WaypointConfig, idx: number }>;
        // Manually validate the waypoints, activities, and steps
        activity.waypoints.forEach((waypoint, idx) => {
            waypointRecord[waypoint._id] = {waypoint, idx}
            if (isEmptyString(waypoint.title)) {
                invalidWaypoints.push(`Waypoint #${idx + 1}. Missing title`)
            } else if (idx === 0 && waypoint.start == null && waypoint.end == null) {
                invalidWaypoints.push(`Waypoint ${waypoint.title} (#${idx + 1}). Missing due date`)
            } else if (idx !== 0 && waypoint.start == null || waypoint.end == null || waypoint.start! > waypoint.end) {
                invalidWaypoints.push(`Waypoint ${waypoint.title} (#${idx + 1}).${waypoint.start == null ? ' Missing start date.' : ''}${waypoint.end == null ? ' Missing end date.' : ''}${waypoint.start != null && waypoint.end != null && waypoint.start > waypoint.end ? ' Start date is after end date.' : ''}`)
            }
        })

        if (invalidWaypoints.length > 0) {
            toast.error(`Invalid waypoint${invalidWaypoints.length > 1 ? 's' : ''}: ${englishList(invalidWaypoints)}`)
        }

        const invalidActivities = [] as string[];
        const waypointToActivityMap = {} as Record<string, string[]>;

        activity.childActivities.forEach(activity => {
            if (activity.waypoint == null) return
            if (waypointToActivityMap[activity.waypoint] == null) {
                waypointToActivityMap[activity.waypoint] = []
            }
            waypointToActivityMap[activity.waypoint].push(activity._id)
        })

        activity.childActivities.forEach((activity, idx) => {
            if (isEmptyString(activity.title)) {
                if (activity.waypoint) {
                    let waypointTitle = waypointRecord[activity.waypoint].waypoint.title
                    const activityNum = waypointToActivityMap[activity.waypoint].indexOf(activity._id) + 1
                    if (isEmptyString(waypointTitle)) {
                        waypointTitle = `Waypoint #${waypointRecord[activity.waypoint].idx + 1}`
                    } else {
                        waypointTitle += ` (#${waypointRecord[activity.waypoint].idx + 1})`
                    }
                    invalidActivities.push(`Activity #${activityNum + 1} in Waypoint ${waypointTitle}. Missing title`)
                } else {
                    invalidActivities.push(`Activity #${idx + 1}. Missing title`)
                }
            } else if (activity.start == null || activity.end == null || activity.start > activity.end || activity.type == null || activity.priority == null) {
                const issues = []
                if (activity.start == null) {
                    issues.push('Missing start date')
                }
                if (activity.end == null) {
                    issues.push('Missing end date')
                }
                if (activity.end != null && activity.start != null && activity.end < activity.start) {
                    issues.push('Start date is after end date')
                }
                if (activity.type == null) {
                    issues.push('Missing activity type')
                }
                if (activity.priority == null) {
                    issues.push('Missing activity priority')
                }
                if (activity.waypoint) {
                    const activityNum = waypointToActivityMap[activity.waypoint].indexOf(activity._id) + 1
                    let waypointTitle = waypointRecord[activity.waypoint].waypoint.title
                    if (isEmptyString(waypointTitle)) {
                        waypointTitle = `Waypoint #${waypointRecord[activity.waypoint].idx + 1}`
                    } else {
                        waypointTitle += ` (#${waypointRecord[activity.waypoint].idx + 1})`
                    }
                    invalidActivities.push(`Activity ${activity.title} (#${activityNum + 1}) in Waypoint ${waypointTitle}. ${issues.join(', ')}`)
                } else {
                    invalidActivities.push(`Activity ${activity.title} (#${idx + 1}). ${issues.join(', ')}`)
                }
            } else {
                // Validate steps
                let invalidStep = false;
                activity.steps.forEach((step) => {
                    if (isEmptyString(step.title)) {
                        invalidStep = true
                    } else if (step.type == null) {
                        invalidStep = true
                    }
                })

                if (invalidStep) {
                    if (activity.waypoint) {
                        const activityNum = waypointToActivityMap[activity.waypoint].indexOf(activity._id) + 1
                        let waypointTitle = waypointRecord[activity.waypoint].waypoint.title
                        if (isEmptyString(waypointTitle)) {
                            waypointTitle = `Waypoint #${waypointRecord[activity.waypoint].idx + 1}`
                        } else {
                            waypointTitle += ` (#${waypointRecord[activity.waypoint].idx + 1})`
                        }
                        invalidActivities.push(`Activity ${activity.title} (#${activityNum + 1}) in Waypoint ${waypointTitle} has invalid steps`)
                    } else {
                        invalidActivities.push(`Activity ${activity.title} (#${idx + 1}) has invalid steps`)
                    }
                }
            }
        })

        if (invalidActivities.length > 0 || invalidWaypoints.length > 0) {
            return;
        }

        if (isNew) {
            const result = handleServerAction(await createActivity(activity, initialNotes));
            if (result.success) {
                _setOpen(false)
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: ['activityTable']
                    }),
                    onSuccess?.(activity)
                ])
            }
        } else {
            const result = handleServerAction(await updateActivity(activity));
            if (result.success) {
                _setOpen(false)
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: ['activityTable']
                    }),
                    onSuccess?.(activity)
                ])
            }
        }
    }

    const {isLoading, error, isError} = useQuery({
        queryKey: ['schedule', toLoad],
        queryFn: async () => {
            if (toLoad) {
                const result = handleServerAction(await getActivity(toLoad));
                if (!result.success) {
                    throw new Error(`Error reading task: ${result.message}`);
                }

                const activity = result.result

                if (activity == null) {
                    if (result.message != null) {
                        throw new Error(`Error reading task: ${result.message}`);
                    } else {
                        throw new Error(`Error reading task`);
                    }
                }

                setActivity(activity)

                if (activity.subType != null) {
                    if (TaskScheduleSubtypeToParent[activity.subType!]) {
                        const parent = TaskScheduleSubtypeToParent[activity.subType!]
                        const type = eventTypes.find(type => type.id === parent)
                        setEventType(parent)
                        setEventSubtype(activity.subType!)
                        setCurrentEventType(type!)
                    } else if (TaskScheduleSubtypes[activity.subType as TaskParents]) {
                        const type = eventTypes.find(type => type.id === activity.subType)
                        setEventType(activity.subType as TaskParents)
                        setCurrentEventType(type!)
                        setEventSubtype(null)
                    }
                }
                return 'success'
            }
            return 'noload'
        },
        enabled: toLoad != null && isOpen
    })

    useEffect(() => {
        if (activity.startDate == null || (activity.endDate != null && selectedDuration == null)) {
            return
        }

        setActivity(prev => {
            if (invalidDate(prev.endDate) && prev.startDate) {
                const endDate = new Date(prev.startDate);
                if (prev.type === ActivityType.SCHEDULED) {
                    endDate.setHours(endDate.getHours() + 1);
                }
                return {...prev, endDate}
            }
            // Keep consistent time, but change date
            const endDate = new Date(prev.endDate!);
            endDate.setDate(prev.startDate!.getDate());
            endDate.setMonth(prev.startDate!.getMonth());
            endDate.setFullYear(prev.startDate!.getFullYear());

            if (selectedDuration != null && activity.startDate) {
                if (activity.type === ActivityType.SCHEDULED) {
                    endDate.setHours(activity.startDate.getHours(), activity.startDate.getMinutes() + selectedDuration, 0, 0);
                } else {
                    endDate.setDate(activity.startDate.getDate() + selectedDuration);
                }
            }
            return {...prev, endDate}
        })
    }, [activity.startDate, selectedDuration])

    useEffect(() => {
        setPrevType(activity.type ?? null)
        setActivity(prev => {
            if (activity.startDate == null) {
                return prev;
            }
            if (prevType === ActivityType.SCHEDULED && activity.type !== ActivityType.SCHEDULED) {
                // Changed from scheduled to something else
                const _update = {...prev, endDate: activity.startDate ? new Date(activity.startDate) : null}
                if (activity.status === ActivityStatus.NOT_STARTED) {
                    _update.status = ActivityStatus.SCHEDULED
                }
                return _update
            } else if (activity.type === ActivityType.SCHEDULED && prevType !== ActivityType.SCHEDULED && prevType != null) {
                // Changed from something else to scheduled
                const endDate = new Date(prev.startDate!);
                endDate.setHours(endDate.getHours() + 1, endDate.getMinutes(), 0, 0);
                setSelectedDuration(null)
                const _update = {...prev, endDate}
                if (activity.status === ActivityStatus.SCHEDULED) {
                    _update.status = ActivityStatus.NOT_STARTED
                }
                return _update
            }

            return prev
        })
    }, [activity.type])

    const isNew = activity.guid == null && toLoad == null;

    const handleSaveNote = async () => {
        if (activity.guid == null) {
            toast.info('Please wait for the info to load before adding a note')
            return
        }
        if (isEmptyString(initialNotes)) {
            toast.error('Please enter a note')
            return
        }
        const result = handleServerAction(await createNote(activity.guid!, initialNotes));
        if (!result.success) {
            throw new Error(`Error saving note: ${result.message}`);
        } else {
            toast.success('Note saved')
        }

        const note = result.result!;

        setInitialNotes('')
        setNewNotes(prev => [note, ...prev])
    }

    const renderAdditionalField = () => {
        switch (eventType) {
            case TaskScheduleType.MEETING:
                let caption = '';
                let label = '';
                switch (eventSubtype) {
                    case TaskScheduleType.MEETING_VIRTUAL:
                        caption = 'Enter virtual meeting link'
                        label = 'Virtual Meeting Link'
                        break;
                    case TaskScheduleType.MEETING_INTERNAL:
                    case TaskScheduleType.MEETING_CLIENT:
                    case TaskScheduleType.MEETING_PERSONAL:
                        caption = 'Enter meeting link or location'
                        label = 'Meeting Location'
                        break;

                    case TaskScheduleType.MEETING_IN_PERSON:
                        caption = 'Enter meeting location'
                        label = 'Meeting Location'
                        break;
                }

                return <FormField label={label} htmlFor={'location'} grid={false}>
                    <Input
                        id="location"
                        placeholder={caption}
                        value={activity.location ?? ''}
                        onChange={(e) => setActivity(prev => ({...prev, location: e.target.value}))}
                    />
                </FormField>

            case TaskScheduleType.COMMUNICATION:
                return (
                    <FormField label={'Phone Number'} htmlFor={'phone-number'} grid={false}>
                        <Input
                            id="phone-number"
                            placeholder="Enter phone number"
                            value={activity.phoneNumber ?? ''}
                            onChange={(e) => setActivity(prev => ({...prev, phoneNumber: e.target.value}))}
                        />
                    </FormField>
                )

            case TaskScheduleType.HOLD:
                if (eventSubtype !== TaskScheduleType.HOLD_TENTATIVE && activity.type === ActivityType.SCHEDULED) {
                    return (
                        <FormField label={'Reason for Hold'} htmlFor={'hold-reason'} grid={false}>
                            <Input
                                id="hold-reason"
                                placeholder="Enter reason for hold"
                                value={activity.holdReason ?? ''}
                                onChange={(e) => setActivity(prev => ({...prev, holdReason: e.target.value}))}
                            />
                        </FormField>
                    )
                }
                break;
            default:
                return null
        }
    }

    type Duration = {
        duration: number,
        label: string
    }
    let durations: Duration[]
    if (activity.type === ActivityType.SCHEDULED) {
        durations = [
            {duration: 15, label: "15 min"},
            {duration: 30, label: "30 min"},
            {duration: 60, label: "1 hour"}
        ]
    } else {
        durations = [
            {duration: 0, label: 'Today'},
            {duration: 1, label: 'Tomorrow'},
            {duration: 7, label: 'In a week'},
        ]
    }

    let form = (<div className="p-2">
        <div className="space-y-4">
            {(canChangeType && isNew) && <div className="space-y-2">
                <Label>Activity Type</Label>
                <div className="flex space-x-2">
                    {Object.keys(ActivityTypeNameMapping).map((key) => {
                        const type = ActivityBaseTypeIcons[key as ActivityType]
                        return <motion.div
                            key={key}
                            whileHover={{scale: 1.05}}
                            whileTap={{scale: 0.95}}
                            className="flex-1"
                        >
                            <Button
                                type="button"
                                variant={activity.type === key ? "default" : "outline"}
                                className={`w-full ${activity.type === key ? type.color : ''}`}
                                onClick={() => {
                                    setActivity({
                                        ...activity,
                                        type: key as ActivityType
                                    })
                                    if (!(key === ActivityType.SCHEDULED || key === ActivityType.TASK)) {
                                        setEventType(null)
                                        setEventSubtype(null)
                                        setCurrentEventType(null)
                                    } else if (activity.type === ActivityType.SCHEDULED && currentEventType?.id === TaskScheduleType.HOLD) {
                                        setEventType(null)
                                        setEventSubtype(null)
                                        setCurrentEventType(null)
                                    }
                                }}
                            >
                                <type.icon className="mr-2 h-4 w-4"/>
                                {ActivityTypeNameMapping[key as ActivityType]}
                            </Button>
                        </motion.div>
                    })}
                </div>
            </div>}

            {(activity.type === ActivityType.SCHEDULED || activity.type === ActivityType.TASK) && <>
                <div className="space-y-2">
                    <Label>Event Type</Label>
                    <div className="flex space-x-2">
                        {eventTypes.map((type) => {
                            if (type.id === TaskScheduleType.HOLD) {
                                if (activity.type !== ActivityType.SCHEDULED) return null
                            }

                            return (
                                <motion.div
                                    key={type.id}
                                    whileHover={{scale: 1.05}}
                                    whileTap={{scale: 0.95}}
                                    className="flex-1"
                                >
                                    <Button
                                        type="button"
                                        variant={eventType === type.id ? "default" : "outline"}
                                        className={`w-full ${eventType === type.id ? type.color : ''}`}
                                        onClick={() => {
                                            setEventType(type.id as TaskParents)
                                            setCurrentEventType(type)
                                            setEventSubtype(null)
                                        }}
                                    >
                                        <type.icon className="mr-2 h-4 w-4"/>
                                        {type.name}
                                    </Button>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {currentEventType && (
                    <div className="space-y-2">
                        <Label>Event Subtype</Label>
                        <div className="flex flex-wrap gap-2">
                            {currentEventType.subtypes.map((subtype) => (
                                <motion.div
                                    key={subtype.id}
                                    whileHover={{scale: 1.05}}
                                    whileTap={{scale: 0.95}}
                                >
                                    <Badge
                                        variant={eventSubtype === subtype.id ? "default" : "outline"}
                                        className={`cursor-pointer hover:bg-primary hover:text-primary-foreground ${
                                            eventSubtype === subtype.id ? currentEventType.color : ''
                                        }`}
                                        onClick={() => setEventSubtype(subtype.id)}
                                    >
                                        {subtype.icon && React.createElement(subtype.icon, {className: "mr-1 h-3 w-3 inline"})}
                                        {subtype.label}
                                    </Badge>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </>}

            <FormField grid={false} label={'Title'} htmlFor={'title'} required={true}>
                <Input
                    id="title"
                    name="title"
                    value={activity.title}
                    onChange={handleInputChange}
                    placeholder="Enter title..."
                />
                <RequiredString element={'title'} friendlyName={'Title'} value={activity.title} render={(value) => {
                    return <>
                        <div/>
                        <p className={'text-red-500 col-span-3'}>{value}</p>
                    </>
                }}/>
            </FormField>

            <FormField grid={false} label={'For'} htmlFor={'contacts'}>
                <ContactPicker className={'col-span-3'} id={'contacts'} multi value={activity.contacts}
                               dialog
                               useAdder={true}
                               adderHeight={newContact.type === ContactType.INDIVIDUAL ? INDIVIDUAL_ADDER_HEIGHT : ENTITY_ADDER_HEIGHT}
                               cancelAdd={() => {
                                   setNewContact({
                                       guid: '_new',
                                       fName: '',
                                       lName: '',
                                       fullName: '',
                                       primaryEmail: null,
                                       type: ContactType.INDIVIDUAL
                                   })
                               }}
                               adder={<ContactAdder type={newContact.type} setType={setNewContactType}
                                                    fName={newContact.fName} lName={newContact.lName}
                                                    onChange={(fName, lName) => updateNewContact(fName, lName)}/>}
                               onValueChange={(contacts) => {
                                   setActivity(prev => ({...prev, contacts}))
                                   resetValidation('contacts')
                               }}
                               add={() => {
                                   if (newContact.fullName.trim().length > 0) {
                                       setActivity(prev => ({
                                           ...prev,
                                           contacts: [...prev.contacts, {
                                               guid: '_new',
                                               fullName: newContact.fullName,
                                               primaryEmail: newContact.primaryEmail,
                                               type: newContact.type,
                                           }]
                                       }))
                                       resetValidation('contacts')
                                   }
                               }}
                               adderTitle={'Add Contact'}
                />
            </FormField>

            <FormField grid={false} label={'Assigned To'} htmlFor={'assignedTo'} required={true}>
                <UserPicker id={'assignedTo'} multi value={activity.users}
                            dialog
                            onValueChange={(users) => {
                                setActivity(prev => ({...prev, users}))
                                resetValidation('assignedTo')
                            }}/>
                <Validation value={activity.users} validator={(value: UserReadResult[]) => {
                    if (value.length === 0) {
                        return 'Please select at least one user'
                    }
                    return true
                }} element={'assignedTo'} render={(value) => (<>
                    <div/>
                    <p className={'text-red-500 col-span-3'}>{value}</p>
                </>)}/>
            </FormField>

            <div className={`grid grid-cols-${activity.type === ActivityType.SCHEDULED ? 3 : 2} gap-4`}>
                {activity.type === ActivityType.SCHEDULED
                    ? (<>
                        <FormField grid={false} label={'Date'} htmlFor={'startDate'} className={'w-full'}>
                            <DatePicker
                                id={'startDate'}
                                date={activity.startDate ?? undefined}
                                setDate={(date) => {
                                    setActivity(prev => ({...prev, startDate: date ?? null}))
                                    resetValidation('startDate')
                                }}/>
                        </FormField>

                        {activity.startDate != null && <>
                            <FormField grid={false} label={'Start Time'} htmlFor={'startTime'} required>
                                <TimePicker granularity={'minute'} date={activity.startDate ?? null}
                                            onChange={(date) => {
                                                setActivity(prev => ({...prev, startDate: date ?? null}))
                                                resetValidation('startDate')
                                            }} hourCycle={12} id={'startTime'}/>
                            </FormField>
                            <FormField grid={false} label={'End Time'} htmlFor={'endTime'} required>
                                <TimePicker granularity={'minute'} date={activity.endDate ?? null} onChange={(date) => {
                                    setActivity(prev => {
                                        return {...prev, endDate: date ?? null}
                                    })
                                    resetValidation('startDate')
                                    setSelectedDuration(null)
                                }} hourCycle={12} id={'endTime'}/>
                                <RequiredDate element={'endTime'} value={activity.endDate} render={(value) => {
                                    return <>
                                        <div/>
                                        <p className={'text-red-500 col-span-3'}>{value}</p>
                                    </>
                                }}/>
                            </FormField>
                        </>}
                    </>)
                    : (<>
                        <FormField grid={false} label={'Start Date'} htmlFor={'startDate'} className={'w-full'}>
                            <DatePicker
                                id={'startDate'}
                                date={activity.startDate ?? undefined}
                                setDate={(date) => {
                                    setActivity(prev => ({...prev, startDate: date ?? null}))
                                    resetValidation('endDate')
                                }}/>
                        </FormField>

                        <FormField grid={false} label={'Due Date'} htmlFor={'endDate'} className={'w-full'}>
                            <DatePicker
                                id={'endDate'}
                                date={activity.endDate ?? undefined}
                                setDate={(date) => {
                                    setActivity(prev => ({...prev, endDate: date ?? null}))
                                    resetValidation('endDate')
                                }}/>
                        </FormField>
                    </>)}

                <Validation value={activity.startDate} validator={(value) => {
                    if (value == null) {
                        return 'Please select a start date'
                    }
                    if (invalidDate(value)) {
                        return 'Invalid date'
                    }
                    if (activityRef.current.endDate && dateGreater(value, activityRef.current.endDate, activityRef.current.type === ActivityType.SCHEDULED ? 'minute' : 'day')) {
                        return 'Start date must be before due date'
                    }
                    return true
                }} element={'startDate'} render={(value) => {
                    return <>
                        <div/>
                        <p className={'text-red-500 col-span-3'}>{value}</p>
                    </>
                }}/>

            </div>

            <div className="flex gap-2">
                {durations.map((duration) => (
                    <motion.div
                        key={duration.duration}
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                    >
                        <Badge
                            variant={selectedDuration === duration.duration ? "default" : "outline"}
                            className={`cursor-pointer hover:bg-primary hover:text-primary-foreground ${
                                selectedDuration === duration.duration ? (currentEventType?.color ?? ActivityBaseTypeIcons[activity.type!]?.color) : ''
                            }`}
                            onClick={() => handleDurationSelect(duration.duration)}
                        >
                            {duration.label}
                        </Badge>
                    </motion.div>
                ))}
            </div>

            {renderAdditionalField()}

            <FormField grid={false} label={'Description'} htmlFor={'description'}>
                <Input
                    id="description"
                    name="description"
                    value={activity.description ?? ''}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Enter description..."
                />
            </FormField>

            <FormField grid={false} label={'Status'} htmlFor={'status'} required={true}>
                <Select value={activity.status} onValueChange={(value) => {
                    setActivity(prev => ({...prev, status: value as ActivityStatus}))
                    resetValidation('status')
                }}>
                    <SelectTrigger id="status">
                        <SelectValue placeholder="Select status"/>
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(ActivityStatusNameMapping).map((status) => (
                            <SelectItem key={status} value={status}>
                                {ActivityStatusNameMapping[status as ActivityStatus]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField grid={false} label={'Priority'} htmlFor={'priority'} required={true}>
                <Select value={activity.priority} onValueChange={(value) => {
                    setActivity(prev => ({...prev, priority: value as ActivityPriority}))
                    resetValidation('priority')
                }}>
                    <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority"/>
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(ActivityPriorityNameMapping).map((priority) => (
                            <SelectItem key={priority} value={priority}>
                                {ActivityPriorityNameMapping[priority as ActivityPriority]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>
        </div>
        <div className={'mt-4'}>
            {!isNew && <div>
                <Label htmlFor="notes" className="text-right pt-2 font-bold">
                    Notes
                </Label>
                <div>
                    <div className={'w-full mb-4'}>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Textarea
                                id="notes"
                                value={initialNotes}
                                onChange={(e) => setInitialNotes(e.target.value)}
                                className="col-span-3"
                                placeholder="Add any additional notes here..."
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                        // Create note
                                        await handleSaveNote();
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }}
                            />
                            <Button onClick={handleSaveNote}>Save Note</Button>
                        </div>
                    </div>

                    {activity.guid != null &&
                        <ActivityTimelineFeed newItems={newNotes} activityId={activity.guid} type={'form'}
                                              initialItems={activity.events}/>}
                </div>
            </div>}

            {isNew && <div>
                <Label htmlFor="notes" className="pt-2">
                    Notes
                </Label>
                <Textarea
                    id="notes"
                    value={initialNotes}
                    onChange={(e) => setInitialNotes(e.target.value)}
                    className="col-span-3"
                    placeholder="Add any additional notes here..."
                />
            </div>}
        </div>
    </div>)

    if (isLoading) {
        form = <SkeletonForm>
            {form}
        </SkeletonForm>
    } else if (error && isError) {
        form = <div className="text-red-500">Error loading task: {(error as Error).message}</div>
    }

    let header = 'Select an Activity Type'
    let isLastPage = true

    switch (activity.type) {
        case ActivityType.SCHEDULED:
            isLastPage = true
            if (isNew) {
                header = 'Schedule Something'
            } else {
                header = 'Update Schedule'
            }
            break;

        case ActivityType.TASK:
            isLastPage = true
            header = `${isNew ? 'Create' : 'Update'} Task`
            break;

        case ActivityType.PATH:
            isLastPage = page === 'waypoints'
            header = `${isNew ? 'Begin' : 'Update'} Path`
            break;

        case ActivityType.WAYPOINT:
            isLastPage = page === 'children'
            header = `${isNew ? 'Set up' : 'Update'} Waypoint`
            break;
    }

    return (
        <Dialog open={isOpen} onOpenChange={_setOpen}>
            {trigger != null && <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>}

            <PagedDialogContent className={classNames('overflow-y-auto max-h-[95vh]', {
                "sm:max-w-[850px]": page === 'details',
                'max-w-[90vw] w-[90vw] overflow-x-hidden': page !== 'details',
            })} page={page}
                                setPage={(page) => setPage(page as 'details' | 'waypoints' | 'children')}>
                <DialogHeader>
                    <DialogTitle>{header}</DialogTitle>
                </DialogHeader>
                <DialogPage page={'details'} height={'fit-content'}>
                    <div className={classNames("max-h-[80vh] overflow-y-auto pr-4", {
                        'hidden': page !== 'details'
                    })}>
                        {form}
                    </div>
                </DialogPage>
                {activity.type === ActivityType.PATH && <DialogPage page={'waypoints'} height={'95vh'} className={'pl-8'}>
                    <PathConfiguration activity={activity} setActivity={setActivity} page={page}/>
                </DialogPage>}
                {activity.type === ActivityType.WAYPOINT && <DialogPage page={'children'} height={'95vh'} className={'pl-8'}>
                    <OneOffWaypointConfiguration activity={activity} setActivity={setActivity} page={page}/>
                </DialogPage>}
                <PagedDialogFooter>
                    <Button variant="outline" onClick={() => _setOpen(false)}>Cancel</Button>
                    {page !== 'details' && <Button onClick={() => {
                        setPage('details')
                    }}>Back</Button>}
                    {isLastPage && <Button disabled={activity.type == null}
                                           onClick={handleSave}>{isNew ? (activity.type == null ? 'Please select an activity type' : 'Create') : 'Update'}</Button>}
                    {!isLastPage && <Button onClick={() => {
                        const validation = validate()
                        if (!validation[0]) {
                            toast.error('Please fix the errors in your input')
                            return
                        }
                        if (activity.type === ActivityType.PATH) {
                            setPage('waypoints')
                        } else if (activity.type === ActivityType.WAYPOINT) {
                            setPage('children')
                        }
                    }}>Next</Button>}
                    {(!isLastPage && !isNew) && <Button
                        onClick={handleSave}>Save</Button>}
                </PagedDialogFooter>
            </PagedDialogContent>
        </Dialog>
    )
}


// _id is a temporary field used to identify different things on the client only
type WaypointConfig = Omit<Waypoint, 'actualStart' | 'actualEnd' | 'summary' | 'guid' | 'timeline' | 'days' | 'users' | 'order'> & {
    guid?: string,
    _id: string,
    useSpecificDate: boolean,
    start?: Date,
    end?: Date,
    users: {
        guid: string,
        fullName: string,
        email: string,
    }[]
}

type ActivityStepConfig = {
    guid?: string,
    _id: string,
    title: string,
    type: ActivityStepType,
    assignedTo: {
        guid: string,
        fullName: string,
        email: string,
    }[]
}

type SubActivityConfig = Pick<SubActivity, 'description' | 'title' | 'status' | 'priority' | 'waypoint'> & {
    guid?: string,
    _id: string,
    start?: Date,
    end?: Date,
    steps: ActivityStepConfig[],
    type?: ActivityType,
    subType?: TaskScheduleType,
}

// & ({
//     useSpecificDate: false,
//     start?: number,
//     end?: number,
//     offsetType: DateOffsetType
// } | {
//     useSpecificDate: true,
//     start?: Date,
//     end?: Date,
//     offsetType?: never,
// })

function ActivitySummaryDetails({activity}: { activity: ClientActivity }) {
    return <div className="grid grid-cols-3 gap-4 border border-gray-200 dark:border-neutral-700 rounded-md p-4 text-lg">
        <div className="space-x-2">
            <span className="font-bold">Path Name:</span>
            <span className="text-muted-foreground">{activity.title}</span>
        </div>
        <div className="space-x-2">
            <span className="font-bold">With:</span>
            <span className="text-muted-foreground">{englishList(activity.contacts.map(contact => contact.fullName))}</span>
        </div>
        <div className="space-x-2">
            <span className="font-bold">Assigned to:</span>
            <span className="text-muted-foreground">{englishList(activity.users.map(user => user.fullName))}</span>
        </div>
        <div className="space-x-2">
            <span className="font-bold">Template:</span>
            <span className="text-muted-foreground">To be implemented</span>
        </div>
        <div className={'space-x-2 col-span-2'}>
            <span className="font-bold">Description:</span>
            <span className="text-muted-foreground">{activity.description}</span>
        </div>
        <div className="space-x-2">
            <span className="font-bold">Timeline:</span>
            <span className="text-muted-foreground">{activity.startDate?.toLocaleDateString()} - {activity.endDate?.toLocaleDateString()}</span>
        </div>
        <div className="space-x-2">
            <span className="font-bold">Priority:</span>
            <span className="text-muted-foreground">
                    <Badge className={PriorityColors[activity.priority]}>
                        {ActivityPriorityNameMapping[activity.priority]}
                    </Badge>
                </span>
        </div>
    </div>
}

function OneOffWaypointConfiguration({activity, setActivity, page}: {
    activity: ClientActivity,
    setActivity: Dispatch<SetStateAction<ClientActivity>>,
    page: 'details' | 'waypoints' | 'children'
}) {
    const {clearValidation} = useValidation()

    const addSubActivity = (act: SubActivityConfig) => {
        setActivity(prev => ({
            ...prev,
            childActivities: [...prev.childActivities, act]
        }))
    }

    const updateSubActivity = (idx: number, subActivity: SubActivityConfig) => {
        setActivity(prev => ({
            ...prev,
            childActivities: prev.childActivities.map((act, i) => {
                if (i === idx) {
                    return subActivity
                }
                return act
            })
        }))
    }

    const deleteSubActivity = (idx: number) => {
        const act = activity.childActivities[idx]
        if (act) {
            clearValidation(act._id)
        }
        setActivity(prev => {
            const newActivities = [...prev.childActivities]
            newActivities.splice(idx, 1)
            return {
                ...prev,
                childActivities: newActivities
            }
        })
    }

    return <div>
        <ActivitySummaryDetails activity={activity}/>

        <div className={'flex justify-end mt-4'}>
            <Button
                variant={'linkHover2'} className={'force-border'}
                onClick={() => {
                    addSubActivity({
                        _id: generateClientId(),
                        title: '',
                        status: ActivityStatus.NOT_STARTED,
                        priority: ActivityPriority.MEDIUM,
                        steps: [],
                        description: '',
                    })
                }}>
                <Plus className="mr-2 h-4 w-4"/>
                Add Activity
            </Button>
        </div>

        {(activity.childActivities.length > 0 && page === 'children') && <div className={'mt-4 xl:grid xl:grid-cols-2 xl:gap-4 4xl:grid-cols-3'}>
            {activity.childActivities.map((act, idx) => (
                    <ActivityConfigurationTile
                        key={act._id}
                        activity={act}
                        updateActivity={(activity) => updateSubActivity(idx, activity)}
                        deleteActivity={() => deleteSubActivity(idx)}
                        idx={idx}
                    />
                )
            )}
        </div>}
    </div>
}

function PathConfiguration({activity, setActivity, page}: {
    activity: ClientActivity,
    setActivity: Dispatch<SetStateAction<ClientActivity>>,
    page: 'details' | 'waypoints' | 'children'
}) {
    const [selectedWaypoint, setSelectedWaypoint] = useState<string | null>(null)

    const {clearValidation} = useValidation()

    const handleWaypointClick = (waypoint: WaypointConfig) => {
        if (selectedWaypoint === waypoint._id) {
            setSelectedWaypoint(null)
            return
        }
        setSelectedWaypoint(waypoint._id)
    }

    const updateWaypoint = (id: string, waypoint: WaypointConfig) => {
        setActivity(prev => {
            const newWaypoints = [...prev.waypoints]
            const idx = newWaypoints.findIndex(w => w._id === id)
            newWaypoints[idx] = waypoint
            return {
                ...prev,
                waypoints: newWaypoints
            }
        })
    }

    const activityMap: Record<string, SubActivityConfig[]> = {}

    for (const act of activity.childActivities) {
        if (act.waypoint == null) continue;
        if (activityMap[act.waypoint] == null) {
            activityMap[act.waypoint] = []
        }
        activityMap[act.waypoint].push(act)
    }

    const waypointMap: Record<string, { waypoint: WaypointConfig, order: number }> = {}

    activity.waypoints.forEach((waypoint, idx) => {
        waypointMap[waypoint._id] = {waypoint, order: idx}
    })

    return <div>
        {/* Details on configuration thus far*/}
        <ActivitySummaryDetails activity={activity}/>

        {<div className={`flex items-center space-x-2 relative mt-2 ${page === 'waypoints' ? 'w-[85vw]' : ''}`}>
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className={'p-2 absolute right-4'}
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                const newWaypoint: WaypointConfig = {
                                    title: '',
                                    _id: generateClientId(),
                                    useSpecificDate: false,
                                    status: ActivityStatus.NOT_STARTED,
                                    users: []
                                }

                                setActivity(prev => ({
                                    ...prev,
                                    waypoints: [...prev.waypoints, newWaypoint]
                                }))
                            }}
                        >
                            <Plus className="h-4 w-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Add new waypoint</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <div className="p-4 mt-2 overflow-hidden" style={{
                width: 'calc(100% - 4rem)'
            }}>
                {activity.waypoints.length > 0 && <div style={{
                    maxWidth: 'calc(100% - 4rem)',
                }} className={'divide-gray-300 rounded-md border border-gray-300'}>
                    <div aria-label="Waypoints" className={'overflow-x-auto'}>
                        <div role="list"
                             className="flex">
                            {activity.waypoints.map((waypoint, idx) => (
                                <WaypointConfigurationTile
                                    idx={idx}
                                    key={waypoint._id}
                                    waypoint={waypoint}
                                    handleWaypointClick={handleWaypointClick}
                                    nextWaypointActive={idx < activity.waypoints.length - 1 && selectedWaypoint === activity.waypoints[idx + 1]._id}
                                    active={selectedWaypoint === waypoint._id}
                                    length={activity.waypoints.length}
                                    // lastWaypoint={activity.waypoints[idx - 1]}
                                />
                            ))}
                        </div>
                    </div>
                </div>}
            </div>
        </div>}

        {selectedWaypoint && (<WaypointConfigurationForm
            idx={waypointMap[selectedWaypoint].order}
            addSubActivity={(act) => setActivity(prev => ({
                    ...prev,
                    childActivities: [...prev.childActivities, act]
                }
            ))}
            waypoint={waypointMap[selectedWaypoint].waypoint}
            updateSubActivity={(id, subActivity) => setActivity(prev => ({
                ...prev,
                childActivities: prev.childActivities.map((act) => {
                    if (act._id === id) {
                        return subActivity
                    }
                    return act
                })
            }))}
            updateWaypoint={(waypoint) => updateWaypoint(selectedWaypoint, waypoint)}
            activities={activityMap[selectedWaypoint] ?? []}
            deleteWaypoint={() => {
                clearValidation(selectedWaypoint)
                setSelectedWaypoint(null)
                setActivity(prev => {
                    const idx = prev.waypoints.findIndex(w => w._id === selectedWaypoint)
                    const newWaypoints = [...prev.waypoints]
                    newWaypoints.splice(idx, 1)
                    const newActivities = [...prev.childActivities].filter(act => act.waypoint !== selectedWaypoint)

                    return {
                        ...prev,
                        waypoints: newWaypoints,
                        childActivities: newActivities
                    }
                })
            }}
            deleteSubActivity={(id) => {
                const act = activity.childActivities.find(act => act._id === id)
                if (act) {
                    clearValidation(act._id)
                }
                setActivity(prev => {
                    const newActivities = [...prev.childActivities].filter(act => act._id !== id)
                    return {
                        ...prev,
                        childActivities: newActivities
                    }
                })
            }}
            hidden={page !== 'waypoints'}
        />)}
    </div>
}

function WaypointConfigurationForm({waypoint, updateWaypoint, activities, addSubActivity, updateSubActivity, deleteWaypoint, idx, deleteSubActivity, hidden}: {
    waypoint: WaypointConfig,
    hidden: boolean,
    addSubActivity: (activity: SubActivityConfig) => void,
    updateSubActivity: (id: string, subActivity: SubActivityConfig) => void,
    updateWaypoint: (waypoint: WaypointConfig) => void,
    activities: SubActivityConfig[],
    deleteWaypoint: () => void,
    deleteSubActivity: (id: string) => void,
    idx: number
}) {
    const {resetValidation} = useValidation()

    return <div className={hidden ? 'hidden' : ''}>
        <div className={'gap-4 grid grid-cols-2'}>
            <FormField grid={false} label={'Title'} htmlFor={'title'} required={true}>
                <Input
                    id={`title-${waypoint._id}`}
                    name="title"
                    value={waypoint.title}
                    onChange={(e) => {
                        updateWaypoint({...waypoint, title: e.target.value})
                        resetValidation(`title-${waypoint._id}`)
                    }}
                />
            </FormField>
            <FormField grid={false} label={'Description'} htmlFor={`description-${waypoint._id}`}>
                <Input
                    id={`description-${waypoint._id}`}
                    name="description"
                    value={waypoint.description ?? ''}
                    onChange={(e) => updateWaypoint({...waypoint, description: e.target.value})}
                    className="col-span-3"
                />
            </FormField>
            <FormField grid={false} label={'Status'} htmlFor={`status-${waypoint._id}`} required={true}>
                <Select
                    value={waypoint.status ?? ''}
                    onValueChange={(value) => {
                        updateWaypoint({...waypoint, status: value as ActivityStatus})
                        resetValidation(`status-${waypoint._id}`)
                    }}
                >
                    <SelectTrigger id={`status-${waypoint._id}`}>
                        <SelectValue placeholder="Status"/>
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(ActivityStatusNameMapping).map((status) => (
                            <SelectItem key={status}
                                        value={status}>{ActivityStatusNameMapping[status as ActivityStatus]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>
            <FormField grid={false} label={'Assigned to'} htmlFor={`assignedTo-${waypoint._id}`} required={true}>
                <UserPicker
                    id={`assignedTo-${waypoint._id}`}
                    multi={true}
                    dialog
                    value={waypoint.users}
                    onValueChange={(users) => {
                        updateWaypoint({...waypoint, users})
                        resetValidation(`assignedTo-${waypoint._id}`)
                    }}
                />
            </FormField>
            <FormField grid={false} label={'Start Date'} htmlFor={`startDate-${waypoint._id}`} required={true}>
                {idx === 0 ? (<Input
                    id={`startDate-${waypoint._id}`}
                    value={'Immediately after flow start'}
                    readOnly
                />) : (<>
                    <DatePicker
                        id={`startDate-${waypoint._id}`}
                        date={waypoint.start}
                        setDate={(date) => {
                            updateWaypoint({...waypoint, start: date})
                            resetValidation(`endDate-${waypoint._id}`)
                        }}
                    />
                </>)}
            </FormField>
            <FormField grid={false} label={'Due Date'} htmlFor={`endDate-${waypoint._id}`} required={true}>
                <DatePicker
                    id={`endDate-${waypoint._id}`}
                    date={waypoint.end}
                    setDate={(date) => {
                        updateWaypoint({...waypoint, end: date})
                        resetValidation(`endDate-${waypoint._id}`)
                    }}
                />
            </FormField>
            <Button variant="outline" onClick={deleteWaypoint} className={'border-destructive text-destructive'}>
                <Trash2 className="h-4 w-4 mr-2"/> Remove
            </Button>
        </div>

        <div className={'flex justify-end mt-4'}>
            <Button
                variant={'linkHover2'} className={'force-border'}
                onClick={() => {
                    addSubActivity({
                        waypoint: waypoint._id,
                        _id: generateClientId(),
                        title: '',
                        status: ActivityStatus.NOT_STARTED,
                        priority: ActivityPriority.MEDIUM,
                        steps: [],
                        description: '',
                    })
                }}>
                <Plus className="mr-2 h-4 w-4"/>
                Add Activity
            </Button>
        </div>

        {activities.length > 0 && <div className={'mt-4 xl:grid xl:grid-cols-2 xl:gap-4 4xl:grid-cols-3'}>
            {activities.map((act, idx) => (
                    <ActivityConfigurationTile
                        key={act._id}
                        activity={act}
                        updateActivity={(activity) => updateSubActivity(act._id, activity)}
                        deleteActivity={() => deleteSubActivity(act._id)}
                        idx={idx}
                        waypoint={waypoint}
                    />
                )
            )}
        </div>}
    </div>
}

function DurationSelector({type, setDuration, selectedDuration, currentEventType}: {
    type: ActivityType,
    setDuration: (duration: number) => void,
    selectedDuration: number | null,
    currentEventType: typeof eventTypes[number] | null,
}) {
    type Duration = {
        duration: number,
        label: string
    }
    let durations: Duration[]
    if (type === ActivityType.SCHEDULED) {
        durations = [
            {duration: 15, label: "15 min"},
            {duration: 30, label: "30 min"},
            {duration: 60, label: "1 hour"}
        ]
    } else {
        durations = [
            {duration: 0, label: 'Today'},
            {duration: 1, label: 'Tomorrow'},
            {duration: 7, label: 'In a week'},
        ]
    }

    return <div className="flex gap-2">
        {durations.map((duration) => (
            <motion.div
                key={duration.duration}
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
            >
                <Badge
                    variant={selectedDuration === duration.duration ? "default" : "outline"}
                    className={`cursor-pointer hover:bg-primary hover:text-primary-foreground ${
                        selectedDuration === duration.duration ? (currentEventType?.color ?? ActivityBaseTypeIcons[type]?.color) : ''
                    }`}
                    onClick={() => setDuration(duration.duration)}
                >
                    {duration.label}
                </Badge>
            </motion.div>
        ))}
    </div>
}

function ActivityConfigurationTile({activity, updateActivity, deleteActivity, idx, waypoint}: {
    activity: SubActivityConfig,
    updateActivity: (activity: SubActivityConfig) => void,
    deleteActivity: () => void,
    idx: number,
    waypoint?: WaypointConfig,
}) {
    const [eventType, setEventType] = useState<TaskParents | null>(null)
    const [eventSubtype, setEventSubtype] = useState<TaskScheduleType | null>(null)
    const [currentEventType, setCurrentEventType] = useState<typeof eventTypes[number] | null>(null)
    const [selectedDuration, setSelectedDuration] = useState<number | null>(null)

    const [specialAssignment, setSpecialAssignment] = useState<Record<string, boolean>>({})

    const {resetValidation} = useValidation()

    useEffect(() => {
        if (waypoint == null) return
        let finalStatus = waypoint.status
        if (waypoint.status === ActivityStatus.NOT_STARTED && activity.type === ActivityType.SCHEDULED) {
            finalStatus = ActivityStatus.SCHEDULED
        }
        updateActivity({...activity, status: finalStatus})
    }, [waypoint?.status])

    useEffect(() => {
        if (activity.type === ActivityType.SCHEDULED) {
            setSelectedDuration(null)
            let endDate = undefined as Date | undefined
            if (activity.start != null) {
                endDate = new Date(activity.start);
                endDate.setHours(endDate.getHours() + 1);
            }
            if (activity.status === ActivityStatus.NOT_STARTED) {
                updateActivity({
                    ...activity,
                    status: ActivityStatus.SCHEDULED,
                    end: endDate,
                })
            }
        } else if (activity.type === ActivityType.TASK) {
            setSelectedDuration(null)
            if (activity.status === ActivityStatus.SCHEDULED) {
                updateActivity({
                    ...activity,
                    status: ActivityStatus.NOT_STARTED
                })
            }
        }
    }, [activity.type])

    useEffect(() => {
        // Set event type & subtype based on activity subtype
        if (activity.type === ActivityType.SCHEDULED || activity.type === ActivityType.TASK) {
            const reverseEventType = TaskScheduleSubtypeToParent[activity.subType!]
            if (reverseEventType) {
                setEventType(reverseEventType)
                setEventSubtype(activity.subType!)
                setCurrentEventType(eventTypes.find(type => type.id === reverseEventType)!)
            }
        }
    }, [])

    useEffect(() => {
        if (eventType && eventSubtype) {
            updateActivity({...activity, subType: eventSubtype})
        } else if (eventType) {
            updateActivity({...activity, subType: eventType as TaskScheduleType})
        } else {
            updateActivity({...activity, subType: undefined})
        }
    }, [eventType, eventSubtype])

    useEffect(() => {
        if (activity.start == null || activity.end != null) {
            return;
        }
        if (activity.type === ActivityType.SCHEDULED) {
            const end = new Date(activity.start);
            end.setMinutes(end.getMinutes() + selectedDuration!);
            updateActivity({...activity, end})
        } else {
            const end = new Date(activity.start);
            end.setDate(end.getDate() + selectedDuration!);
            updateActivity({...activity, end})
        }
    }, [activity.start])

    const handleDurationSelect = (duration: number) => {
        setSelectedDuration(duration)
        if (activity.start == null) return
        const end = new Date(activity.start!);
        if (activity.type === ActivityType.SCHEDULED) {
            end.setMinutes(end.getMinutes() + duration);
        } else {
            end.setDate(end.getDate() + duration);
        }
        updateActivity({...activity, end})
    }

    const {clearValidation} = useValidation()

    return <Card className={'space-y-4 mx-auto mb-4 w-[1fr]'}>
        <CardHeader>
            <h3 className={'text-lg font-semibold'}>Activity #{idx + 1}</h3>
        </CardHeader>
        <CardContent>
            <div className={'flex flex-col space-y-4'}>
                <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.keys(ActivityTypeNameMapping).map((key) => {
                            if (key === ActivityType.PATH || key === ActivityType.WAYPOINT) return null
                            const type = ActivityBaseTypeIcons[key as ActivityType]
                            return <motion.div
                                key={key}
                                whileHover={{scale: 1.05}}
                                whileTap={{scale: 0.95}}
                                className="flex-1"
                            >
                                <Button
                                    type="button"
                                    variant={activity.type === key ? "default" : "outline"}
                                    className={`w-full ${activity.type === key ? type.color : ''}`}
                                    onClick={() => {
                                        updateActivity({
                                            ...activity,
                                            type: key as ActivityType
                                        })
                                        if (eventType === TaskScheduleType.HOLD) {
                                            setEventType(null)
                                            setEventSubtype(null)
                                            setCurrentEventType(null)
                                        }
                                    }}
                                >
                                    <type.icon className="mr-2 h-4 w-4"/>
                                    {ActivityTypeNameMapping[key as ActivityType]}
                                </Button>
                            </motion.div>
                        })}
                    </div>
                </div>

                <div className="space-x-2">
                    <Label>Event Type</Label>
                    <div className="flex space-x-2 flex-wrap">
                        {eventTypes.map((type) => {
                            if (type.id === TaskScheduleType.HOLD) {
                                if (activity.type !== ActivityType.SCHEDULED) return null
                                else {

                                }
                            }

                            return (
                                <React.Fragment key={type.id}>
                                    <motion.div
                                        whileHover={{scale: 1.05}}
                                        whileTap={{scale: 0.95}}
                                        className="mb-2 w-min"
                                    >
                                        <Button
                                            type="button"
                                            variant={eventType === type.id ? "default" : "outline"}
                                            className={`w-full ${eventType === type.id ? type.color : ''}`}
                                            onClick={() => {
                                                setEventType(type.id as TaskParents)
                                                setCurrentEventType(type)
                                                setEventSubtype(null)
                                            }}
                                        >
                                            <type.icon className="mr-2 h-4 w-4"/>
                                            {type.name}
                                        </Button>
                                    </motion.div>
                                </React.Fragment>
                            )
                        })}
                    </div>
                </div>

                {currentEventType && (
                    <div className="space-x-2">
                        <Label>Event Subtype</Label>
                        <div className="flex flex-wrap gap-2">
                            {currentEventType.subtypes.map((subtype) => (
                                <motion.div
                                    key={subtype.id}
                                    whileHover={{scale: 1.05}}
                                    whileTap={{scale: 0.95}}
                                >
                                    <Badge
                                        variant={eventSubtype === subtype.id ? "default" : "outline"}
                                        className={`cursor-pointer hover:bg-primary hover:text-primary-foreground ${
                                            eventSubtype === subtype.id ? currentEventType.color : ''
                                        }`}
                                        onClick={() => setEventSubtype(subtype.id)}
                                    >
                                        {subtype.icon && React.createElement(subtype.icon, {className: "mr-1 h-3 w-3 inline"})}
                                        {subtype.label}
                                    </Badge>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className={'grid grid-cols-2 gap-4'}>
                <FormField grid={false} label={'Title'} htmlFor={`title-${activity.waypoint}-${activity._id}`} required={true}>
                    <Input
                        id={`title-${activity.waypoint}-${activity._id}`}
                        name="title"
                        value={activity.title}
                        onChange={(e) => updateActivity({...activity, title: e.target.value})}
                    />
                </FormField>
                <FormField grid={false} label={'Description'} htmlFor={'description'}>
                    <Input
                        id="description"
                        name="description"
                        value={activity.description ?? ''}
                        onChange={(e) => updateActivity({...activity, description: e.target.value})}
                    />
                </FormField>
                {activity.type === ActivityType.SCHEDULED ? <>
                    <FormField grid={false} label={'Date'} htmlFor={`startDate-${activity.waypoint}-${activity._id}`} required={true}>
                        <DatePicker
                            id={`startDate-${activity.waypoint}-${activity._id}`}
                            date={activity.start}
                            setDate={(date) => updateActivity({...activity, start: date})}
                        />
                    </FormField>
                    <FormField className={'w-min'} grid={false} label={'Start Time'} htmlFor={`startTime-${activity.waypoint}-${activity._id}`} required>
                        <TimePicker granularity={'minute'} date={activity.start ?? null}
                                    onChange={(date) => {
                                        updateActivity({...activity, start: date})
                                        resetValidation(`startDate-${activity.waypoint}-${activity._id}`)
                                    }} hourCycle={12} id={`startTime-${activity.waypoint}-${activity._id}`}/>
                    </FormField>
                    <FormField className={'w-min'} grid={false} label={'End Time'} htmlFor={`endTime-${activity.waypoint}-${activity._id}`} required>
                        <TimePicker granularity={'minute'} date={activity.end ?? null} onChange={(date) => {
                            updateActivity({...activity, end: date})
                            resetValidation(`startDate-${activity.waypoint}-${activity._id}`)
                            setSelectedDuration(null)
                        }} hourCycle={12} id={`endTime-${activity.waypoint}-${activity._id}`}/>
                    </FormField>
                    <div/>
                </> : <>
                    <FormField grid={false} label={'Start Date'} htmlFor={`startDate-${activity.waypoint}-${activity._id}`} required={true}>
                        <DatePicker
                            id={`startDate-${activity.waypoint}-${activity._id}`}
                            date={activity.start}
                            setDate={(date) => updateActivity({...activity, start: date})}
                        />
                    </FormField>
                    <FormField grid={false} label={'Due Date'} htmlFor={`endTime-${activity.waypoint}-${activity._id}`} required={true}>
                        <DatePicker
                            id={`endTime-${activity.waypoint}-${activity._id}`}
                            date={activity.end}
                            setDate={(date) => {
                                updateActivity({...activity, end: date})
                            }}
                        />
                    </FormField>
                </>}

                <DurationSelector type={activity.type!} setDuration={handleDurationSelect} selectedDuration={selectedDuration}
                                  currentEventType={currentEventType}/>

                <div className={'col-span-2'}>
                    <div className={'mb-4'}>
                        <h3 className={'text-lg font-semibold mb-2'}>Steps</h3>
                        <Button variant='ghost' size='icon' onClick={() => updateActivity({
                            ...activity,
                            steps: [...activity.steps, {
                                title: '',
                                _id: generateClientId(),
                                type: ActivityStepType.CHECK,
                                assignedTo: []
                            }]
                        })}>
                            <Plus className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>

                <div className={'col-span-2 space-y-4'}>
                    {activity.steps.map((step, idx) => (
                        <div key={step._id} className={'flex flex-col space-y-2'}>
                            <div className={'flex items-end space-x-2 w-full'}>
                                <FormField className={'w-full'} grid={false} label={'Title'}
                                           htmlFor={`steptitle-${activity.waypoint}-${activity._id}-${step._id}`}
                                           required={true}>
                                    <Input
                                        id={`steptitle-${activity.waypoint}-${activity._id}-${step._id}`}
                                        name="title"
                                        value={step.title}
                                        onChange={(e) => {
                                            const prevSteps = [...activity.steps];
                                            prevSteps[idx] = {
                                                ...step,
                                                title: e.target.value
                                            };
                                            updateActivity({
                                                ...activity,
                                                steps: prevSteps
                                            })
                                        }}
                                    />
                                </FormField>
                                <FormField className={'w-full'} grid={false} label={'Type'}
                                           htmlFor={`steptype-${activity.waypoint}-${activity._id}-${step._id}`}
                                           required={true}>
                                    <Select
                                        value={step.type}
                                        onValueChange={(value) => {
                                            const prevSteps = [...activity.steps];
                                            prevSteps[idx] = {
                                                ...step,
                                                type: value as ActivityStepType
                                            };
                                            updateActivity({
                                                ...activity,
                                                steps: prevSteps
                                            })
                                        }}
                                    >
                                        <SelectTrigger id={`steptype-${activity.waypoint}-${activity._id}-${step._id}`}>
                                            <SelectValue placeholder="Type"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(ActivityStepTypeNameMapping).map((type) => (
                                                <SelectItem key={type}
                                                            value={type}>{ActivityStepTypeNameMapping[type as ActivityStepType]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <Button variant="ghost" className={'text-destructive p-3'} size="icon" onClick={() => {
                                    clearValidation(step._id)
                                    updateActivity({
                                        ...activity,
                                        steps: activity.steps.filter((_step) => _step._id !== step._id)
                                    })
                                }}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Checkbox
                                                className={'m-3'}
                                                id={`specialAssignment-${step._id}`} checked={specialAssignment[step._id]} onCheckedChange={(checked) => {
                                                setSpecialAssignment(prev => ({...prev, [step._id]: checked === true}))
                                            }}/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Assign this step to user(s) explicitly</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {(specialAssignment[step._id] || step.assignedTo.length > 0) &&
                                <FormField grid={false} label={'Assigned to'} htmlFor={`assignedTo-${step._id}`} className={'col-span-3'}>
                                    <UserPicker
                                        id={`assignedTo-${activity.waypoint}-${activity._id}-${step._id}`}
                                        multi={true}
                                        dialog
                                        value={step.assignedTo}
                                        onValueChange={(value) => updateActivity({
                                            ...activity,
                                            steps: activity.steps.map(_step => {
                                                if (step._id === _step._id) {
                                                    return {..._step, assignedTo: value}
                                                }
                                                return _step
                                            })
                                        })}
                                    />
                                </FormField>}
                        </div>
                    ))}
                </div>

                <Button variant="outline" className={'col-span-2 border-destructive text-destructive'} onClick={() => deleteActivity()}>
                    <Trash2 className="h-4 w-4 mr-2"/> Delete
                </Button>
            </div>
        </CardContent>
    </Card>
}

function WaypointConfigurationTile({waypoint, handleWaypointClick, nextWaypointActive, active, length, idx}: {
    waypoint: WaypointConfig,
    handleWaypointClick: (waypoint: WaypointConfig) => void,
    nextWaypointActive: boolean,
    active: boolean,
    idx: number,
    length: number,
    // lastWaypoint?: WaypointConfig
}) {
    // function formatRelativeDate(date: number, prefix?: string, suffix?: string) {
    //     if (date === 0) {
    //         return 'immediately'
    //     }
    //     return `${prefix ? prefix : ''} ${date} ${date === 1 ? 'day' : 'days'} ${suffix ? suffix : ''}`.trim()
    // }

    let timeline: string = ''

    if (idx === 0) {
        if (waypoint.end == null) {
            timeline = 'Starts immediately. No due date set.'
        } else {
            timeline = `Starts immediately. Due ${format(waypoint.end, 'PP')}.`
        }
    } else if (waypoint.start == null || waypoint.end == null) {
        if (waypoint.start == null && waypoint.end == null) {
            timeline = 'No start/end set up'
        } else if (waypoint.start == null) {
            timeline = 'No start specified'
        } else if (waypoint.end == null) {
            timeline = 'No end specified'
        }
    } else {
        timeline = `Starts ${format(waypoint.start, 'PP')}. Due ${format(waypoint.end, 'PP')}.`
    }

    // else if (waypoint.useSpecificDate) {
    //     timeline = `${format(waypoint.start, 'PPpp')} - ${format(waypoint.end, 'pp')}`
    // } else if (waypoint.offsetType === DateOffsetType.PATH_START) {
    //     if (waypoint.start === 0) {
    //         timeline = `Starts immediately`
    //     } else timeline = `Starts ${formatRelativeDate(waypoint.start, undefined, 'after flow start')}. (Due ${formatRelativeDate(waypoint.end - waypoint.start, 'in')})`
    // } else if (waypoint.offsetType === DateOffsetType.WAYPOINT) {
    //     if (lastWaypoint == null) {
    //         timeline = `Somehow this waypoint doesn't have a previous waypoint but it should.`
    //     } else timeline = `Starts after ${lastWaypoint.title} is completed. (Due ${formatRelativeDate(waypoint.end - waypoint.start, 'in')})`
    // }

    return <div key={waypoint._id} className="relative md:flex md:flex-1 shrink-0">
        <button
            onClick={() => handleWaypointClick(waypoint)}
            className={`group flex w-full items-center ${
                active ? 'bg-blue-100 dark:bg-cyan-950' : ''
            }`}
        >
            <span className="flex flex-col items-start px-6 py-4 text-sm">
                <span className="flex items-center">
                    <span className={classNames('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', {
                        'border-2 border-primary': active,
                        'border-2 border-gray-300 group-hover:border-gray-400 dark:border-gray-700 dark:group-hover:border-gray-600': !active,
                    })}>
                            <span
                                className={active ? 'text-primary' : 'text-gray-500 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'}>
                              {idx + 1}
                            </span>
                      </span>
                      <span className={`ml-4 font-medium ${
                          active ? 'text-primary' : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100'
                      }`}>
                        {isEmptyString(waypoint.title) ? 'New Waypoint' : waypoint.title}
                      </span>
                </span>
                <span className="ml-12 flex gap-1 my-1">
                    <Badge variant="outline" className="text-xs py-1 px-2 border-gray-600">
                        {timeline}
                    </Badge>
                </span>
                <span className="ml-12 flex gap-1 mt-1">
                    <ActivityStatusBadge status={waypoint.status}/>
                    {waypoint.users.length > 0 && <Badge variant="outline" className="text-xs py-0 px-1">
                        <User className="mr-1 h-3 w-3"/>
                        {englishList(waypoint.users.map(name => {
                            return name.fullName.split(' ')[0]
                        }))}
                    </Badge>}
                </span>
            </span>
        </button>

        {idx !== length - 1 ? (
            <>
                {/* Arrow separator for lg screens and up */}
                <div className="absolute right-0 top-0 hidden h-full w-5 md:block" aria-hidden="true">
                    <svg
                        className="h-full w-full text-gray-300"
                        viewBox="0 0 22 80"
                        fill="none"
                        stroke={'none'}
                        preserveAspectRatio="none"
                    >
                        {/* "Right" side of svg, fills only when the next waypoint is active. Otherwise it's backgorund color */}
                        <path
                            d="M21 -2 L20 80 L0 80 L20 40 L0 -2 L20 -2"
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={4}
                            // stroke={'white'}
                            className={nextWaypointActive ? 'fill-blue-100 dark:fill-cyan-950 stroke-blue-100 dark:stroke-cyan-950' : 'fill-white dark:fill-background stroke-white dark:stroke-background'}
                        />
                        <path
                            d="M0 -2L20 40L0 82"
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                            stroke="currentcolor"
                        />
                    </svg>
                </div>
            </>
        ) : null}
    </div>
}

export function ActivityTimelineFeed({activityId, newItems, initialItems, waypoint, heightClass, type = 'timeline'}: {
    activityId: string,
    newItems: FeedItem[],
    initialItems: FeedItem[],
    waypoint?: boolean,
    heightClass?: string,
    type?: 'timeline' | 'form'
}) {
    const COUNT = 5;

    const _items = [...newItems, ...initialItems];

    return (
        <div className="space-y-4">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    <InfiniteList<FeedItem>
                        dataBefore={_items}
                        listKey={`feed-${type}-${activityId}`}
                        load={async offset => {
                            const result = handleServerAction(await getActivityTimeline(activityId, offset + _items.length, COUNT, waypoint));
                            if (!result.success || result.result == null) {
                                throw new Error(`Error loading notes: ${result.message}`);
                            }
                            return result.result!;
                        }}
                        render={(item, idx, count) => {
                            return <li key={item.guid}>
                                <FeedItem feedItem={item} idx={idx} length={count}
                                          includeActivityDetails={false} includeOpportunityDetails={true}/>
                            </li>
                        }}
                        noData={() => {
                            return <></>
                        }}
                        className={heightClass ?? 'h-[400px]'}
                        viewportClassName={'p-4'}
                        filterItems={(items) => {
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