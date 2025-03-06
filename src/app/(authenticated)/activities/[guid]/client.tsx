"use client"

import React, {useEffect, useState} from 'react'
import {differenceInDays, differenceInHours, differenceInMinutes, format} from 'date-fns'
import {Badge} from "~/components/ui/badge"
import {Button, TooltipButton} from "~/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card"
import {Checkbox} from "~/components/ui/checkbox"
import {Input} from "~/components/ui/input"
import {Label} from "~/components/ui/label"
import {ScrollArea} from "~/components/ui/scroll-area"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Separator} from "~/components/ui/separator"
import {Textarea} from "~/components/ui/textarea"
import {
    ArrowLeft,
    BotIcon,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Edit,
    Link,
    Map,
    Paperclip,
    Pencil,
    Phone,
    Plus,
    Send,
    User,
    UserPlus,
    Workflow
} from 'lucide-react'
import {
    ActivityPriority,
    ActivityPriorityNameMapping,
    ActivityStatus,
    ActivityStatusNameMapping,
    ActivityStepType,
    ActivityType,
    ActivityTypeNameMapping,
    ContactType,
    DateOffsetType,
    TaskScheduleType,
    TaskScheduleTypeNameMapping
} from "~/common/enum/enumerations";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {ActivityStatusBadge} from '../client'
import {englishList} from "~/util/strings";
import {ActivityTypeIcon} from "~/components/data/models/ActivityTypeIcon";
import ActivityDialog, {ActivityTimelineFeed} from "~/app/(authenticated)/activities/ActivityForm";
import classNames from "classnames";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '~/components/ui/tooltip'
import {useRouter} from "next/navigation";
import {Tabs, TabsContent, TabsList, TabsTrigger} from '~/components/ui/tabs'
import {EnglishList} from '~/components/util/EnglishList'
import {useConfirmation} from "~/hooks/use-confirmation";
import {toggleStep} from "~/app/(authenticated)/activities/[guid]/Action";
import {handleServerAction} from "~/util/api/client/APIClient";
import NextLink from "next/link";
import {ValidationProvider} from "~/components/data/ValidationProvider";
import {useQueryClient} from "@tanstack/react-query";
import {ContactHoverCard} from "~/common/components/hover-cards/ContactHoverCard";

// const nowOffset = (offset: number, hours = 0, minutes = 0, seconds = 0) => {
//     'use no memo';
//     const date = new Date(new Date().getTime() + offset * 60 * 60 * 24 * 1000)
//     date.setHours(hours, minutes, seconds)
//     return date
// }

export declare type Activity = {
    guid: string,
    title: string,
    type: ActivityType,
    subType: TaskScheduleType | null,
    description: string | null,
    priority: ActivityPriority,
    status: ActivityStatus,
    opportunity?: {
        guid: string,
        value: number,
    },
    contacts: {
        guid: string,
        fullName: string,
        primaryEmail: string | null,
        primaryPhone: string | null,
        primaryAddress: string | null,
        type: ContactType,
    }[],
    users: string[],
    assignedBy: string,
    waypoints: Array<Waypoint>,
    timeline: Array<FeedItem>,
    activities: Array<SubActivity>,
    steps?: Array<Step>,
    dateRelativeTo?: string, // Activity guid
    completedAt?: Date | null,
    parentActivity?: {
        guid: string,
        title: string,
    }
} & ({
    startDate: number,
    endDate: number,
    offsetType: DateOffsetType,
} | {
    startDate: Date,
    endDate: Date,
    offsetType?: never,
})

export declare type Waypoint = {
    guid: string,
    title: string,
    status: ActivityStatus,
    actualStart?: Date, // Actual date when the waypoint was started
    days: number, // Target number of days for the waypoint to be completed
    actualEnd?: Date, // Actual date when the waypoint was completed
    users: string[],
    description?: string,
    summary?: string,
    order: number,
    timeline: FeedItem[],
}

export declare type SubActivity = Omit<Activity, 'activities' | 'waypoints' | 'assignedBy' | 'contacts' | 'opportunity' | 'parentActivity'> & {
    waypoint?: string
}

type Step = {
    guid: string,
    type: ActivityStepType,
    title: string,
    completed: boolean,
    assignedTo: string[]
}

export function ClientActivityDetails({activity: initialActivity, goBack}: { activity: Activity, goBack: boolean }) {
    const [activity, setActivity] = useState(initialActivity)
    const [selectedActivity, setSelectedActivity] = useState<SubActivity | null>(null)
    const [newComment, setNewComment] = useState('')
    const [activityNotes, setActivityNotes] = useState('')
    const [selectedWaypoint, setSelectedWaypoint] = useState<string | null>(null)

    const {confirm, confirmation} = useConfirmation()

    useEffect(() => {
        setActivity(initialActivity)
    }, [initialActivity])

    const handleWaypointClick = (waypoint: Waypoint) => {
        setSelectedActivity(null)
        if (selectedWaypoint === waypoint.guid) {
            setSelectedWaypoint(null)
            return
        }
        setSelectedWaypoint(waypoint.guid)
    }

    const handleToggleStep = async (step: Step, completed: boolean) => {
        const val = {...activity}
        const result = handleServerAction(await toggleStep(activity.guid, step.guid, completed));
        if (!result.success) {
            throw new Error(`Error ${!completed ? 'un' : ''}completing step: ${result.message}`);
        }
        if (result.result!.completed) {
            val.status = ActivityStatus.COMPLETED;
        } else if (val.status === ActivityStatus.COMPLETED) {
            val.status = ActivityStatus.IN_PROGRESS;
        }
        val.steps = val.steps?.map(step => step.guid === step.guid ? {...step, completed} : step);
        setActivity(val);
    }

    const waypointActivityMap: Record<string, SubActivity[]> = {}
    const waypoints: Record<string, Waypoint> = {}
    const activities: Record<string, SubActivity> = {}

    for (const waypoint of activity.waypoints) {
        waypoints[waypoint.guid] = waypoint
        waypointActivityMap[waypoint.guid] = []
    }

    for (const _activity of activity.activities) {
        if (_activity.waypoint == null) continue;
        activities[_activity.guid] = _activity
        if (_activity.waypoint in waypointActivityMap) {
            waypointActivityMap[_activity.waypoint].push(_activity)
        } else {
            waypointActivityMap[_activity.waypoint] = [_activity]
        }
    }

    const handleStatusChange = (newStatus: ActivityStatus) => {
        if (newStatus === ActivityStatus.COMPLETED) {
            confirm('Are you sure you want to complete this activity?', async () => {
                setActivity(prevAct => ({...prevAct, status: newStatus}))
            }, undefined, 'Yes', 'No')
        } else if (newStatus === ActivityStatus.CANCELLED) {
            confirm('Are you sure you want to cancel this activity?', async () => {
                setActivity(prevAct => ({...prevAct, status: newStatus}))
            }, undefined, 'Yes', 'No')
        } else setActivity(prevAct => ({...prevAct, status: newStatus}))
    }

    const handleTitleChange = (newTitle: string) => {
        setActivity(prevAct => ({...prevAct, title: newTitle}))
    }

    const handleAddComment = () => {
        if (newComment.trim()) {
            alert('Pretend I added a comment')
        }
    }

    const getUrgencyColor = () => {
        const daysLeft = differenceInDays(activity.endDate, new Date())
        if (daysLeft < 0) return 'bg-red-500'
        if (daysLeft < 3) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const setSubActivity = (subAct: SubActivity) => {
        setActivity(prev => ({
            ...prev,
            activities: prev.activities?.map(act => act.guid === subAct.guid ? subAct : act)
        }))
    }

    const router = useRouter()
    const queryClient = useQueryClient()

    return (
        <div className="flex flex-col bg-gray-100 dark:bg-neutral-900">
            {confirmation}
            {/* Activity Header */}
            <header className="bg-white dark:bg-neutral-800 shadow-md p-4">
                <div className="container mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" className="p-2" onClick={() => {
                                if (goBack) {
                                    router.back()
                                } else {
                                    router.push('/activities')
                                }
                            }}>
                                <ArrowLeft className="mr-2 h-4 w-4"/>
                                Back to Activity List
                            </Button>
                            <Input
                                value={activity.title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                className="text-2xl font-bold bg-transparent border-none focus:ring-0"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button variant="outline">
                                <UserPlus className="mr-2 h-4 w-4"/>
                                Reassign {ActivityTypeNameMapping[activity.type]}
                            </Button>
                            <ValidationProvider>
                                <ActivityDialog
                                    canChangeType={false}
                                    toLoad={activity.guid}
                                    onSuccess={async () => {
                                        await queryClient.invalidateQueries()
                                        router.refresh()
                                    }}
                                    trigger={
                                        <Button variant={'linkHover2'} className={'force-border border-gray-400'}>
                                            <Edit className="mr-2 h-4 w-4"/> Edit
                                        </Button>
                                    }/>
                            </ValidationProvider>
                            <NextLink href={`/activities/${activity.guid}/map`}>
                                <Button variant="outline">
                                    <Map className="mr-2 h-4 w-4"/>
                                    Open Path Map
                                </Button>
                            </NextLink>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-sm">
                            <Badge variant={'outline'} className={'border-gray-400'}>
                                {activity.assignedBy === '.pathfinder.' ? (
                                    <BotIcon className="mr-1 h-3 w-3"/>
                                ) : activity.assignedBy === '.blueprint.' ? (
                                    <Workflow className="mr-1 h-3 w-3"/>
                                ) : (
                                    <User className="mr-1 h-4 w-4"/>
                                )}
                                Assigned
                                by {activity.assignedBy === '.pathfinder.' ? 'Pathfinder' : activity.assignedBy === '.blueprint.' ? 'Blueprint Action' : activity.assignedBy}
                            </Badge>
                            <div
                                className={`flex items-center space-x-2 ${getUrgencyColor()} text-white px-3 py-1 rounded-full`}>
                                <Calendar className="h-4 w-4"/>
                                <span>{format(activity.endDate, 'MMM dd, yyyy')}</span>
                            </div>
                            <Select value={activity.status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(ActivityStatusNameMapping).map((status) => (
                                        <SelectItem key={status}
                                                    value={status}>{ActivityStatusNameMapping[status as ActivityStatus]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {activity.opportunity && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <a href={`/opportunities/${activity.opportunity.guid}`} className={'inline-flex hover:underline'}>
                                                    <Link className="mr-1 h-4 w-4"/>
                                                    ${activity.opportunity.value.toLocaleString()}
                                                </a>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Linked Opportunity</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </Badge>
                            )}
                            {activity.parentActivity && (
                                <Badge variant="outline" className="text-sky-600 border-sky-600">
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <a href={`/activities/${activity.parentActivity.guid}`} className={'inline-flex hover:underline'}>
                                                    <Link className="mr-1 h-4 w-4"/>
                                                    {activity.parentActivity.title}
                                                </a>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Parent Activity</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </Badge>
                            )}
                        </div>
                        <div className="text-sm flex items-center space-x-4">
                                <span>With{' '}
                                    <span className="font-semibold">
                                        <EnglishList strs={activity.contacts.map(contact => contact.fullName)} Component={({children, idx}) =>
                                            <ContactHoverCard
                                                guid={activity.contacts[idx].guid}
                                                name={children}
                                                type={activity.contacts[idx].type}
                                                email={activity.contacts[idx].primaryEmail}
                                                phone={activity.contacts[idx].primaryPhone}
                                                address={activity.contacts[idx].primaryAddress}
                                                showTypeIcon={true}
                                            />}
                                        />
                                    </span>
                                </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Waypoints */}
            {activity.waypoints.length > 0 && <div className="bg-white dark:bg-neutral-800 shadow-md p-4 mt-2">
                <div className="container mx-auto relative">
                    {/* <h3 className="text-sm font-semibold mb-4">Activity Timeline</h3> */}
                    <nav aria-label="Progress">
                        <ol role="list"
                            className="divide-y divide-gray-300 rounded-md border border-gray-300 md:flex md:divide-y-0">
                            {activity.waypoints.map((waypoint, idx) => (
                                <WaypointTile
                                    key={waypoint.title}
                                    waypoint={waypoint}
                                    handleWaypointClick={handleWaypointClick}
                                    nextWaypointActive={idx < activity.waypoints.length - 1 && selectedWaypoint === activity.waypoints[idx + 1].guid}
                                    active={selectedWaypoint === waypoint.guid}
                                    idx={idx}
                                    length={activity.waypoints.length}
                                    lastWaypoint={activity.waypoints[idx - 1]}
                                />
                            ))}
                        </ol>
                    </nav>
                </div>
            </div>}

            {/* Main Content */}
            <div className="flex-grow overflow-hidden">
                <main className={`container mx-auto py-4 ${activity.type === ActivityType.PATH ? 'h-[calc(100vh-375px)]' : 'h-[calc(100vh-200px)]'}`}>
                    <div className="grid grid-cols-3 gap-4 h-full">
                        {/* Left Column: Activity History */}
                        <div className="col-span-1">
                            <Card className="h-full relative">
                                <CardHeader className="p-4 flex justify-between items-center">
                                    <CardTitle className="text-lg">Activity History</CardTitle>
                                    {(selectedWaypoint != null || selectedActivity != null) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedWaypoint(null)
                                                setSelectedActivity(null)
                                            }}
                                        >
                                            <ArrowLeft className="h-4 w-4 mr-2"/>
                                            Back to {ActivityTypeNameMapping[activity.type]} Overview
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className={'h-[calc(100vh-550px)]'}>
                                        <ActivityTimelineFeed
                                            activityId={selectedWaypoint ?
                                                (selectedActivity == null ? selectedWaypoint : selectedActivity.guid)
                                                : activity.guid}
                                            waypoint={selectedActivity == null && selectedWaypoint != null}
                                            newItems={[]} initialItems={selectedWaypoint ? [] : activity.timeline}
                                            heightClass={'h-[calc(100vh-550px)]'}
                                        />
                                    </div>
                                    <div className={'w-full'}>
                                        <Separator className="my-4"/>
                                        <div className="flex items-center space-x-2 px-4">
                                            <Input
                                                placeholder="Add a note..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                            />
                                            <Button onClick={handleAddComment}>
                                                <Send className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Activity Information and Steps */}
                        <div className="col-span-2">
                            <Card className="h-full relative">
                                <CardHeader className="p-4">
                                    <CardTitle
                                        className="text-lg">{ActivityTypeNameMapping[activity.type]} Information</CardTitle>
                                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{activity.description}</p>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <ScrollArea className="h-[calc(100vh-600px)]">
                                        <div className="overflow-hidden rounded-md">
                                            {selectedWaypoint &&
                                                <ul role="list" className="divide-y divide-gray-200">
                                                    {waypointActivityMap[selectedWaypoint].map((subAct) => (
                                                        <ActivityTile
                                                            setActivity={setSubActivity}
                                                            key={subAct.guid}
                                                            activity={subAct}
                                                            selectedActivity={selectedActivity}
                                                            lastWaypoint={subAct.waypoint ? activity.waypoints[waypoints[subAct.waypoint].order - 1] : undefined}
                                                            relatedActivity={subAct.dateRelativeTo ? activities[subAct.dateRelativeTo] : undefined}
                                                            flowStart={activity.startDate as Date}
                                                            onSelect={setSelectedActivity}/>
                                                    ))}
                                                </ul>
                                            }
                                            {(!selectedWaypoint && activity.type !== ActivityType.WAYPOINT) &&
                                                <ActivityDetails activity={activity} handleToggleStep={handleToggleStep}/>}
                                            {(!selectedWaypoint && activity.type === ActivityType.WAYPOINT) && <Tabs defaultValue="overview" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                                    <TabsTrigger value="activities">Activities</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="overview">
                                                    <ActivityDetails activity={activity} handleToggleStep={handleToggleStep}/>
                                                </TabsContent>
                                                <TabsContent value="activities">
                                                    <ul role="list" className="divide-y divide-gray-200">
                                                        {activity.activities.map((subAct) => (
                                                            <ActivityTile
                                                                setActivity={setSubActivity}
                                                                key={subAct.guid}
                                                                activity={subAct}
                                                                selectedActivity={selectedActivity}
                                                                lastWaypoint={subAct.waypoint ? activity.waypoints[waypoints[subAct.waypoint].order - 1] : undefined}
                                                                relatedActivity={subAct.dateRelativeTo ? activities[subAct.dateRelativeTo] : undefined}
                                                                flowStart={activity.startDate as Date}
                                                                onSelect={setSelectedActivity}/>
                                                        ))}
                                                    </ul>
                                                </TabsContent>
                                            </Tabs>}
                                        </div>
                                    </ScrollArea>

                                    <div className="w-full px-4 absolute bottom-4 left-0">
                                        <Label htmlFor="activityNotes" className="text-sm font-semibold mb-2">
                                            Activity Notes: {selectedActivity ? selectedActivity.title : (
                                            selectedWaypoint ? waypoints[selectedWaypoint].title : `Overall ${ActivityTypeNameMapping[activity.type]}`
                                        )}
                                        </Label>
                                        <div className="flex items-center space-x-2">
                                            <Textarea
                                                id="activityNotes"
                                                placeholder={`Add any additional notes for ${selectedActivity
                                                    ? selectedActivity.title
                                                    : (selectedWaypoint ? waypoints[selectedWaypoint].title : `this ${ActivityTypeNameMapping[activity.type]}`)}...`}
                                                value={activityNotes}
                                                onChange={(e) => setActivityNotes(e.target.value)}
                                                className="w-full h-20 resize-none"
                                            />
                                            <Button onClick={() => {
                                                if (activityNotes.trim()) {
                                                    alert('Pretend I added a note')
                                                    // const newActivity = {
                                                    //     timestamp: new Date(),
                                                    //     user: 'Current User',
                                                    //     action: 'Note added',
                                                    //     details: taskNotes
                                                    // };
                                                    // setTask(prevTask => ({
                                                    //     ...prevTask,
                                                    //     timeline: [newActivity, ...prevTask.timeline]
                                                    // }));
                                                    // setTaskNotes('');
                                                }
                                            }}>
                                                <Send className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

function WaypointTile({waypoint, handleWaypointClick, nextWaypointActive, active, idx, length, lastWaypoint}: {
    waypoint: Waypoint,
    handleWaypointClick: (waypoint: Waypoint) => void,
    idx: number,
    nextWaypointActive: boolean,
    active: boolean,
    length: number,
    lastWaypoint?: Waypoint
}) {
    const completed = waypoint.status === ActivityStatus.COMPLETED

    let timeline: string = ''
    let startDate: Date | undefined = undefined
    let endDate: Date | undefined = undefined

    if (waypoint.actualStart != null) {
        startDate = new Date(waypoint.actualStart)
    }
    if (waypoint.actualEnd != null) {
        endDate = new Date(waypoint.actualEnd)
    }

    if (startDate != null && endDate != null) {
        timeline = `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
    } else if (startDate != null) {
        const estimatedEndDate = new Date(startDate);
        estimatedEndDate.setDate(estimatedEndDate.getDate() + waypoint.days);
        if (waypoint.days === 0) {
            timeline = `${format(startDate, 'MMM dd, yyyy')}. Complete the day of.`
        } else timeline = `${format(startDate, 'MMM dd, yyyy')}. Complete in ${waypoint.days} ${waypoint.days > 1 ? 'days' : 'day'}`
    } else if (lastWaypoint) {
        if (lastWaypoint?.actualStart != null) {
            const _startDate = new Date(lastWaypoint.actualStart)
            _startDate.setDate(_startDate.getDate() + lastWaypoint.days)
            if (waypoint.days === 0) {
                timeline = `Estimated ${format(_startDate, 'MMM dd, yyyy')}. Complete the day of.`
            } else timeline = `Estimated ${format(_startDate, 'MMM dd, yyyy')}. Complete in ${waypoint.days} ${waypoint.days > 1 ? 'days' : 'day'}`
        } else {
            if (waypoint.days === 0) {
                timeline = `After ${lastWaypoint.title} is completed. Complete the day of.`
            } else timeline = `After ${lastWaypoint.title} is completed. Complete in ${waypoint.days} ${waypoint.days > 1 ? 'days' : 'day'}`
        }
    } else {
        timeline = 'Could not determine timeline. This is a bug, please contact the site administrator.'
    }

    return <li key={waypoint.guid} className="relative md:flex md:flex-1">
        <button
            onClick={() => handleWaypointClick(waypoint)}
            className={`group flex w-full items-center ${
                active ? 'bg-blue-100 dark:bg-cyan-950' : ''
            }`}
        >
            <span className="flex flex-col items-start px-6 py-4 text-sm">
                <span className="flex items-center">
                    <span className={classNames('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', {
                        'bg-primary group-hover:bg-primary-dark': waypoint.status === ActivityStatus.COMPLETED,
                        'border-2 border-primary': active && !completed,
                        'border-2 border-gray-300 group-hover:border-gray-400 dark:border-gray-700 dark:group-hover:border-gray-600': !active && !completed,
                    })}>
                    {completed && <Check className="h-4 w-4 text-white dark:text-black"/>}
                        {!completed && (
                            <span
                                className={active ? 'text-primary' : 'text-gray-500 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'}>
                              {idx + 1}
                            </span>
                        )}
                      </span>
                      <span className={`ml-4 font-medium ${
                          active ? 'text-primary' : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100'
                      }`}>
                        {waypoint.title}
                      </span>
                </span>
                <span className="ml-12 flex gap-1 my-1">
                    <Badge variant="outline" className="text-xs py-1 px-2 border-gray-600">
                        {timeline}
                    </Badge>
                </span>
                <span className="ml-12 flex gap-1 mt-1">
                    <ActivityStatusBadge status={waypoint.status}/>
                        <Badge variant="outline" className="text-xs py-0 px-1">
                            {waypoint.users[0] === '.pathfinder.' ? (
                                <BotIcon className="mr-1 h-3 w-3"/>
                            ) : waypoint.users[0] === '.blueprint.' ? (
                                <Workflow className="mr-1 h-3 w-3"/>
                            ) : (
                                <User className="mr-1 h-3 w-3"/>
                            )}
                            {englishList(waypoint.users.map(name => {
                                if (name === '.pathfinder.') {
                                    return 'Pathfinder'
                                } else if (name === '.blueprint.') {
                                    return 'Blueprint Action'
                                }
                                return name.split(' ')[0]
                            }))}
                        </Badge>
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
                        preserveAspectRatio="none"
                    >
                        {/* "Right" side of svg, fills only when the next waypoint is active. Otherwise it's backgorund color */}
                        <path
                            d="M20 0 L20 80 L0 80 L20 40 L0 0 L20 0"
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={4}
                            className={nextWaypointActive ? 'fill-blue-100 dark:fill-cyan-950 stroke-blue-100 dark:stroke-cyan-950' : 'fill-white dark:fill-neutral-800 stroke-white dark:stroke-neutral-800'}
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
    </li>
}

function ActivityTile({activity, setActivity, selectedActivity, onSelect, lastWaypoint, flowStart, relatedActivity}: {
    activity: SubActivity,
    setActivity: (act: SubActivity) => void,
    selectedActivity: SubActivity | null,
    onSelect: (activity: SubActivity) => void,
    lastWaypoint?: Waypoint,
    flowStart?: Date,
    relatedActivity?: SubActivity
}) {
    const [expanded, setExpanded] = useState(false)

    let finalDate = format(activity.endDate, 'MMM dd, yyyy');

    if (typeof activity.endDate === 'number') {
        // Relative date, activity isn't started yet
        switch (activity.offsetType) {
            case DateOffsetType.PATH_START:
                const _finalDate = new Date(flowStart!);
                _finalDate.setDate(_finalDate.getDate() + activity.endDate);
                finalDate = format(_finalDate, 'MMM dd, yyyy');
                break;

            case DateOffsetType.WAYPOINT:
                if (lastWaypoint == null) {
                    finalDate = 'Improperly configured activity. Somehow it doesn\'t have an waypoint before it even though it depends on one for its due date.';
                } else {
                    if (lastWaypoint.actualEnd == null && lastWaypoint.actualStart != null) {
                        // Waypoint is still in progress, we'll give an best due date
                        const _finalDate = new Date(lastWaypoint.actualStart);
                        _finalDate.setDate(_finalDate.getDate() + lastWaypoint.days + activity.endDate);
                        finalDate = format(_finalDate, 'MMM dd, yyyy') + ' (Estimated based on progress)';
                    } else if (lastWaypoint.actualEnd != null) {
                        // Waypoint is complete, we'll give the actual date
                        const _finalDate = new Date(lastWaypoint.actualEnd);
                        _finalDate.setDate(_finalDate.getDate() + activity.endDate);
                        finalDate = format(_finalDate, 'MMM dd, yyyy');
                    } else {
                        // Waypoint is not started yet, we'll give information on how it will be calculated in the future
                        finalDate = `${activity.endDate} ${activity.endDate > 1 ? 'days' : 'day'} after ${lastWaypoint.title} is completed`;
                    }
                }
                break;

            case DateOffsetType.ACTIVITY:
                if (!relatedActivity) {
                    finalDate = 'Could not determine what activity this relies on. This is a bug, please contact the site administrator.'
                } else {
                    if (typeof relatedActivity.endDate === 'number') {
                        // Relative date, activity isn't started yet
                        finalDate = `${activity.endDate} ${activity.endDate > 1 ? 'days' : 'day'} after ${relatedActivity.title} is completed`;
                    } else {
                        if (relatedActivity.completedAt != null) {
                            const _finalDate = new Date(relatedActivity.completedAt);
                            _finalDate.setDate(_finalDate.getDate() + activity.endDate);
                            finalDate = format(_finalDate, 'MMM dd, yyyy');
                        } else {
                            // Estimate based on progress
                            const _finalDate = new Date(relatedActivity.endDate);
                            _finalDate.setDate(_finalDate.getDate() + activity.endDate);
                            finalDate = format(_finalDate, 'MMM dd, yyyy') + ' (Estimated based on progress)';
                        }
                    }
                }
                break;
        }
    }

    useEffect(() => {
        if (expanded) {
            onSelect(activity)
        }
    }, [expanded])

    useEffect(() => {
        if (selectedActivity && selectedActivity.guid === activity.guid) {
            setExpanded(true)
        }
    }, [selectedActivity])

    const actions: React.ReactNode[] = []

    const handleToggleStep = async (step: Step, completed: boolean) => {
        const val = {...activity}
        const result = handleServerAction(await toggleStep(activity.guid, step.guid, completed));
        if (!result.success) {
            throw new Error(`Error ${!completed ? 'un' : ''}completing step: ${result.message}`);
        }
        if (result.result!.completed) {
            val.status = ActivityStatus.COMPLETED;
        } else if (val.status === ActivityStatus.COMPLETED) {
            val.status = ActivityStatus.IN_PROGRESS;
        }
        val.steps = val.steps?.map(step => step.guid === step.guid ? {...step, completed} : step);
        setActivity(val);
    }

    switch (activity.subType) {
        case TaskScheduleType.COMMUNICATION_CALL:
        case TaskScheduleType.COMMUNICATION_CALL_OUTBOUND:
            actions.push(<TooltipButton key={'call'} variant="ghost" size="icon" tooltip="Quick call">
                <Phone className="h-4 w-4"/>
            </TooltipButton>)
            break;

        case TaskScheduleType.COMMUNICATION_EMAIL:
        case TaskScheduleType.COMMUNICATION_MESSAGE:
            actions.push(<TooltipButton key={'email'} variant="ghost" size="icon" tooltip="Quick email">
                <Phone className="h-4 w-4"/>
            </TooltipButton>)
    }

    if (activity.steps?.find(step => step.type === ActivityStepType.ATTACHMENT)) {
        actions.push(<TooltipButton key={'attachment'} tooltip={'Add attachment'} variant="ghost" size="icon" onClick={() => console.log('Add attachment')}>
            <Paperclip className="h-4 w-4"/>
        </TooltipButton>)
    }

    return <li key={activity.guid}
               className={`px-6 py-4 ${selectedActivity && selectedActivity.guid === activity.guid ? 'bg-blue-50  dark:bg-cyan-950' : ''}`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center cursor-pointer"
                 onClick={() => setExpanded(!expanded)}>
                <div className="flex-shrink-0">
                    <ActivityTypeIcon type={activity.subType!} baseType={activity.type}/>
                </div>
                <div className="ml-4">
                    <a className="text-lg font-medium text-gray-900 dark:text-gray-100 hover:underline"
                       href={`/activities/${activity.guid}`}>{activity.title}</a>
                    <div className="flex space-x-2 mt-1">
                        <Badge className={'dark:border-gray-200 border-gray-800'} variant="outline">
                            <UserPlus className="h-4 w-4 mr-1"/> {englishList(activity.users)}
                        </Badge>
                        <Badge className={'border-gray-400'}
                               variant="outline">Due {finalDate}</Badge>
                        {activity.type === ActivityType.SCHEDULED &&
                            <Badge variant="outline">
                                {differenceInHours(activity.endDate, activity.startDate)} hrs
                                {differenceInMinutes(activity.endDate, activity.startDate) % 60 > 0 ? ' and '
                                    + differenceInMinutes(activity.endDate, activity.startDate) % 60 + ' minutes' : ''}
                            </Badge>
                        }
                        {(activity.steps?.length ?? 0) > 0 && <Badge variant="outline">
                            {activity.steps?.length || 0} steps
                        </Badge>}
                        <ActivityStatusBadge status={activity.status}/>
                    </div>
                </div>
            </div>
            <div className="flex space-x-2">
                {actions}
                {/* TODO: Add checks for this. Only certain roles should be able to reassign I think*/}
                <TooltipButton variant="ghost" size="icon" tooltip="Reassign activity">
                    <UserPlus className="h-4 w-4"/>
                </TooltipButton>
                <TooltipButton tooltip={'Edit'} variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
                    <Pencil className="h-4 w-4"/>
                </TooltipButton>
                <Button variant="ghost" size="icon"
                        onClick={() => setExpanded(!expanded)}>
                    {expanded ?
                        <ChevronDown className="h-4 w-4"/> :
                        <ChevronRight className="h-4 w-4"/>}
                </Button>
            </div>
        </div>
        {expanded && (
            <div className="mt-4 space-y-2">
                {activity.steps?.map((step) => (
                    <ActivityStep step={step} key={step.guid} handleToggleStep={(completed) => handleToggleStep(step, completed)}/>
                ))}
                <Button variant="ghost" size="sm" className="mt-2"
                        onClick={() => alert('Pretend I opened a dialog to add a step')}>
                    <Plus className="h-4 w-4 mr-2"/>
                    Add Step
                </Button>
            </div>
        )}
    </li>
}

function ActivityDetails({activity, handleToggleStep}: { activity: Activity, handleToggleStep: (step: Step, completed: boolean) => void }) {
    return <div className={'space-y-4'}>
        <Card className="h-full">
            <CardContent className="p-4 grid grid-cols-2 gap-4">
                <div className={'space-x-4'}>
                    <span className="font-bold">Title</span>
                    <span className="font-bold">{activity.title}</span>
                </div>
                <div className={'space-x-4'}>
                    <span className="font-bold">Type</span>
                    <Badge className={'border-gray-400'}>
                        <ActivityTypeIcon
                            type={activity.subType}
                            baseType={activity.type}
                        />
                        {TaskScheduleTypeNameMapping[activity.subType!] ?? ActivityTypeNameMapping[activity.type]}
                    </Badge>
                </div>
                <div className={'space-x-4'}>
                    <span className="font-bold">Status</span>
                    <Badge className={'border-gray-400'}>
                        {ActivityStatusNameMapping[activity.status!]}
                    </Badge>
                </div>
                <div className={'space-x-4'}>
                    <span className="font-bold">Priority</span>
                    <Badge className={'border-gray-400'}>
                        {ActivityPriorityNameMapping[activity.priority!]}
                    </Badge>
                </div>
                <div className={'space-x-4'}>
                    <span className="font-bold">Start Date</span>
                    <Badge className={'border-gray-400'}>
                        {format(activity.startDate, 'MMM dd, yyyy')}
                    </Badge>
                </div>
                <div className={'space-x-4'}>
                    <span className="font-bold">Due Date</span>
                    <Badge className={'border-gray-400'}>
                        {format(activity.endDate, 'MMM dd, yyyy')}
                    </Badge>
                </div>
                <div className={'space-x-4 col-span-2'}>
                    <span className="font-bold">Description</span>
                    {activity.description}
                </div>
                <div className={'space-x-4'}>
                    <span className="font-bold">Assigned to</span>
                    <span>
                    {englishList(activity.users)}
                    </span>
                </div>
            </CardContent>
        </Card>
        {(activity.steps?.length ?? 0) > 0 && <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Steps</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
                {activity.steps?.map((step) => (
                    <ActivityStep step={step} key={step.guid} handleToggleStep={(completed) => handleToggleStep(step, completed)}/>
                ))}
            </CardContent>
        </Card>}
    </div>
}

function ActivityStep({step, handleToggleStep}: {
    step: Step,
    handleToggleStep: (completed: boolean) => void
}) {
    const label = step.title + (step.assignedTo.length > 0 ? ` (${englishList(step.assignedTo)})` : '')

    return <div className="flex items-center justify-between">
        <div>
            {step.type === ActivityStepType.CHECK && (
                <div className="flex items-center">
                    <Checkbox id={step.guid}
                              onCheckedChange={(checked) => handleToggleStep(checked === true)}
                              checked={step.completed}/>
                    <Label htmlFor={step.guid}
                           className="ml-2">{label}</Label>
                </div>
            )}
            {step.type === ActivityStepType.ATTACHMENT && (<div className={'space-y-2'}>
                    {step.completed && <span>
                        {label} — <a onClick={() => alert('Pretend I opened an attachment')}
                                     className="text-blue-500 hover:underline">View
                        Attachment</a>
                    </span>}
                    {!step.completed && step.title}
                    <br/>
                    <Button onClick={() => alert('Pretend I opened an upload box')}>
                        {step.completed ? 'Update Attachment' : 'Upload'}
                    </Button>
                </div>
            )}
            {step.type === ActivityStepType.FORM && (<>
                {label} — <a
                onClick={() => alert('Pretend I opened a form')}
                className="text-blue-500 hover:underline">
                {step.completed ? 'View' : 'Open'} Form
            </a>
            </>)}
        </div>
    </div>
}