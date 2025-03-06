import {useEffect, useState} from "react"
import {Label} from "~/components/ui/label"
import {Input} from "~/components/ui/input"
import {Textarea} from "~/components/ui/textarea"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Checkbox} from "~/components/ui/checkbox"
import {Button} from "~/components/ui/button"
import {EmailBuilderDrawer} from "./email-builder-drawer"
import {LetterBuilderDrawer} from "./letter-builder-drawer"
import {RadioGroup, RadioGroupItem} from "~/components/ui/radio-group"

interface PropertiesPanelProps {
    selectedStep: any
    updateHistory: (newState: any) => void
}

export default function PropertiesPanel({selectedStep, updateHistory}: PropertiesPanelProps) {
    const [stepProperties, setStepProperties] = useState(selectedStep)
    const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState(false)
    const [isLetterDrawerOpen, setIsLetterDrawerOpen] = useState(false)

    useEffect(() => {
        setStepProperties(selectedStep)
    }, [selectedStep])

    const handleChange = (field: string, value: any) => {
        setStepProperties((prev: any) => {
            const updatedProperties = {...prev, [field]: value}
            updateHistory(updatedProperties)
            return updatedProperties
        })
    }

    const handleEmailSave = (emailData: any) => {
        handleChange("emailData", emailData)
    }

    const handleLetterSave = (letterData: any) => {
        handleChange("letterData", letterData)
    }

    if (!stepProperties) {
        return (
            <div className="w-64 p-4 border-l bg-background">
                <p className="text-sm text-muted-foreground">Select a step to view and edit its properties</p>
            </div>
        )
    }

    return (
        <div className="w-64 p-4 space-y-4 border-l bg-background">
            <h2 className="text-lg font-semibold">{stepProperties.name} Properties</h2>
            <div className="space-y-2">
                <Label htmlFor="stepName">Step Name</Label>
                <Input
                    id="stepName"
                    value={stepProperties.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                />
            </div>
            <div className="space-y-2">

                <Label htmlFor="stepDescription">Description</Label>
                <Textarea
                    id="stepDescription"
                    placeholder="Enter step description"
                    value={stepProperties.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                    value={stepProperties.assignee || ""}
                    onValueChange={(value) => handleChange("assignee", value)}
                >
                    <SelectTrigger id="assignee">
                        <SelectValue placeholder="Select assignee"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="user1">John Doe</SelectItem>
                        <SelectItem value="user2">Jane Smith</SelectItem>
                        <SelectItem value="user3">Bob Johnson</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {stepProperties.icon === "mail" && (
                <div className="space-y-2">
                    <Button onClick={() => setIsEmailDrawerOpen(true)}>Open Email Builder</Button>
                    <EmailBuilderDrawer
                        isOpen={isEmailDrawerOpen}
                        onClose={() => setIsEmailDrawerOpen(false)}
                        emailData={stepProperties.emailData || {}}
                        onSave={handleEmailSave}
                    />
                </div>
            )}
            {stepProperties.icon === "file-text" && (
                <div className="space-y-2">
                    <Button onClick={() => setIsLetterDrawerOpen(true)}>Open Letter Builder</Button>
                    <LetterBuilderDrawer
                        isOpen={isLetterDrawerOpen}
                        onClose={() => setIsLetterDrawerOpen(false)}
                        letterData={stepProperties.letterData || {}}
                        onSave={handleLetterSave}
                    />
                </div>
            )}
            {stepProperties.icon === "calendar" && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="meetingType">Meeting Type</Label>
                        <Select
                            value={stepProperties.meetingType || ""}
                            onValueChange={(value) => handleChange("meetingType", value)}
                        >
                            <SelectTrigger id="meetingType">
                                <SelectValue placeholder="Select meeting type"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="initial">Initial Consultation</SelectItem>
                                <SelectItem value="review">Portfolio Review</SelectItem>
                                <SelectItem value="planning">Financial Planning</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="meetingLocation">Meeting Location</Label>
                        <RadioGroup
                            value={stepProperties.meetingLocation || "virtual"}
                            onValueChange={(value) => handleChange("meetingLocation", value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="virtual" id="virtual"/>
                                <Label htmlFor="virtual">Virtual</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="inOffice" id="inOffice"/>
                                <Label htmlFor="inOffice">In Office</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="outsideOffice" id="outsideOffice"/>
                                <Label htmlFor="outsideOffice">Outside Office</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="meetingWith">Meeting With</Label>
                        <Select
                            value={stepProperties.meetingWith || ""}
                            onValueChange={(value) => handleChange("meetingWith", value)}
                        >
                            <SelectTrigger id="meetingWith">
                                <SelectValue placeholder="Select contact type"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="client">Client</SelectItem>
                                <SelectItem value="prospect">Prospect</SelectItem>
                                <SelectItem value="partner">Partner</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}
            {stepProperties.icon === "check-square" && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="taskDueDate">Due Date</Label>
                        <div className="flex space-x-2">
                            <Input
                                id="taskDueDate"
                                type="number"
                                value={stepProperties.taskDueDays || 0}
                                onChange={(e) => handleChange("taskDueDays", parseInt(e.target.value))}
                            />
                            <Select
                                value={stepProperties.taskDueUnit || "days"}
                                onValueChange={(value) => handleChange("taskDueUnit", value)}
                            >
                                <SelectTrigger id="taskDueUnit">
                                    <SelectValue placeholder="Unit"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="workDaysOnly"
                            checked={stepProperties.workDaysOnly || false}
                            onCheckedChange={(checked) => handleChange("workDaysOnly", checked)}
                        />
                        <Label htmlFor="workDaysOnly">Work days only</Label>
                    </div>
                </>
            )}
            {stepProperties.icon === "git-branch" && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="condition">Condition</Label>
                        <Input
                            id="condition"
                            value={stepProperties.condition || ""}
                            onChange={(e) => handleChange("condition", e.target.value)}
                            placeholder="Enter condition"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="conditionRequirement">Requirement</Label>
                        <Select
                            value={stepProperties.conditionRequirement || ""}
                            onValueChange={(value) => handleChange("conditionRequirement", value)}
                        >
                            <SelectTrigger id="conditionRequirement">
                                <SelectValue placeholder="Select requirement"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="priorStepDone">Prior Step Completed</SelectItem>
                                <SelectItem value="specificDate">Specific Date Reached</SelectItem>
                                <SelectItem value="customCondition">Custom Condition</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}
        </div>
    )
}

