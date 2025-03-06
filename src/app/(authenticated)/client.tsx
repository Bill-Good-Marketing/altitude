'use client'

import React, { useEffect, useState } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '~/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '~/components/ui/popover'
import {
  DragDropContext,
  Draggable,
  Droppable,
  resetServerContext
} from 'react-beautiful-dnd'
import type { DropResult } from 'react-beautiful-dnd'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { createPortal } from 'react-dom'
import {
  ActivityPriority,
  ActivityPriorityNameMapping,
  ActivityType,
  TaskScheduleType,
  TaskScheduleTypeNameMapping
} from '~/common/enum/enumerations'
import { FeedItem, FeedWithItems } from './contacts/[guid]/components/Feed'
import { InfiniteList } from '~/components/ui/infinitelist'
import { handleServerAction } from '~/util/api/client/APIClient'
import { FormattedLink } from '~/components/util/FormattedLink'
import { EnglishList } from '~/components/util/EnglishList'
import { ActivityTypeIcon } from '~/components/data/models/ActivityTypeIcon'
import { getUserTimeline } from '~/app/(authenticated)/Actions'

type Notification = {
  id: string
  type: string
  message: React.ReactNode
  details: string
  priority?: string
  time?: Date
  dueDate?: Date
  nextAction?: string
}

type Appointment = {
  guid: string
  start: Date
  end: Date
  type: TaskScheduleType
  title: string
  with: {
    name: string
    guid: string
  }[]
}

type Task = {
  guid: string
  title: string
  priority: ActivityPriority
  description: string | null
  startDate: Date
  dueDate: Date
  assignedBy: string
  with: {
    name: string
    guid: string
  }[]
}

type DashboardProps = {
  userData: {
    guid: string
    name: string
    avatar?: string
  }
  appointments: Appointment[]
  tasks: Task[]
  recentInteractions: FeedItem[]
}

export default function TodayDashboard({
  userData,
  appointments,
  tasks,
  recentInteractions
}: DashboardProps) {
  const [expandedCard, setExpandedCard] = useState<string[]>([])
  const [tileOrder, setTileOrder] = useState<string[]>([
    'appointments',
    'tasks',
    'opportunities',
    'metrics',
    'notifications',
    'contacts',
    'personalTouch'
  ])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const expandCard = (id: string) => {
    if (expandedCard.includes(id)) {
      setExpandedCard(expandedCard.filter((card) => card !== id))
    } else {
      setExpandedCard([...expandedCard, id])
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const inputDate = new Date(date)
    const diffTime = Math.abs(now.getTime() - inputDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    else if (diffDays === 1) return 'Yesterday'
    else if (diffDays < 7)
      return inputDate.toLocaleDateString('en-US', { weekday: 'long' })
    else
      return inputDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
  }

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
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
      details:
        "$1 million in new assets added this month, $200K more than last month"
    },
    {
      id: 3,
      name: "New Assets This Year",
      value: "$23M",
      change: "+15%",
      trend: "up",
      details:
        "$23 million in new assets added this year, 15% increase from last year"
    }
  ]

  const metricsData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Apr', value: 2780 },
    { name: 'May', value: 1890 },
    { name: 'Jun', value: 2390 }
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
    }
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
    }
  ]

  useEffect(() => {
    const newNotifications: Notification[] = [
      ...appointments.map((appointment) => ({
        id: `appointment-${appointment.guid}`,
        type: 'appointment',
        message: (
          <span>
            Upcoming {TaskScheduleTypeNameMapping[appointment.type]}{' '}
            with{' '}
            <EnglishList
              Component={({
                children,
                idx
              }: {
                children: React.ReactNode
                idx: number
              }) => (
                <FormattedLink href={`/contacts/${appointment.with[idx].guid}`}>
                  {children}
                </FormattedLink>
              )}
              strs={appointment.with.map((contact) => contact.name)}
            />
          </span>
        ),
        details: appointment.title,
        time: appointment.start
      })),
      ...tasks
        .filter((task) => new Date(task.dueDate) <= new Date())
        .map((task) => ({
          id: `task-${task.guid}`,
          type: 'task',
          message: `Task due: ${task.title}`,
          details: task.description ?? '',
          priority: task.priority,
          dueDate: task.dueDate
        })),
      ...opportunities.map((opportunity) => ({
        id: `opportunity-${opportunity.id}`,
        type: 'opportunity',
        message: `Opportunity update: ${opportunity.name}`,
        details: `Client: ${opportunity.client}, Value: ${opportunity.value}, Stage: ${opportunity.stage}`,
        nextAction: opportunity.nextAction
      }))
    ]
    setNotifications(newNotifications)
  }, [appointments, tasks, opportunities])

  const handleItemClick = (type: string, id: string | number) => {
    console.log(`Navigating to ${type} with id ${id}`)
  }

  const handleCall = (phone: string) => {
    console.log(`Initiating call to ${phone}`)
  }

  const handleReschedule = (id: number, duration: string) => {
    console.log(`Rescheduling client ${id} for ${duration}`)
  }

  const handleReassign = (id: number, newUser: string) => {
    console.log(`Reassigning client ${id} to ${newUser}`)
  }

  const handleQuickNote = (id: number) => {
    console.log(`Opening quick note for client ${id}`)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(tileOrder)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setTileOrder(items)
  }

  const renderTile = (id: string, idx: number, isExpanded: boolean) => {
    if (id === 'appointments') {
      return (
        <ExpandableCard
          key={id}
          idx={idx}
          id={id}
          isExpanded={isExpanded}
          expandCard={expandCard}
          title="Today's Appointments"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          expandedContent={
            <ScrollArea className="h-[400px]">
              {appointments.map((appointment) => (
                <div
                  key={appointment.guid}
                  className="mb-4 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded"
                  onClick={() => handleItemClick('appointment', appointment.guid)}
                >
                  <div className="font-semibold">
                    {formatTime(appointment.start)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {appointment.title}
                  </div>
                  <Badge>
                    <ActivityTypeIcon
                      type={appointment.type}
                      baseType={ActivityType.SCHEDULED}
                    />{' '}
                    {TaskScheduleTypeNameMapping[appointment.type]}
                  </Badge>
                  <p className="mt-2 text-sm">
                    With{' '}
                    <EnglishList
                      Component={({ children, idx }: { children: React.ReactNode; idx: number }) => (
                        <FormattedLink href={`/contacts/${appointment.with[idx].guid}`}>
                          {children}
                        </FormattedLink>
                      )}
                      strs={appointment.with.map((contact) => contact.name)}
                    />
                  </p>
                </div>
              ))}
            </ScrollArea>
          }
        >
          <ScrollArea className="h-[200px]">
            {appointments.slice(0, 3).map((appointment) => (
              <Tooltip key={appointment.guid}>
                <TooltipTrigger asChild>
                  <div
                    className="mb-4 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded"
                    onClick={() => handleItemClick('appointment', appointment.guid)}
                  >
                    <div className="font-semibold">
                      {formatTime(appointment.start)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.title}
                    </div>
                    <Badge>
                      <ActivityTypeIcon
                        type={appointment.type}
                        baseType={ActivityType.SCHEDULED}
                      />{' '}
                      {TaskScheduleTypeNameMapping[appointment.type]}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="mt-2 text-sm">
                    With{' '}
                    <EnglishList
                      Component={({ children, idx }: { children: React.ReactNode; idx: number }) => (
                        <FormattedLink href={`/contacts/${appointment.with[idx].guid}`}>
                          {children}
                        </FormattedLink>
                      )}
                      strs={appointment.with.map((contact) => contact.name)}
                    />
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </ScrollArea>
        </ExpandableCard>
      )
    }
    // (Omitted other tile cases for brevity)
    return null
  }

  resetServerContext()

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Avatar>
              {userData.avatar && (
                <AvatarImage src={userData.avatar} alt={userData.name} />
              )}
              <AvatarFallback>
                {userData.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {userData.name}
              </h1>
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
                <Badge variant="secondary">{notifications.length}</Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <ScrollArea className="h-[300px]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start mb-2 last:mb-0 cursor-pointer hover:bg-muted p-2 rounded text-sm"
                    onClick={() =>
                      handleItemClick(notification.type, notification.id)
                    }
                  >
                    {notification.type === 'appointment' && (
                      <Calendar className="h-4 w-4 mr-2 mt-1 text-blue-500" />
                    )}
                    {notification.type === 'task' && (
                      <CheckCircle className="h-4 w-4 mr-2 mt-1 text-yellow-500" />
                    )}
                    {notification.type === 'opportunity' && (
                      <DollarSign className="h-4 w-4 mr-2 mt-1 text-green-500" />
                    )}
                    <div>
                      <span className="font-medium">{notification.message}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.details}
                      </p>
                      {notification.time && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.time)} at{' '}
                          {formatTime(notification.time)}
                        </p>
                      )}
                      {notification.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(notification.dueDate)}
                        </p>
                      )}
                      {notification.nextAction && (
                        <p className="text-xs text-muted-foreground">
                          Next Action: {notification.nextAction}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tileOrder.map((id, idx) =>
              renderTile(id, idx, expandedCard.includes(id))
            )}
          </div>
        </DragDropContext>
      </div>
    </TooltipProvider>
  )
}

// Using inline "any" types for Droppable and Draggable render callbacks to satisfy TS.
const ExpandableCard = ({
  id,
  title,
  icon,
  children,
  expandedContent,
  idx,
  isExpanded,
  expandCard
}: {
  id: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  expandedContent: React.ReactNode
  idx: number
  isExpanded: boolean
  expandCard: (id: string) => void
}) => {
  return (
    <Droppable
      droppableId={id}
      isDropDisabled={false}
      isCombineEnabled={false}
      ignoreContainerClipping={false}
    >
      {(provided: any, snapshot: any) => {
        const isBeingDragged =
          (snapshot.isDraggingOver && snapshot.draggingOverWith === id) ||
          snapshot.draggingFromThisWith === id
        const content = (
          <>
            {snapshot.isDraggingOver &&
              snapshot.draggingOverWith !== id &&
              snapshot.draggingFromThisWith !== id && <div />}
            <div {...provided.droppableProps} ref={provided.innerRef}>
              <Draggable draggableId={id} index={idx}>
                {(providedDraggable: any, snapshotDraggable: any) => {
                  const props = { ...providedDraggable.draggableProps }
                  if (props.style?.transform && !snapshotDraggable.isDragging) {
                    props.style.transform = ''
                  }
                  return (
                    <div ref={providedDraggable.innerRef} {...providedDraggable.draggableProps}>
                      <motion.div
                        whileHover={{ scale: isExpanded ? 1 : 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className={`${isExpanded ? 'col-span-full' : ''}`}
                      >
                        <Card className="h-full">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                              {title}
                            </CardTitle>
                            {icon}
                            <div className="flex items-center">
                              <Button variant="ghost" size="sm" onClick={() => expandCard(id)}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <div {...providedDraggable.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <AnimatePresence>
                              {isExpanded ? (
                                <motion.div
                                  key="expanded"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {expandedContent}
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="collapsed"
                                  initial={{ opacity: 1 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0 }}
                                >
                                  {children}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  )
                }}
              </Draggable>
              {provided.placeholder}
            </div>
          </>
        )
        return isBeingDragged ? createPortal(content, document.body) : content
      }}
    </Droppable>
  )
}

function UserFeed({ initialItems, userId }: { initialItems: FeedItem[]; userId: string }) {
  const COUNT = 5
  const _items = [...initialItems]
  return (
    <div className="space-y-4">
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          <InfiniteList<FeedItem>
            dataBefore={_items}
            listKey={`feed-${userId}`}
            load={async (offset) => {
              const result = handleServerAction(await getUserTimeline(offset + _items.length, COUNT))
              if (!result.success || result.result == null) {
                throw new Error(`Error loading notes: ${result.message}`)
              }
              return result.result
            }}
            render={(item, idx, count) => (
              <li key={item.guid}>
                <FeedItem
                  feedItem={item}
                  idx={idx}
                  length={count}
                  includeActivityDetails={false}
                  includeOpportunityDetails={false}
                />
              </li>
            )}
            noData={() => <></>}
            className="h-[400px]"
            viewportClassName="p-4"
          />
        </ul>
      </div>
    </div>
  )
}

export { TodayDashboard }
