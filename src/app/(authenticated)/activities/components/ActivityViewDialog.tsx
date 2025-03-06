"use client"

import React, {useEffect, useState} from "react"

import {Button} from "~/components/ui/button"
import {Checkbox} from "~/components/ui/checkbox"
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog"
import {Input} from "~/components/ui/input"
import {Label} from "~/components/ui/label"
import {ScrollArea} from "~/components/ui/scroll-area"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Textarea} from "~/components/ui/textarea"
import {DatePicker} from "~/components/ui/date-picker";
import {DateTimePicker} from "~/components/ui/datetime-picker";
import {handleServerAction} from "~/util/api/client/APIClient";
import {readContact, readUser} from "~/common/actions/read"
import {ClientSideReadResult} from "~/db/sql/types/utility";
import {
    ActivityPriority,
    ActivityPriorityNameMapping,
    ActivityStatus,
    ActivityStatusNameMapping,
    ActivityType,
    TaskScheduleType,
    TaskScheduleTypeNameMapping
} from "~/common/enum/enumerations";
import {createActivity, createNote, getActivity, updateActivity} from "~/app/(authenticated)/activities/Actions";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {UserPicker} from "~/components/data/pickers/UserPicker"
import {ContactPicker} from "~/components/data/pickers/ContactPicker"
import SkeletonForm from "~/components/util/SkeletonForm";
import {RequiredDate, RequiredString, Validation} from "~/components/data/ValidationProvider";
import {toast} from "sonner";
import {isEmptyString} from "~/util/strings";
import {useValidation} from "~/hooks/use-validation";
import {invalidDate} from "~/util/db/validation";
import {useStateRef} from "~/hooks/use-state-ref";
import {FormField} from "~/components/form/FormUtils";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {ActivityTimelineFeed, ClientActivity} from "~/app/(authenticated)/activities/ActivityForm";

export declare type ActivityDialogProps = {
    type: ActivityType,
    canModifyType?: boolean,
    trigger: React.ReactNode,
    toLoad?: string,
    activity?: ClientActivity,
    onSuccess?: (activity: ClientActivity) => Promise<void>
    open?: boolean
    setOpen?: (open: boolean) => void
}

export default function ActivityDialog({
                                           type,
                                           canModifyType = true,
                                           trigger,
                                           toLoad,
                                           activity: initialActivity,
                                           onSuccess,
                                           open: externalOpen,
                                           setOpen: externalSetOpen
                                       }: ActivityDialogProps) {
    type ContactReadResult = ClientSideReadResult<typeof readContact<['fullName', 'primaryEmail', 'type']>>
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

    const activityRef = useStateRef(activity);

    const validatedElements = new Set<string>(['title', 'status', 'priority', 'startDate', 'endDate', 'taskType', 'users', 'contacts'])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target
        setActivity(prev => ({...prev, [name]: value}))

        if (validatedElements.has(name)) {
            resetValidation(name)
        }
    }

    const [isOpen, setIsOpen] = useState(false)

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

    // const [taskTemplate, setTaskTemplate] = useState("")
    // const [taskSteps, setTaskSteps] = useState([
    //     {id: 1, description: "Initial consultation", completed: false},
    //     {id: 2, description: "Gather financial documents", completed: false},
    //     {id: 3, description: "Analyze current portfolio", completed: false},
    // ])
    const [addToCalendar, setAddToCalendar] = useState(type === ActivityType.SCHEDULED)

    // Initial set of notes to create for this activity
    const [initialNotes, setInitialNotes] = useState('')

    const [newEvents, setNewEvents] = useState<FeedItem[]>([])

    useEffect(() => {
        if (initialActivity) {
            setActivity(initialActivity)
            setAddToCalendar(initialActivity.type === ActivityType.SCHEDULED)
        }
    }, [initialActivity])

    const {validate, resetValidation} = useValidation()

    const queryClient = useQueryClient()

    // const [taskArchitecture, setTaskArchitecture] = useState<'flow' | 'single' | ''>("")

    // const handleAddStep = () => {
    //     const newId = taskSteps.length + 1
    //     setTaskSteps([...taskSteps, {id: newId, description: "", completed: false}])
    // }

    // const handleRemoveStep = (id: number) => {
    //     setTaskSteps(taskSteps.filter(step => step.id !== id))
    // }

    // const handleStepChange = (id: number, field: "description" | "completed", value: string | boolean) => {
    //     setTaskSteps(taskSteps.map(step =>
    //         step.id === id ? {...step, [field]: value} : step
    //     ))
    // }

    // const handleTemplateChange = (value: string) => {
    //     setTaskTemplate(value)
    //     const selectedTemplate = taskTemplates.find(template => template.value === value)
    //     if (selectedTemplate) {
    //         setTaskSteps(selectedTemplate.steps)
    //         setDescription(selectedTemplate.description)
    //     }
    // }

    const handleSave = async () => {
        // In a real application, this would save the task to the database

        const validation = validate()
        if (!validation) {
            toast.error('Please fix the errors in your input')
            return
        }

        if (isNew) {
            const result = handleServerAction(await createActivity(activity, initialNotes));
            if (result.success) {
                _setOpen(false)
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: ['taskTable']
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
                        queryKey: ['taskTable']
                    }),
                    onSuccess?.(activity)
                ])
            }
        }
    }

    const {isLoading, error, isError} = useQuery({
        queryKey: ['task', toLoad],
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
                setAddToCalendar(activity.type === ActivityType.SCHEDULED)

                return 'success'
            }
            return 'noload'
        },
        enabled: toLoad != null && isOpen
    })

    useEffect(() => {
        if (invalidDate(activity.endDate) && activity.startDate) {
            setActivity(prev => ({...prev, endDate: prev.startDate}))
        }
    }, [activity.startDate])

    const isNew = activity.guid == null && toLoad == null;
    const showCalendarCheckBox = activity.type === ActivityType.SCHEDULED && canModifyType

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
        setNewEvents(prev => [note, ...prev])
    }

    let form = (<>
        <div className="grid gap-4 py-4">
            <FormField label={'Title'} htmlFor={'title'} required={true}>
                <Input
                    id="title"
                    name="title"
                    value={activity.title}
                    onChange={handleInputChange}
                    placeholder="Enter task title..."
                />
                <RequiredString element={'title'} friendlyName={'Title'} value={activity.title} render={(value) => {
                    return <>
                        <div/>
                        <p className={'text-red-500 col-span-3'}>{value}</p>
                    </>
                }}/>
            </FormField>
            <FormField label={'Description'} htmlFor={'description'}>
                <Input
                    id="description"
                    name="description"
                    value={activity.description ?? ''}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Enter task description..."
                />
            </FormField>
            <FormField label={'Location'} htmlFor={'location'}>
                <Input
                    id="location"
                    name="location"
                    value={activity.location ?? ''}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Enter task location..."
                />
            </FormField>
            {/*<div className="grid grid-cols-4 items-start gap-4" id="task-architecture">*/}
            {/*    <Label htmlFor="task-architecture" className="text-right">*/}
            {/*        Task Architecture*/}
            {/*    </Label>*/}
            {/*    <RadioGroup value={taskArchitecture}*/}
            {/*                onValueChange={(value) => setTaskArchitecture(value as 'flow' | 'single')}>*/}
            {/*        <div className="flex items-center space-x-2">*/}
            {/*            <RadioGroupItem value="flow" id="r1"/>*/}
            {/*            <Label htmlFor="r1">Flow</Label>*/}
            {/*        </div>*/}
            {/*        <div className="flex items-center space-x-2">*/}
            {/*            <RadioGroupItem value="single" id="r2"/>*/}
            {/*            <Label htmlFor="r2">Single</Label>*/}
            {/*        </div>*/}
            {/*    </RadioGroup>*/}
            {/*</div>*/}
            {/*{taskArchitecture === 'flow' && <div className="grid grid-cols-4 items-center gap-4">*/}
            {/*    <Label htmlFor="task-template" className="text-right">*/}
            {/*        Flow Template*/}
            {/*    </Label>*/}
            {/*    <Select value={taskTemplate} onValueChange={handleTemplateChange}>*/}
            {/*        <SelectTrigger id="task-template" className="col-span-3">*/}
            {/*            <SelectValue placeholder="Select flow template"/>*/}
            {/*        </SelectTrigger>*/}
            {/*        <SelectContent>*/}
            {/*            {taskTemplates.map((template) => (*/}
            {/*                <SelectItem key={template.value} value={template.value}>*/}
            {/*                    {template.label}*/}
            {/*                </SelectItem>*/}
            {/*            ))}*/}
            {/*        </SelectContent>*/}
            {/*    </Select>*/}
            {/*</div>}*/}
            {/*{(taskTemplate && taskArchitecture === 'flow') && (*/}
            {/*    <div className="grid grid-cols-4 items-center gap-4">*/}
            {/*        <div className="col-start-2 col-span-3 text-sm text-muted-foreground">*/}
            {/*            {taskTemplates.find(t => t.value === taskTemplate)?.description}*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*)}*/}
            {/*{taskArchitecture === 'single' &&*/ <FormField label={'Activity Type'} htmlFor={'activity-type'}
                                                              required={true}>
                <Select value={activity.subType ?? ''} onValueChange={(value) => {
                    setActivity(prev => ({...prev, subType: value as TaskScheduleType}))
                    resetValidation('activity-type')
                }}>
                    <SelectTrigger id="activity-type">
                        <SelectValue placeholder="Select activity type"/>
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(TaskScheduleTypeNameMapping).map((type) => (
                            <SelectItem key={type} value={type}>
                                {TaskScheduleTypeNameMapping[type as TaskScheduleType]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <RequiredString element={'activity-type'} friendlyName={'Activity Type'} value={activity.subType}
                                render={(value) => {
                                    return <>
                                        <div/>
                                        <p className={'text-red-500 col-span-3'}>{value}</p>
                                    </>
                                }}/>
            </FormField>}
            <FormField label={'For'} htmlFor={'contacts'} required={true}>
                <ContactPicker className={'col-span-3'} id={'contacts'} multi value={activity.contacts}
                               dialog
                               onValueChange={(contacts) => {
                                   setActivity(prev => ({...prev, contacts}))
                                   resetValidation('contacts')
                               }}/>
                <Validation value={activity.contacts} validator={(value: ContactReadResult[]) => {
                    if (value.length === 0) {
                        return 'Please select at least one contact'
                    }
                    return true
                }} element={'contacts'} render={(value) => (<>
                    <div/>
                    <p className={'text-red-500 col-span-3'}>{value}</p>
                </>)}/>
            </FormField>
            <FormField label={'Assigned To'} htmlFor={'assignedTo'} required={true}>
                <UserPicker className={'col-span-3'} id={'assignedTo'} multi value={activity.users}
                            dialog
                            onValueChange={(users) => {
                                setActivity(prev => ({...prev, users}))
                                resetValidation('users')
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
            {/*{taskArchitecture === 'single' &&*/}
            {showCalendarCheckBox &&
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-to-calendar" className="text-right">
                        Add to Calendar
                    </Label>
                    <div className="col-span-3 flex items-center space-x-2">
                        <Checkbox
                            id="add-to-calendar"
                            checked={addToCalendar}
                            onCheckedChange={(checked) => {
                                if (canModifyType) {
                                    setActivity(prev => ({
                                        ...prev,
                                        type: checked ? ActivityType.SCHEDULED : ActivityType.TASK
                                    }))
                                    setAddToCalendar(checked as boolean)
                                }
                            }}
                        />
                        <Label htmlFor="add-to-calendar">Add to Calendar</Label>
                    </div>
                </div>}
            {/*{taskArchitecture === 'single' &&*/ <FormField label={'Start Date'} htmlFor={'startDate'}
                                                              required={true}>
                {addToCalendar
                    ? <DateTimePicker className={'col-span-3'} id={'startDate'} value={activity.startDate ?? undefined}
                                      onChange={(date) => {
                                          setActivity(prev => ({...prev, startDate: date ?? null}))
                                      }} placeholder={'Pick a date and time'}/>
                    :
                    <DatePicker className={'col-span-3'} id={'startDate'}
                                date={activity.startDate ?? undefined}
                                setDate={(date) => {
                                               setActivity(prev => ({...prev, startDate: date ?? null}))
                                           }}/>}
                <Validation value={activity.startDate} validator={(value) => {
                    if (value == null) {
                        return 'Please select a start date'
                    }
                    if (invalidDate(value)) {
                        return 'Invalid date'
                    }
                    if (activityRef.current.endDate && value.getTime() > activityRef.current.endDate.getTime()) {
                        return 'Start date must be before due date'
                    }
                    return true
                }} element={'startDate'} render={(value) => {
                    return <>
                        <div/>
                        <p className={'text-red-500 col-span-3'}>{value}</p>
                    </>
                }}/>
            </FormField>}
            {/*{taskArchitecture === 'single' &&*/ <FormField label={'Due Date'} htmlFor={'endDate'} required={true}>
                {addToCalendar
                    ? <DateTimePicker
                        className={'col-span-3'} id={'endDate'}
                        value={activity.endDate ?? undefined} onChange={(date) => {
                        setActivity(prev => ({...prev, endDate: date ?? null}))
                        resetValidation('endDate')
                    }} placeholder={'Pick a date and time'}/>
                    : <DatePicker
                        className={'col-span-3'} id={'endDate'}
                        date={activity.endDate ?? undefined} setDate={(date) => {
                        setActivity(prev => ({...prev, endDate: date ?? null}))
                        resetValidation('endDate')
                    }}/>}
                <RequiredDate element={'endDate'} value={activity.endDate} render={(value) => {
                    return <>
                        <div/>
                        <p className={'text-red-500 col-span-3'}>{value}</p>
                    </>
                }}/>
            </FormField>}
            {/*{taskArchitecture === 'flow' && <div className="grid grid-cols-4 items-start gap-4">*/}
            {/*    <Label htmlFor="steps" className="text-right pt-2">*/}
            {/*        Task Steps*/}
            {/*    </Label>*/}
            {/*    <div className="col-span-3 space-y-2">*/}
            {/*        <Button*/}
            {/*            variant="outline"*/}
            {/*            size="sm"*/}
            {/*            onClick={() => setIsStepsExpanded(!isStepsExpanded)}*/}
            {/*            className="w-full justify-between"*/}
            {/*        >*/}
            {/*            {isStepsExpanded ? "Collapse Steps" : "Expand Steps"}*/}
            {/*            {isStepsExpanded ? <ChevronUp className="h-4 w-4"/> :*/}
            {/*                <ChevronDown className="h-4 w-4"/>}*/}
            {/*        </Button>*/}
            {/*        {isStepsExpanded && (*/}
            {/*            <>*/}
            {/*                {taskSteps.map((step) => (*/}
            {/*                    <div key={step.id} className="flex items-center space-x-2">*/}
            {/*                        <Checkbox*/}
            {/*                            id={`step-${step.id}`}*/}
            {/*                            checked={step.completed}*/}
            {/*                            onCheckedChange={(checked) => handleStepChange(step.id, "completed", checked)}*/}
            {/*                        />*/}
            {/*                        <Input*/}
            {/*                            value={step.description}*/}
            {/*                            onChange={(e) => handleStepChange(step.id, "description", e.target.value)}*/}
            {/*                            placeholder="Enter step description"*/}
            {/*                        />*/}
            {/*                        <Button*/}
            {/*                            variant="ghost"*/}
            {/*                            size="icon"*/}
            {/*                            onClick={() => handleRemoveStep(step.id)}*/}
            {/*                        >*/}
            {/*                            <X className="h-4 w-4"/>*/}
            {/*                        </Button>*/}
            {/*                    </div>*/}
            {/*                ))}*/}
            {/*                <Button variant="outline" size="sm" onClick={handleAddStep}>*/}
            {/*                    <Plus className="mr-2 h-4 w-4"/>*/}
            {/*                    Add Step*/}
            {/*                </Button>*/}
            {/*            </>*/}
            {/*        )}*/}
            {/*    </div>*/}
            {/*</div>}*/}

            <FormField label={'Status'} htmlFor={'status'} required={true}>
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

            <FormField label={'Priority'} htmlFor={'priority'} required={true}>
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
        <div>
            {!isNew && <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2 font-bold">
                    Notes
                </Label>
                <div className={'col-span-3'}>
                    <div className={'w-full mb-4'}>
                        <div className="grid grid-cols-4 items-start gap-4">
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
                        <ActivityTimelineFeed newItems={newEvents} activityId={activity.guid}
                                              initialItems={activity.events}/>}
                </div>
            </div>}

            {isNew && <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">
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
    </>)

    if (isLoading) {
        form = <SkeletonForm>
            {form}
        </SkeletonForm>
    } else if (error && isError) {
        form = <div className="text-red-500">Error loading task: {(error as Error).message}</div>
    }

    const itemName = addToCalendar ? 'Scheduled Item' : 'Task'

    return (
        <Dialog open={isOpen} onOpenChange={_setOpen}>
            {trigger != null && <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>}

            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>{isNew ? `${addToCalendar ? 'Schedule Something' : 'Add a Task'}` : `Update ${itemName}`}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh] overflow-y-auto pr-4">
                    {form}
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => _setOpen(false)}>Cancel</Button>
                    {/*{taskArchitecture === 'single' &&*/ <Button
                        onClick={handleSave}>{isNew ? 'Create' : 'Update'}</Button>}
                    {/*{taskArchitecture === 'flow' && <Button onClick={() => setPage('stepConfiguration')}>*/}
                    {/*    Configure Steps*/}
                    {/*</Button>}*/}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}