'use client'

import React, {useEffect, useState} from 'react'
import {
    Bell,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    GripVertical,
    Mail,
    MessageCircle,
    Phone,
    PieChart,
    UserPlus,
    Users
} from 'lucide-react'
import {Avatar, AvatarFallback, AvatarImage} from "~/components/ui/avatar"
import {Button} from "~/components/ui/button"
import {Badge} from "~/components/ui/badge"
import {ScrollArea} from "~/components/ui/scroll-area"
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Popover, PopoverContent, PopoverTrigger} from "~/components/ui/popover"
import {DragDropContext, Draggable, Droppable, DropResult, resetServerContext} from 'react-beautiful-dnd'
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis} from 'recharts'
import {AnimatePresence, motion} from "framer-motion";
import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card";
import {createPortal} from 'react-dom'
import {ActivityPriority, ActivityPriorityNameMapping, ActivityType, TaskScheduleType, TaskScheduleTypeNameMapping} from "~/common/enum/enumerations";
import {FeedItem, FeedWithItems} from './contacts/[guid]/components/Feed'
import {InfiniteList} from "~/components/ui/infinitelist";
import {handleServerAction} from "~/util/api/client/APIClient";
import {FormattedLink} from "~/components/util/FormattedLink";
import {EnglishList} from '~/components/util/EnglishList'
import {ActivityTypeIcon} from "~/components/data/models/ActivityTypeIcon";
import {getUserTimeline} from "~/app/(authenticated)/Actions";

type Notification = {
    id: string,
    type: string,
    message: React.ReactNode,
    details: string,
    priority?: string,
    time?: Date,
    dueDate?: Date
    nextAction?: string
}

type Appointment = {
    guid: string,
    start: Date,
    end: Date,
    type: TaskScheduleType,
    title: string,
    with: {
        name: string,
        guid: string,
    }[]
}

type Task = {
    guid: string,
    title: string,
    priority: ActivityPriority,
    description: string | null,
    startDate: Date,
    dueDate: Date,
    assignedBy: string,
    with: {
        name: string,
        guid: string,
    }[]
}


type DashboardProps = {
    userData: {
        guid: string,
        name: string,
        avatar?: string
    },
    appointments: Appointment[],
    tasks: Task[],
    recentInteractions: FeedItem[],
}

export default function TodayDashboard({
                                           userData,
                                           appointments,
                                           tasks,
                                           recentInteractions
                                       }: DashboardProps) {
    const [expandedCard, setExpandedCard] = useState<string[]>([])
    const [tileOrder, setTileOrder] = useState([
        'appointments', 'tasks', 'opportunities', 'metrics',
        'notifications', 'contacts', 'personalTouch'
    ])
    const [notifications, setNotifications] = useState<Notification[]>([])

    const expandCard = (id: string) => {
        if (expandedCard.includes(id)) {
            setExpandedCard(expandedCard.filter(card => card !== id))
        } else {
            setExpandedCard([...expandedCard, id])
        }
    }

    const formatDate = (date: Date) => {
        const now = new Date()
        const inputDate = new Date(date)
        const diffTime = Math.abs(now.getTime() - inputDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
            return 'Today'
        } else if (diffDays === 1) {
            return 'Yesterday'
        } else if (diffDays < 7) {
            return inputDate.toLocaleDateString('en-US', {weekday: 'long'})
        } else {
            return inputDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})
        }
    }

    const formatTime = (time: Date) => {
        return time.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
    }

    const metrics = [
        {
            id: 1,
            name: "New Clients",
            value: 5,
            change: "+2",
            trend: "up",
            details: "5 new clients acquired this month, 2 more than last month"
        },
        {
            id: 2,
            name: "New Assets This Month",
            value: "$1M",
            change: "+$200K",
            trend: "up",
            details: "$1 million in new assets added this month, $200K more than last month"
        },
        {
            id: 3,
            name: "New Assets This Year",
            value: "$23M",
            change: "+15%",
            trend: "up",
            details: "$23 million in new assets added this year, 15% increase from last year"
        },
    ]

    const metricsData = [
        {name: 'Jan', value: 4000},
        {name: 'Feb', value: 3000},
        {name: 'Mar', value: 2000},
        {name: 'Apr', value: 2780},
        {name: 'May', value: 1890},
        {name: 'Jun', value: 2390},
    ]

    const opportunities = [
        {
            id: 1,
            name: "High-Yield Bond Fund",
            client: "John Doe",
            value: "$500,000",
            stage: "Proposal",
            dueItems: ["Send prospectus", "Schedule follow-up call"],
            nextAction: "Prepare personalized proposal"
        },
        {
            id: 2,
            name: "Retirement Portfolio Rebalance",
            client: "Jane Smith",
            value: "$750,000",
            stage: "Negotiation",
            dueItems: ["Review risk tolerance", "Adjust asset allocation"],
            nextAction: "Present new portfolio mix"
        },
        {
            id: 3,
            name: "Estate Planning Services",
            client: "Bob Brown",
            value: "$1,000,000",
            stage: "Qualification",
            dueItems: ["Gather family information", "Assess current estate plan"],
            nextAction: "Schedule estate planning workshop"
        },
    ]

    const personalTouchClients = [
        {
            id: 1,
            name: "George Wilson",
            lastContact: new Date("2023-03-15"),
            phone: "+1234567890",
            email: "george.wilson~example.com"
        },
        {
            id: 2,
            name: "Emma Thompson",
            lastContact: new Date("2023-03-20"),
            phone: "+1987654321",
            email: "emma.thompson~example.com"
        },
        {
            id: 3,
            name: "Oliver Davis",
            lastContact: new Date("2023-03-25"),
            phone: "+1122334455",
            email: "oliver.davis~example.com"
        },
    ]

    useEffect(() => {
        // Generate notifications based on appointments, tasks, and opportunities
        const newNotifications: Notification[] = [
            ...appointments.map(appointment => ({
                id: `appointment-${appointment.guid}`,
                type: 'appointment',
                message: <span>
                    Upcoming {TaskScheduleTypeNameMapping[appointment.type]}{' '}
                    with <EnglishList
                    Component={({children, idx}) => <FormattedLink href={`/contacts/${appointment.with[idx].guid}`}>{children}</FormattedLink>}
                    strs={appointment.with.map(contact => contact.name)}/>
                </span>,
                details: appointment.title,
                time: appointment.start,
            })),
            ...tasks.filter(task => new Date(task.dueDate) <= new Date()).map(task => ({
                id: `task-${task.guid}`,
                type: 'task',
                message: `Task due: ${task.title}`,
                details: task.description ?? '',
                priority: task.priority,
                dueDate: task.dueDate,
            })),
            ...opportunities.map(opportunity => ({
                id: `opportunity-${opportunity.id}`,
                type: 'opportunity',
                message: `Opportunity update: ${opportunity.name}`,
                details: `Client: ${opportunity.client}, Value: ${opportunity.value}, Stage: ${opportunity.stage}`,
                nextAction: opportunity.nextAction,
            })),
        ]
        setNotifications(newNotifications)
    }, [])

    const handleItemClick = (type: string, id: string | number) => {
        // In a real application, this would navigate to the appropriate page
        console.log(`Navigating to ${type} with id ${id}`)
    }

    const handleCall = (phone: string) => {
        // In a real application, this would initiate a call
        console.log(`Initiating call to ${phone}`)
    }

    const handleReschedule = (id: number, duration: string) => {
        // In a real application, this would update the database
        console.log(`Rescheduling client ${id} for ${duration}`)
    }

    const handleReassign = (id: number, newUser: string) => {
        // In a real application, this would update the database
        console.log(`Reassigning client ${id} to ${newUser}`)
    }

    const handleQuickNote = (id: number) => {
        // In a real application, this would open a note dialog
        console.log(`Opening quick note for client ${id}`)
    }

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return
        }

        const items = Array.from(tileOrder)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        setTileOrder(items)
    }

    // const QuickAddDialog = ({title, fields}: { title: string, fields: string[] }) => (
    //     <Dialog>
    //         <DialogTrigger asChild>
    //             <Button variant="outline" size="icon">
    //                 <Plus className="h-4 w-4"/>
    //             </Button>
    //         </DialogTrigger>
    //         <DialogContent>
    //             <DialogHeader>
    //                 <DialogTitle>Quick Add {title}</DialogTitle>
    //                 <DialogDescription>Fill in the details to add a new {title.toLowerCase()}.</DialogDescription>
    //             </DialogHeader>
    //             <div className="grid gap-4 py-4">
    //                 {fields.map((field, index) => (
    //                     <div key={index} className="grid grid-cols-4 items-center gap-4">
    //                         <Label htmlFor={field} className="text-right">
    //                             {field}
    //                         </Label>
    //                         <Input id={field} className="col-span-3"/>
    //                     </div>
    //                 ))}
    //             </div>
    //             <Button type="submit">Add {title}</Button>
    //         </DialogContent>
    //     </Dialog>
    // )

    const renderTile = (id: string, idx: number, isExpanded: boolean) => {
        switch (id) {
            case 'appointments':
                return (
                    <ExpandableCard
                        key={id}
                        idx={idx}
                        id={id}
                        isExpanded={isExpanded}
                        expandCard={expandCard}
                        title="Today's Appointments"
                        icon={<Calendar className="h-4 w-4 text-muted-foreground"/>}
                        expandedContent={
                            <ScrollArea className="h-[400px]">
                                {appointments.map(appointment => (
                                    <div
                                        key={appointment.guid}
                                        className="mb-4 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded"
                                        onClick={() => handleItemClick('appointment', appointment.guid)}
                                    >
                                        <div className="font-semibold">{formatTime(appointment.start)}</div>
                                        <div className="text-sm text-muted-foreground">{appointment.title}</div>
                                        <Badge>
                                            <ActivityTypeIcon type={appointment.type} baseType={ActivityType.SCHEDULED}/> {TaskScheduleTypeNameMapping[appointment.type]}
                                        </Badge>
                                        <p className="mt-2 text-sm">With <EnglishList
                                            Component={({children, idx}) => <FormattedLink
                                                href={`/contacts/${appointment.with[idx].guid}`}>{children}</FormattedLink>}
                                            strs={appointment.with.map(contact => contact.name)}/>
                                        </p>
                                    </div>
                                ))}
                            </ScrollArea>
                        }
                    >
                        <ScrollArea className="h-[200px]">
                            {appointments.slice(0, 3).map(appointment => (
                                <Tooltip key={appointment.guid}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="mb-4 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded"
                                            onClick={() => handleItemClick('appointment', appointment.guid)}
                                        >
                                            <div className="font-semibold">{formatTime(appointment.start)}</div>
                                            <div className="text-sm text-muted-foreground">{appointment.title}</div>
                                            <Badge>
                                                <ActivityTypeIcon type={appointment.type} baseType={ActivityType.SCHEDULED}/> {TaskScheduleTypeNameMapping[appointment.type]}
                                            </Badge>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="mt-2 text-sm">With <EnglishList
                                            Component={({children, idx}) => <FormattedLink
                                                href={`/contacts/${appointment.with[idx].guid}`}>{children}</FormattedLink>}
                                            strs={appointment.with.map(contact => contact.name)}/>
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </ScrollArea>
                    </ExpandableCard>
                )
            case 'tasks':
                return (
                    <ExpandableCard
                        key={id}
                        idx={idx}
                        id={id}
                        isExpanded={isExpanded}
                        expandCard={expandCard}
                        title="Tasks Requiring Attention"
                        icon={<CheckCircle className="h-4 w-4 text-muted-foreground"/>}
                        expandedContent={
                            <ScrollArea className="h-[400px]">
                                {tasks.map(task => {
                                    const isPastDue = new Date(task.dueDate) < new Date()
                                    return (
                                        <div
                                            key={task.guid}
                                            className={`mb-4 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded ${isPastDue ? 'border-l-4 border-red-500' : ''}`}
                                            onClick={() => handleItemClick('task', task.guid)}
                                        >
                                            <div className="font-semibold">{task.title}</div>
                                            <Badge
                                                variant={task.priority === ActivityPriority.HIGH ? 'destructive' : task.priority === ActivityPriority.MEDIUM ? 'default' : 'secondary'}>
                                                {ActivityPriorityNameMapping[task.priority]}
                                            </Badge>
                                            {task.description && <p className="mt-2 text-sm">{task.description}</p>}
                                            <p className={`text-sm ${isPastDue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                                Due {formatDate(task.dueDate)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Assigned by {task.assignedBy}. Started {formatDate(task.startDate)}
                                            </p>
                                            <p>With <EnglishList
                                                Component={({children, idx}) => <FormattedLink
                                                    href={`/contacts/${task.with[idx].guid}`}>{children}</FormattedLink>}
                                                strs={task.with.map(contact => contact.name)}/>
                                            </p>
                                        </div>
                                    )
                                })}
                            </ScrollArea>
                        }
                    >
                        <ScrollArea className="h-[200px]">
                            {tasks.slice(0, 3).map(task => {
                                const isPastDue = new Date(task.dueDate) < new Date()
                                return (
                                    <Tooltip key={task.guid}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={`mb-4 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded ${isPastDue ? 'border-l-4 border-red-500' : ''}`}
                                                onClick={() => handleItemClick('task', task.guid)}
                                            >
                                                <div className="font-semibold">{task.title}</div>
                                                <Badge
                                                    variant={task.priority === ActivityPriority.HIGH ? 'destructive' : task.priority === ActivityPriority.MEDIUM ? 'default' : 'secondary'}>
                                                    {ActivityPriorityNameMapping[task.priority]}
                                                </Badge>
                                                <p className={`text-sm ${isPastDue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                                    Due: {formatDate(task.dueDate)}
                                                </p>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>With <EnglishList
                                                Component={({children, idx}) => <FormattedLink
                                                    href={`/contacts/${task.with[idx].guid}`}>{children}</FormattedLink>}
                                                strs={task.with.map(contact => contact.name)}/>
                                            </p>
                                            {task.description && <p className="mt-2 text-sm">{task.description}</p>}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </ScrollArea>
                    </ExpandableCard>
                )
            case 'opportunities':
                return (
                    <ExpandableCard
                        id={id}
                        isExpanded={isExpanded}
                        expandCard={expandCard}
                        idx={idx}
                        key={id}
                        title="Opportunities"
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground"/>}
                        expandedContent={
                            <ScrollArea className="h-[400px]">
                                {opportunities.map(opportunity => (
                                    <div key={opportunity.id} className="mb-4 last:mb-0 p-2 border-b">
                                        <div className="font-semibold">{opportunity.name}</div>
                                        <div
                                            className="text-sm text-muted-foreground">Client: {opportunity.client}</div>
                                        <div className="text-sm">Value: {opportunity.value}</div>
                                        <Badge>{opportunity.stage}</Badge>
                                        <div className="mt-2">
                                            <div className="font-medium">Due Items:</div>
                                            <ul className="list-disc list-inside text-sm">
                                                {opportunity.dueItems.map((item, index) => (
                                                    <li key={index}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="mt-2">
                                            <div className="font-medium">Next Action:</div>
                                            <p className="text-sm">{opportunity.nextAction}</p>
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        }
                    >
                        <ScrollArea className="h-[200px]">
                            {opportunities.slice(0, 2).map(opportunity => (
                                <div key={opportunity.id} className="mb-4 last:mb-0">
                                    <div className="font-semibold">{opportunity.name}</div>
                                    <div className="text-sm text-muted-foreground">Client: {opportunity.client}</div>
                                    <div className="text-sm">Value: {opportunity.value}</div>
                                    <Badge>{opportunity.stage}</Badge>
                                </div>
                            ))}
                        </ScrollArea>
                    </ExpandableCard>
                )
            case 'metrics':
                return (
                    <ExpandableCard
                        id={id}
                        isExpanded={isExpanded}
                        expandCard={expandCard}
                        key={id}
                        idx={idx}
                        title="Key Metrics"
                        icon={<PieChart className="h-4 w-4 text-muted-foreground"/>}
                        expandedContent={
                            <div>
                                {metrics.map(metric => (
                                    <div key={metric.id} className="mb-6 last:mb-0">
                                        <div className="flex items-center mb-2">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{metric.name}</div>
                                                <div className="text-2xl font-bold">{metric.value}</div>
                                            </div>
                                            <Badge variant={metric.trend === 'up' ? 'default' : 'destructive'}>
                                                {metric.change}
                                            </Badge>
                                        </div>
                                        <p className="text-sm mb-2">{metric.details}</p>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={metricsData}>
                                                <CartesianGrid strokeDasharray="3 3"/>
                                                <XAxis dataKey="name"/>
                                                <YAxis/>
                                                <RechartsTooltip/>
                                                <Bar dataKey="value" fill="#8884d8"/>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ))}
                            </div>
                        }
                    >
                        {metrics.map(metric => (
                            <div key={metric.id} className="flex items-center mb-4 last:mb-0">
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{metric.name}</div>
                                    <div className="text-2xl font-bold">{metric.value}</div>
                                </div>
                                <Badge variant={metric.trend === 'up' ? 'default' : 'destructive'}>
                                    {metric.change}
                                </Badge>
                            </div>
                        ))}
                    </ExpandableCard>
                )
            case 'notifications':
                return (
                    <ExpandableCard
                        id={id}
                        isExpanded={isExpanded}
                        expandCard={expandCard}
                        key={id}
                        idx={idx}
                        title="Recent Notifications"
                        icon={<Bell className="h-4 w-4 text-muted-foreground"/>}
                        expandedContent={
                            <ScrollArea className="h-[300px]">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className="flex items-center mb-2 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded text-sm"
                                        onClick={() => handleItemClick(notification.type, notification.id)}
                                    >
                                        {notification.type === 'appointment' &&
                                            <Calendar className="h-4 w-4 mr-2 text-blue-500"/>}
                                        {notification.type === 'task' &&
                                            <CheckCircle className="h-4 w-4 mr-2 text-yellow-500"/>}
                                        {notification.type === 'opportunity' &&
                                            <DollarSign className="h-4 w-4 mr-2 text-green-500"/>}
                                        <div>
                                            <span>{notification.message}</span>
                                            <p className="text-xs text-muted-foreground mt-1">{notification.details}</p>
                                            {notification.time &&
                                                <p className="text-xs text-muted-foreground">{formatDate(notification.time)} at {formatTime(notification.time)}</p>}
                                            {notification.dueDate &&
                                                <p className="text-xs text-muted-foreground">Due: {formatDate(notification.dueDate)}</p>}
                                            {notification.nextAction &&
                                                <p className="text-xs text-muted-foreground">Next
                                                    Action: {notification.nextAction}</p>}
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        }
                    >
                        <ScrollArea className="h-[150px]">
                            {notifications.slice(0, 3).map(notification => (
                                <div
                                    key={notification.id}
                                    className="flex items-center mb-2 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded text-sm"
                                    onClick={() => handleItemClick(notification.type, notification.id)}
                                >
                                    {notification.type === 'appointment' &&
                                        <Calendar className="h-4 w-4 mr-2 text-blue-500"/>}
                                    {notification.type === 'task' &&
                                        <CheckCircle className="h-4 w-4 mr-2 text-yellow-500"/>}
                                    {notification.type === 'opportunity' &&
                                        <DollarSign className="h-4 w-4 mr-2 text-green-500"/>}
                                    <span>{notification.message}</span>
                                </div>
                            ))}
                        </ScrollArea>
                    </ExpandableCard>
                )
            case 'contacts':
                return (
                    <ExpandableCard
                        id={id}
                        isExpanded={isExpanded}
                        expandCard={expandCard}
                        key={id}
                        idx={idx}
                        title="Recent Interactions"
                        icon={<Users className="h-4 w-4 text-muted-foreground"/>}
                        expandedContent={
                            <UserFeed initialItems={recentInteractions} userId={userData.guid}/>
                        }
                    >
                        <ScrollArea className="h-[150px]">
                            <FeedWithItems items={recentInteractions}/>
                        </ScrollArea>
                    </ExpandableCard>
                )
            case 'personalTouch':
                return (
                    <ExpandableCard
                        id={id}
                        isExpanded={isExpanded}
                        expandCard={expandCard}
                        key={id}
                        idx={idx}
                        title="Personal Touch"
                        icon={<Users className="h-4 w-4 text-muted-foreground"/>}
                        expandedContent={
                            <ScrollArea className="h-[400px]">
                                {personalTouchClients.map(client => (
                                    <div key={client.id} className="mb-4 last:mb-0 p-2 hover:bg-muted rounded">
                                        <div className="font-semibold">{client.name}</div>
                                        <div className="text-sm text-muted-foreground">Last
                                            contact: {formatDate(client.lastContact)}</div>
                                        <div className="text-sm">
                                            <Phone className="h-4 w-4 inline mr-1"/> {client.phone}
                                        </div>
                                        <div className="text-sm">
                                            <Mail className="h-4 w-4 inline mr-1"/> {client.email}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Button variant="outline" size="sm"
                                                    onClick={() => handleCall(client.phone)}>
                                                <Phone className="h-4 w-4 mr-1"/> Call
                                            </Button>
                                            <Select onValueChange={(value) => handleReschedule(client.id, value)}>
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue placeholder="Reschedule"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1week"><Clock className="h-4 w-4 inline mr-1"/> 1
                                                        Week</SelectItem>
                                                    <SelectItem value="1month"><Clock
                                                        className="h-4 w-4 inline mr-1"/> 1 Month</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select onValueChange={(value) => handleReassign(client.id, value)}>
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue placeholder="Reassign"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="john"><UserPlus
                                                        className="h-4 w-4 inline mr-1"/> John</SelectItem>
                                                    <SelectItem value="sarah"><UserPlus
                                                        className="h-4 w-4 inline mr-1"/> Sarah</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="outline" size="sm"
                                                    onClick={() => handleQuickNote(client.id)}>
                                                <MessageCircle className="h-4 w-4 mr-1"/> Quick Note
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        }
                    >
                        <ScrollArea className="h-[200px]">
                            {personalTouchClients.map(client => (
                                <div key={client.id} className="mb-4 last:mb-0 p-2 hover:bg-muted rounded">
                                    <div className="font-semibold">{client.name}</div>
                                    <div className="text-sm text-muted-foreground">Last
                                        contact: {formatDate(client.lastContact)}</div>
                                    <Button variant="outline" size="sm" onClick={() => handleCall(client.phone)}>
                                        <Phone className="h-4 w-4 mr-1"/> Call
                                    </Button>
                                </div>
                            ))}
                        </ScrollArea>
                    </ExpandableCard>
                )
            default:
                return null
        }
    }

    resetServerContext()

    return (
        <TooltipProvider>
            <div className="container mx-auto p-6">
                <header className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                        <Avatar>
                            {userData.avatar && <AvatarImage src={userData.avatar} alt={userData.name}/>}
                            <AvatarFallback>{userData.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold">Welcome back, {userData.name}</h1>
                        </div>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Bell className="h-4 w-4"/>
                                Notifications
                                <Badge variant="secondary">{notifications.length}</Badge>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <ScrollArea className="h-[300px]">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className="flex items-start mb-2 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded text-sm"
                                        onClick={() => handleItemClick(notification.type, notification.id)}
                                    >
                                        {notification.type === 'appointment' &&
                                            <Calendar className="h-4 w-4 mr-2 mt-1 text-blue-500"/>}
                                        {notification.type === 'task' &&
                                            <CheckCircle className="h-4 w-4 mr-2 mt-1 text-yellow-500"/>}
                                        {notification.type === 'opportunity' &&
                                            <DollarSign className="h-4 w-4 mr-2 mt-1 text-green-500"/>}
                                        <div>
                                            <span className="font-medium">{notification.message}</span>
                                            <p className="text-xs text-muted-foreground mt-1">{notification.details}</p>
                                            {notification.time &&
                                                <p className="text-xs text-muted-foreground">{formatDate(notification.time)} at {formatTime(notification.time)}</p>}
                                            {notification.dueDate &&
                                                <p className="text-xs text-muted-foreground">Due: {formatDate(notification.dueDate)}</p>}
                                            {notification.nextAction &&
                                                <p className="text-xs text-muted-foreground">Next
                                                    Action: {notification.nextAction}</p>}
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </header>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {tileOrder.map((id, idx) => renderTile(id, idx, expandedCard.includes(id)))}
                    </div>
                </DragDropContext>
            </div>
        </TooltipProvider>
    )
}

const ExpandableCard = ({id, title, icon, children, expandedContent, idx, isExpanded, expandCard}: {
    id: string,
    title: string,
    icon: React.ReactNode,
    children: React.ReactNode,
    expandedContent: React.ReactNode
    idx: number,
    isExpanded: boolean,
    expandCard: (id: string) => void
}) => {
    return (
        <Droppable droppableId={id} isDropDisabled={false} isCombineEnabled={false}
                   ignoreContainerClipping={false}>
            {(provided, snapshot) => {
                const isBeingDragged = (snapshot.isDraggingOver && snapshot.draggingOverWith === id) || snapshot.draggingFromThisWith === id
                const content = (
                    <>
                        {(snapshot.isDraggingOver && snapshot.draggingOverWith !== id && snapshot.draggingFromThisWith !== id) && <div/>}
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            <Draggable draggableId={id} index={idx}>
                                {(provided, snapshot) => {
                                    const props = {...provided.draggableProps}
                                    if (props.style?.transform && !snapshot.isDragging) {
                                        props.style.transform = ''
                                    }
                                    return (
                                        <>
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                            >
                                                <motion.div
                                                    whileHover={{scale: isExpanded ? 1 : 1.05}}
                                                    transition={{type: "spring", stiffness: 300}}
                                                    className={`${isExpanded ? 'col-span-full' : ''}`}
                                                >
                                                    <Card className="h-full">
                                                        <CardHeader
                                                            className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                            <CardTitle
                                                                className="text-sm font-medium">{title}</CardTitle>
                                                            {icon}
                                                            <div className="flex items-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => expandCard(id)}
                                                                >
                                                                    {isExpanded ? <ChevronUp className="h-4 w-4"/> :
                                                                        <ChevronDown className="h-4 w-4"/>}
                                                                </Button>
                                                                <div {...provided.dragHandleProps}>
                                                                    <GripVertical
                                                                        className="h-4 w-4 text-muted-foreground cursor-move"/>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <AnimatePresence>
                                                                {isExpanded ? (
                                                                    <motion.div
                                                                        key="expanded"
                                                                        initial={{opacity: 0, height: 0}}
                                                                        animate={{opacity: 1, height: 'auto'}}
                                                                        exit={{opacity: 0, height: 0}}
                                                                        transition={{duration: 0.3}}
                                                                    >
                                                                        {expandedContent}
                                                                    </motion.div>
                                                                ) : (
                                                                    <motion.div
                                                                        key="collapsed"
                                                                        initial={{opacity: 1}}
                                                                        animate={{opacity: 1}}
                                                                        exit={{opacity: 0}}
                                                                        transition={{duration: 0}}
                                                                    >
                                                                        {children}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            </div>
                                        </>
                                    )
                                }}
                            </Draggable>
                        </div>
                    </>
                )

                if (isBeingDragged) {
                    return createPortal(content, document.body)
                }
                return content
            }}
        </Droppable>
    )
}

function UserFeed({initialItems, userId}: { initialItems: FeedItem[], userId: string }) {
    const COUNT = 5;

    const _items = [...initialItems];

    return (
        <div className="space-y-4">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    <InfiniteList<FeedItem>
                        dataBefore={_items}
                        listKey={`feed-${userId}`}
                        load={async offset => {
                            const result = handleServerAction(await getUserTimeline(offset + _items.length, COUNT));
                            if (!result.success || result.result == null) {
                                throw new Error(`Error loading notes: ${result.message}`);
                            }
                            return result.result;
                        }}
                        render={(item, idx, count) => {
                            return <li key={item.guid}>
                                <FeedItem feedItem={item} idx={idx} length={count} includeActivityDetails={false} includeOpportunityDetails={false}/>
                            </li>
                        }}
                        noData={() => {
                            return <></>
                        }}
                        className={'h-[400px]'}
                        viewportClassName={'p-4'}
                    />
                </ul>
            </div>
        </div>
    )
}