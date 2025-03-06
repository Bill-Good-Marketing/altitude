'use client'

import React, {HTMLAttributes, useEffect, useState} from 'react'
import {Button} from "~/components/ui/button"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog"
import {Input} from "~/components/ui/input"
import {Label} from "~/components/ui/label"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "~/components/ui/tabs"
import {ScrollArea} from "~/components/ui/scroll-area"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Calendar} from "~/components/ui/calendar"
import {Popover, PopoverContent, PopoverTrigger} from "~/components/ui/popover"
import {Checkbox} from "~/components/ui/checkbox"
import {cn} from "~/lib/utils"
import {format} from "date-fns"
import {Calendar as CalendarIcon, Eye, Mail, Plus, Search} from 'lucide-react'
import {ContactPicker, ContactReadResult} from "~/components/data/pickers/ContactPicker";
import {WYSIWYG} from "~/components/form/WYSIWYG";
import classNames from "classnames";
import {FormField} from '../form/FormUtils'
import { toast } from 'sonner'

const templates = [
    {
        id: 1,
        name: "Welcome Email",
        subject: "Welcome to Our Service!",
        content: "<p>Dear [First Name],</p><p>Welcome to our service! We're excited to have you on board.</p>"
    },
    {
        id: 2,
        name: "Follow-up Meeting",
        subject: "Follow-up: Our Recent Meeting",
        content: "<p>Hello [First Name],</p><p>Thank you for taking the time to meet with us. Here's a summary of what we discussed...</p>"
    },
    {
        id: 3,
        name: "Quarterly Update",
        subject: "Your Quarterly Portfolio Update",
        content: "<p>Dear [First Name],</p><p>Here's an update on your portfolio performance for the past quarter...</p>"
    },
    {
        id: 4,
        name: "Birthday Wishes",
        subject: "Happy Birthday!",
        content: "<p>Dear [First Name],</p><p>Wishing you a very happy birthday! May your day be filled with joy and celebration.</p>"
    },
    {
        id: 5,
        name: "Holiday Greetings",
        subject: "Season's Greetings",
        content: "<p>Dear [First Name],</p><p>Wishing you and your loved ones a joyous holiday season and a prosperous New Year.</p>"
    },
    {
        id: 6,
        name: "Investment Opportunity",
        subject: "Exclusive Investment Opportunity",
        content: "<p>Dear [First Name],</p><p>We have an exciting new investment opportunity that aligns with your financial goals. Let's schedule a call to discuss further.</p>"
    },
]

const signatures = [
    {
        id: 1,
        name: "Default Signature",
        content: "<p>Best regards,<br>[Your Name]<br>Financial Advisor<br>Our Company</p>"
    },
    {
        id: 2,
        name: "Formal Signature",
        content: "<p>Sincerely,<br>[Your Name]<br>Senior Financial Advisor<br>Our Company<br>Phone: (555) 123-4567</p>"
    },
    {
        id: 3,
        name: "Team Signature",
        content: "<p>Best wishes,<br>The [Team Name] Team<br>Our Company<br>www.ourcompany.com</p>"
    },
]

type Signature = {
    id: number;
    name: string;
    content: string;
}

type Template = {
    id: number;
    name: string;
    subject: string;
    content: string;
}

export type NameEmail = {
    guid: string;
    name: string;
    email: string;
}

export default function EmailQuickAction({
                                             sender,
                                             to: initialTo,
                                             trigger,
                                             open: externalOpen,
                                             setOpen: setExternalOpen
                                         }: {
    sender: NameEmail,
    to?: ContactReadResult[],
    trigger?: React.ReactNode,
    open?: boolean
    setOpen?: (open: boolean) => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTab, setSelectedTab] = useState('compose')
    const [to, setTo] = useState<ContactReadResult[]>(initialTo ?? [])
    const [cc, setCc] = useState<ContactReadResult[]>([])
    const [bcc, setBcc] = useState<ContactReadResult[]>([])
    const [showCc, setShowCc] = useState(false)
    const [showBcc, setShowBcc] = useState(false)
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [selectedSignature, setSelectedSignature] = useState<Signature | null>(signatures[0])
    const [searchTerm, setSearchTerm] = useState('')
    const [sendLaterDate, setSendLaterDate] = useState<Date | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [sendToCompliance, setSendToCompliance] = useState(true)

    useEffect(() => {
        if (externalOpen != null) {
            setIsOpen(externalOpen);
        }
    }, [externalOpen])

    const handleOpenChange = (open: boolean) => {
        if (setExternalOpen) {
            setExternalOpen(open);
        } else {
            setIsOpen(open);
        }
    }

    const handleTemplateSelect = (template: Template) => {
        setSelectedTemplate(template)
        setSubject(template.subject)
        if (selectedSignature != null) {
            setContent(template.content + selectedSignature.content)
        } else {
            setContent(template.content)
        }
    }

    const handleSignatureSelect = (signature: Signature | null) => {
        if (signature) {
            setSelectedSignature(signature)

            if (selectedSignature != null) {
                setContent(content.replace(selectedSignature.content, signature.content))
            } else {
                setContent(content + signature.content)
            }
        } else if (selectedSignature) {
            setSelectedSignature(null)
            setContent(content.replace(selectedSignature.content, ''))
        }
    }

    const handleSend = () => {
        // Implement email sending logic here
        console.log('Sending email:', {to, cc, bcc, sender, subject, content, sendLaterDate, sendToCompliance})
        handleOpenChange(false)

        toast.info('Pretend I sent the email')
    }

    const handleSaveDraft = () => {
        // Implement draft saving logic here
        console.log('Saving draft:', {to, cc, bcc, sender, subject, content})
    }

    // const handleCustomAction = (action: 'calendar' | 'location' | 'portal') => {
    //     let actionContent = ''
    //     switch (action) {
    //         case 'calendar':
    //             actionContent = '<p>You can schedule a meeting with me using this link: [Calendar Link]</p>'
    //             break
    //         case 'location':
    //             actionContent = '<p>Our office is located at: 123 Financial St, Suite 100, Money City, MC 12345</p>'
    //             break
    //         case 'portal':
    //             actionContent = '<p>Access your account through our customer portal: [Portal Link]</p>'
    //             break
    //     }
    //     setContent(content + actionContent)
    // }

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    )

    let finalTrigger = trigger
    if (trigger === undefined) {
        finalTrigger = <EmailQuickActionTrigger/>
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {<DialogTrigger asChild>
                {finalTrigger}
            </DialogTrigger>}
            <DialogContent className="max-w-[75vw] h-[90vh] flex flex-col p-0 overflow-y-auto">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Compose Email</DialogTitle>
                </DialogHeader>
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-grow flex">
                    <div className="w-3/4 flex flex-col border-r">
                        <TabsContent value="compose" className="flex-grow flex flex-col m-0 p-6">
                            <div className="grid gap-4 mb-4">
                                <FormField label={'To:'} htmlFor="to" cols={8}>
                                    <ContactPicker
                                        value={to} onValueChange={setTo} fieldPlaceholder={'To'}
                                        requireEmail
                                        multi={true}/>
                                </FormField>
                                {showCc && (
                                    <FormField label={'CC:'} htmlFor="cc" cols={8}>
                                        <ContactPicker
                                            value={cc} onValueChange={setCc} fieldPlaceholder={'CC'}
                                            requireEmail
                                            multi={true}/>
                                    </FormField>
                                )}
                                {showBcc && (
                                    <FormField label={'BCC:'} htmlFor="bcc" cols={8}>
                                        <ContactPicker
                                            value={bcc} onValueChange={setBcc} fieldPlaceholder={'BCC'}
                                            requireEmail
                                            multi={true}/>
                                    </FormField>
                                )}
                                {(!showCc || !showBcc) && (
                                    <div className="flex items-center gap-2">
                                        {!showCc && <Button variant="ghost" size="sm" onClick={() => setShowCc(true)}>
                                            <Plus className="h-4 w-4 mr-1"/> Add CC
                                        </Button>}
                                        {!showBcc && <Button variant="ghost" size="sm" onClick={() => setShowBcc(true)}>
                                            <Plus className="h-4 w-4 mr-1"/> Add BCC
                                        </Button>}
                                    </div>
                                )}
                                <FormField label={'Subject:'} htmlFor="subject" cols={8}>
                                    <Input
                                        id="subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="flex-grow"
                                    />
                                </FormField>
                            </div>
                            <div className="flex-grow" style={{minHeight: '400px'}}>
                                <WYSIWYG
                                    content={content}
                                    onChange={setContent}
                                />
                            </div>
                        </TabsContent>
                        <TabsContent value="templates" className="flex-grow flex flex-col m-0">
                            <div className="p-6 border-b">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Search className="w-4 h-4 text-gray-400"/>
                                    <Input
                                        placeholder="Search templates..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-grow"
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-grow p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    {filteredTemplates.map(template => (
                                        <div
                                            key={template.id}
                                            className={classNames("border rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-900", {
                                                'border-indigo-500': selectedTemplate?.id === template.id
                                            })}
                                            onClick={() => handleTemplateSelect(template)}
                                        >
                                            <h3 className="font-semibold mb-2">{template.name}</h3>
                                            <p className="text-sm text-gray-600">{template.subject}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </div>
                    <div className="w-1/4 p-6 flex flex-col">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="compose">Compose</TabsTrigger>
                            <TabsTrigger value="templates">Templates</TabsTrigger>
                        </TabsList>
                        <div className="space-y-4 mb-4">
                            <div>
                                <Label htmlFor="signature" className="mb-2 block">Signature:</Label>
                                <Select value={selectedSignature?.id.toString() ?? 'null'}
                                        onValueChange={(value) => handleSignatureSelect(signatures.find(s => s.id === parseInt(value)) ?? null)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select signature"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">None</SelectItem>
                                        {signatures.map(signature => (
                                            <SelectItem key={signature.id} value={signature.id.toString()}>
                                                {signature.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex-grow"/>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="sendToCompliance"
                                    checked={sendToCompliance}
                                    onCheckedChange={(checked) => {
                                        if (checked === true) {
                                            setSendToCompliance(true)
                                        } else {
                                            setSendToCompliance(false)
                                        }
                                    }}
                                />
                                <Label htmlFor="sendToCompliance">Send copy to compliance</Label>
                            </div>
                            <Button variant="outline" onClick={handleSaveDraft} className="w-full">Save Draft</Button>
                            <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="w-full">
                                <Eye className="mr-2 h-4 w-4"/>
                                Preview
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn(
                                        "w-full",
                                        !sendLaterDate && "text-muted-foreground"
                                    )}>
                                        <CalendarIcon className="mr-2 h-4 w-4"/>
                                        {sendLaterDate ? format(sendLaterDate, "PPP") : <span>Schedule send</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={sendLaterDate ?? undefined}
                                        onSelect={(date) => setSendLaterDate(date ?? null)}
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button onClick={handleSend} className="w-full">Send{sendLaterDate ? ' Later' : ''}</Button>
                        </div>
                    </div>
                </Tabs>
            </DialogContent>
            {isPreviewOpen && (
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Email Preview</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <p><strong>From:</strong> {sender.name} ({sender.email})</p>
                            <p>
                                <strong>To:</strong> {to.map(contact => `${contact.fullName} (${contact.primaryEmail})`).join(', ')}
                            </p>
                            {cc.length > 0 && <p>
                                <strong>CC:</strong> {cc.map(contact => `${contact.fullName} (${contact.primaryEmail})`).join(', ')}
                            </p>}
                            {bcc.length > 0 && <p>
                                <strong>BCC:</strong> {bcc.map(contact => `${contact.fullName} (${contact.primaryEmail})`).join(', ')}
                            </p>}
                            <p><strong>Subject:</strong> {subject}</p>
                            <div className="mt-4 border-t pt-4">
                                <div dangerouslySetInnerHTML={{__html: content}}/>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    )
}

export function EmailQuickActionTrigger(props: HTMLAttributes<HTMLButtonElement>) {
    return <Button variant="outline" className="w-full justify-start" {...props}>
        <Mail className="mr-2 h-4 w-4"/> Email
    </Button>
}