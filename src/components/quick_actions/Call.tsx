import React, {useEffect, useState} from 'react'
import {Dialog, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog"
import {Button} from "~/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card"
import {Label} from "~/components/ui/label"
import {Textarea} from "~/components/ui/textarea"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Clock, MapPin, Phone, PhoneIncoming, PhoneOutgoing} from 'lucide-react'
import {differenceInDays, format} from "date-fns";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {handleServerAction} from "~/util/api/client/APIClient";
import {fetchEvents} from "~/app/(authenticated)/calendar/Actions";
import {Skeleton} from "~/components/ui/skeleton";
import {ScrollArea} from "~/components/ui/scroll-area";
import {ActivityTypeIcon} from "~/components/data/models/ActivityTypeIcon";
import {toast} from 'sonner'
import {DialogPage, PagedDialogContent, PagedDialogFooter, RenderOnPage} from "~/components/form/PagedDialog";
import {formatPhoneNumber, isEmptyString} from "~/util/strings";
import {completeCall, setUpFollowUp} from "~/components/quick_actions/Actions";
import classNames from "classnames";
import {FormField} from "~/components/form/FormUtils";
import {DatePicker} from "~/components/ui/date-picker";
import {Input} from '../ui/input'
import {motion} from "framer-motion";
import {Badge} from "~/components/ui/badge";

type CallDialogProps = {
    trigger?: React.ReactNode,
    isOpen?: boolean
    setOpen?: (open: boolean) => void
    contact: {
        guid: string
        name: string
        phone: string
        tz: string | null,
        city: string | null,
        state: string | null,
        country: string | null
    }
}

function DurationSelector({setDuration, selectedDuration}: {
    setDuration: (duration: number) => void,
    selectedDuration: number | null,
}) {
    type Duration = {
        duration: number,
        label: string
    }
    const durations: Duration[] = [
        {duration: 1, label: 'Tomorrow'},
        {duration: 2, label: '2 days from now'},
        {duration: 3, label: '3 days from now'},
        {duration: 7, label: 'In a week'},
    ]

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
                        selectedDuration === duration.duration ? 'bg-blue-500 text-white font-bold' : ''
                    }`}
                    onClick={() => setDuration(duration.duration)}
                >
                    {duration.label}
                </Badge>
            </motion.div>
        ))}
    </div>

}

export default function CallQuickAction({
                                            trigger,
                                            isOpen: externalIsOpen,
                                            setOpen: externalSetOpen,
                                            contact
                                        }: CallDialogProps) {
    const [isOpen, setIsOpen] = useState(externalIsOpen)
    const [callDuration, setCallDuration] = useState(0)
    const [notes, setNotes] = useState('')
    const [callOutcome, setCallOutcome] = useState('')
    const [localTime, setLocalTime] = useState('')

    const [type, setType] = useState<'outbound' | 'inbound'>('outbound')

    const [view, setView] = useState<string>('startCall'); // startCall, inProgress, followUp

    const [followUpTitle, setFollowUpTitle] = useState('Follow-up for quick call')
    const [duration, setDuration] = useState<number | null>(1)

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [followUpDate, setFollowUpDate] = useState<Date>(tomorrow)
    // const [followUpEndDate, setFollowUpEndDate] = useState<Date>() // Time of the end of the follow up

    useEffect(() => {
        if (duration == null) return;
        const day = new Date();
        day.setDate(day.getDate() + duration);
        setFollowUpDate(day);
    }, [duration]);

    useEffect(() => {
        if (followUpDate == null) return;
        const today = new Date();
        const diff = differenceInDays(followUpDate, today) + 1;
        if ([1, 2, 3, 7].includes(diff)) {
            if (duration != diff) {
                setDuration(diff);
            }
        } else {
            setDuration(null)
        }
    }, [followUpDate])

    const [notePrelude, setNotePrelude] = useState('')

    useEffect(() => {
        setIsOpen(externalIsOpen);
    }, [externalIsOpen]);

    const handleSetOpen = (open: boolean) => {
        if (externalSetOpen) {
            externalSetOpen(open);
        }
        setIsOpen(open);
    }

    useEffect(() => {
        if (!isOpen) {
            // Reset the form
            setNotes('')
            setCallDuration(0)
            setFollowUpDate(tomorrow)
            setDuration(0)
            setView('startCall')
            setLocalTime('')
            setCallOutcome('')
            setType('outbound')
        }
    }, [isOpen])

    useEffect(() => {
        if (contact.tz == null) {
            setLocalTime(`Could not determine ${contact.name}'s timezone`)
            return
        }

        const interval = setInterval(() => {
            setLocalTime(new Date().toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                timeZone: contact.tz!
            }))
        }, 1000)

        return () => clearInterval(interval)
    }, [contact.name, contact.tz])

    useEffect(() => {
        if (view === 'inProgress') {
            const interval = setInterval(() => {
                setCallDuration(current => current + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [view]);

    const queryClient = useQueryClient()

    const {data: appointments, isLoading, isError} = useQuery({
        queryKey: ['contact-appointments', contact.guid],
        queryFn: async () => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);

            const end = new Date();
            end.setHours(23, 59, 59, 999);
            end.setMonth(end.getMonth() + 1);

            const result = handleServerAction(await fetchEvents(start, end));

            if (!result.success) {
                throw new Error(`Error fetching appointments: ${result.message}`);
            }

            return result.result;
        },
        enabled: isOpen
    })

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const handleCallOutcome = (outcome: string) => {
        setCallOutcome(outcome)
        // Here you would typically save the call details to your CRM system

        const getFormattedDuration = () => {
            const seconds = callDuration % 60
            const mins = Math.floor(callDuration / 60)
            const hours = Math.floor(mins / 60)

            if (hours === 0) {
                return `${mins}m ${seconds}s`
            } else {
                return `${hours}h ${mins}m`
            }
        }

        if (type === 'inbound' && outcome === 'left-voicemail') {
            toast.warning('Are you sure this is an inbound call? The client should only leave a voicemail on an outbound call.')
            return
        }

        switch (outcome) {
            case 'end':
                setNotes(prev => {
                    const duration = getFormattedDuration()
                    const prelude = `${type === 'outbound' ? 'Outbound' : 'Inbound'} call with ${contact.name} lasted ${duration}.`
                    setNotePrelude(prelude)
                    if (isEmptyString(prev)) {
                        return prelude
                    } else if (!isEmptyString(notePrelude)) {
                        if (notePrelude.includes(`${type === 'outbound' ? 'Outbound' : 'Inbound'} call with ${contact.name} lasted`)) {
                            return `${prelude}\n${prev.replace(notePrelude + '\n', '').replace(notePrelude, '')}`
                        }
                        return `${prelude}\n${prev.replace(notePrelude + '\n', '').replace(notePrelude, '')}`
                    } else {
                        return `${prelude}.\n${prev}`
                    }
                })
                break;

            case 'left-voicemail':
                setNotes(prev => {
                    setNotePrelude(`Call with ${contact.name} went to voicemail.`)
                    if (prev.trim() === '') {
                        return `Call with ${contact.name} went to voicemail.`
                    }
                    if (!isEmptyString(notePrelude)) {
                        if (notePrelude.includes(`$Call with ${contact.name} went to voicemail.`)) {
                            return prev
                        } else {
                            return `Call with ${contact.name} went to voicemail.\n${prev.replace(notePrelude + '\n', '').replace(notePrelude, '')}`
                        }
                    } else {
                        return `Call with ${contact.name} went to voicemail.\n${prev}`
                    }
                })
        }
    }

    // const handleTryAgainLater = () => {
    //     // Here you would typically create a new call task for the next day
    //     handleSetOpen(false)
    // }

    let finalTrigger = trigger
    if (trigger === undefined) {
        finalTrigger = <Button variant="outline" className="w-full justify-start">
            <Phone className="mr-2 h-4 w-4"/> Call
        </Button>
    }

    let addr = [contact.city, contact.state, contact.country].filter(str => !isEmptyString(str)).join(', ')
    if (addr === '') {
        addr = 'Unspecified'
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleSetOpen}>
            {finalTrigger !== null && <DialogTrigger asChild>
                {finalTrigger}
            </DialogTrigger>}
            <PagedDialogContent
                page={view}
                setPage={setView}
                className="sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle
                        className="text-xl md:text-2xl">{view !== 'followUp' ? 'Call with ' + contact.name : 'Set up a follow-up call with ' + contact.name}</DialogTitle>
                </DialogHeader>

                <DialogPage page="startCall" height="850px">
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TooltipProvider delayDuration={0}>
                                <div className="flex items-center space-x-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Phone className="h-4 w-4 text-muted-foreground"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Phone Number</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="font-medium">{contact.phone}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <MapPin className="h-4 w-4 text-muted-foreground"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Location</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span>{addr}</span>
                                </div>
                            </TooltipProvider>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground"/>
                            <span>Local Time: {localTime}</span>
                        </div>

                        <div className="flex space-x-4">
                            <motion.div
                                whileHover={{scale: 1.05}}
                                whileTap={{scale: 0.95}}
                                className="flex-1"
                            >
                                <Button
                                    type="button"
                                    variant={type === 'outbound' ? "default" : "outline"}
                                    className={`w-full ${type === 'outbound' ? "bg-blue-500 dark:bg-blue-700 dark:text-white" : ""}`}
                                    onClick={() => {
                                        setType('outbound')
                                    }}
                                >
                                    <PhoneOutgoing className="mr-2 h-4 w-4"/>
                                    Outbound
                                </Button>
                            </motion.div>

                            <motion.div
                                whileHover={{scale: 1.05}}
                                whileTap={{scale: 0.95}}
                                className="flex-1"
                            >
                                <Button
                                    type="button"
                                    variant={type === 'inbound' ? "default" : "outline"}
                                    className={`w-full ${type === 'inbound' ? "bg-emerald-500 dark:bg-emerald-700 dark:text-white" : ""}`}
                                    onClick={() => {
                                        setType('inbound')
                                    }}
                                >
                                    <PhoneIncoming className="mr-2 h-4 w-4"/>
                                    Inbound
                                </Button>
                            </motion.div>
                        </div>

                        {(appointments && !isError) && (
                            <RenderOnPage>
                                <Card className="mt-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Upcoming Appointment</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className={'h-[400px]'}>
                                            <div className={'space-y-4'}>
                                                {appointments.map(appointment => {
                                                    return <div className="space-y-2" key={appointment.guid}>
                                                        <div className={'flex items-center '}>
                                                            <ActivityTypeIcon type={appointment.type} baseType={appointment.baseType}/>
                                                            <p className="text-sm font-medium">{appointment.title}</p>
                                                        </div>
                                                        <span
                                                            className="text-sm text-muted-foreground">{format(appointment.start, 'PPpp')} - {format(appointment.end, 'pp')}</span>
                                                    </div>
                                                })}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </RenderOnPage>
                        )}
                        {isLoading && <Skeleton className={'h-32 w-full'}/>}
                    </div>
                </DialogPage>
                <DialogPage page="inProgress" height="450px">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground"/>
                        <span>Duration: {formatDuration(callDuration)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground"/>
                        <span>Local Time: {localTime}</span>
                    </div>
                    <div className="space-y-2 my-4">
                        <Label htmlFor="notes">Call Outcome</Label>
                        <Select onValueChange={handleCallOutcome} value={callOutcome}>
                            <SelectTrigger className="w-full mt-4">
                                <SelectValue placeholder="Unspecified"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="end">End Call</SelectItem>
                                <SelectItem value="left-voicemail">End Call - Left Voicemail</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 my-4">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter call notes here..."
                            className="min-h-[100px] resize-none"
                        />
                    </div>
                </DialogPage>
                <DialogPage page={'followUp'} height="570px">
                    <div className={'space-y-4'}>
                        {view === 'followUp' && <FormField label={'Finalize Notes'} htmlFor="notes" grid={false}>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Finalize notes if needed..."
                                className="min-h-[100px] resize-none"
                            />
                        </FormField>}
                        <div className="!my-8 border-t"/>
                        <FormField label={'Title'} htmlFor="followUpTitle" grid={false}>
                            <Input
                                id="followUpTitle"
                                value={followUpTitle}
                                onChange={(e) => setFollowUpTitle(e.target.value)}
                                placeholder="Enter follow-up title..."
                            />
                        </FormField>
                        <FormField label={'Follow-up Date'} htmlFor="followUpDate" grid={false}>
                            <DatePicker
                                id="followUpDate"
                                date={followUpDate}
                                setDate={(date) => {
                                    if (!date) return;
                                    setFollowUpDate(date)
                                    // if (followUpDate && date) {
                                    //     setFollowUpDate(prev => {
                                    //         const _date = new Date(prev!);
                                    //         _date.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                    //         return _date;
                                    //     })
                                    //     setFollowUpEndDate(prev => {
                                    //         const _date = new Date(prev!);
                                    //         _date.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                    //         return _date;
                                    //     })
                                    // } else if (date && followUpDate == null) {
                                    //     const _date = new Date(date);
                                    //     _date.setHours(12, 0, 0, 0);
                                    //     setFollowUpDate(_date)
                                    //     setFollowUpEndDate(_date)
                                    // }
                                }}
                            />
                        </FormField>
                        <DurationSelector setDuration={setDuration} selectedDuration={duration}/>
                        {/*{followUpDate != null && (*/}
                        {/*    <div className="grid grid-cols-2 gap-4">*/}
                        {/*        <FormField className={'w-fit'} label={'Start Time'} htmlFor="followUpEndDate" grid={false}>*/}
                        {/*            <TimePicker*/}
                        {/*                id="followUpStartTime"*/}
                        {/*                date={followUpDate}*/}
                        {/*                onChange={(date) => setFollowUpDate(date)}*/}
                        {/*                granularity={'minute'}*/}
                        {/*                hourCycle={12}*/}
                        {/*            />*/}
                        {/*        </FormField>*/}
                        {/*        <FormField className={'w-fit'} label={'End Time'} htmlFor="followUpEndDate" grid={false}>*/}
                        {/*            <TimePicker*/}
                        {/*                id="followUpEndTime"*/}
                        {/*                date={followUpEndDate}*/}
                        {/*                onChange={(date) => setFollowUpEndDate(date)}*/}
                        {/*                granularity={'minute'}*/}
                        {/*                hourCycle={12}*/}
                        {/*            />*/}
                        {/*        </FormField>*/}
                        {/*    </div>*/}
                        {/*)}*/}
                    </div>
                </DialogPage>

                <PagedDialogFooter>
                    <div className="flex sm:flex-row gap-2 w-full sm:w-auto">
                        {(view === 'startCall' || view === 'followUp') && <Button variant="destructive" onClick={() => handleSetOpen(false)}
                                                                                  className="w-full sm:w-auto">
                            Cancel
                        </Button>}
                        {(view === 'inProgress' || view === 'followUp') && <Button variant="outline" onClick={() => {
                            if (view === 'followUp') {
                                setView('inProgress')
                            } else setView('startCall')
                        }} className="w-full sm:w-auto">
                            Back
                        </Button>}
                        {view === 'inProgress' && <Button variant="linkHover2" onClick={async () => {
                            if (isEmptyString(notes)) {
                                toast.error('Please enter a note')
                                return
                            }

                            const result = handleServerAction(await completeCall(contact.guid, notes, type));

                            if (result.success) {
                                await queryClient.invalidateQueries({
                                    queryKey: ['feed']
                                })
                                handleSetOpen(false)
                            }
                        }} className="w-full sm:w-auto force-border">
                            Complete
                        </Button>}
                        <Button onClick={async () => {
                            if (view === 'followUp') {
                                if (isEmptyString(notes)) {
                                    toast.error('Please enter a note')
                                    return
                                }

                                if (isEmptyString(followUpTitle)) {
                                    toast.error('Please enter a title')
                                    return
                                }

                                if (followUpDate == null) {
                                    toast.error('Please select a follow-up date')
                                    return
                                }

                                const result = handleServerAction(await setUpFollowUp(contact.guid,
                                    formatPhoneNumber(contact.phone) ?? '', notes, type, followUpTitle, followUpDate, followUpDate));

                                if (result.success) {
                                    await queryClient.invalidateQueries({
                                        queryKey: ['feed']
                                    })
                                    handleSetOpen(false)
                                }
                            } else if (view === 'inProgress') {
                                if (isEmptyString(notes)) {
                                    toast.error('Please enter a note')
                                    return
                                }

                                setView('followUp')
                            } else {
                                setView('inProgress')
                            }
                        }} variant={'linkHover2'} className={classNames("w-full sm:w-auto force-border", {
                            'after:w-4/5': view === 'inProgress',
                        })}>
                            {view === 'startCall' && 'Begin Call'}
                            {view === 'inProgress' && 'Complete + Follow-up'}
                            {view === 'followUp' && 'Finalize'}
                        </Button>
                    </div>
                </PagedDialogFooter>
            </PagedDialogContent>
        </Dialog>
    )
}