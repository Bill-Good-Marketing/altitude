import {useState} from "react"
import {useDrag} from "react-dnd"
import {
  Calendar,
  CheckSquare,
  Clock,
  Database,
  File,
  FileText,
  GitBranch,
  LucideIcon,
  Mail,
  MessageSquare,
  PauseCircle,
  Phone,
  RefreshCcw,
  Target,
  UserCheck,
  UserPlus
} from 'lucide-react'
import {Button} from "~/components/ui/button"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "~/components/ui/dialog"
import {Label} from "~/components/ui/label"
import {Input} from "~/components/ui/input"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import {Textarea} from "~/components/ui/textarea"

interface FlowComponentProps {
  id: string
  name: string
  icon: string
  isTemplate?: boolean
}

export const iconMap: { [key: string]: LucideIcon } = {
  mail: Mail,
  "check-square": CheckSquare,
  "file-text": FileText,
  "message-square": MessageSquare,
  phone: Phone,
  "user-check": UserCheck,
  file: File,
  "git-branch": GitBranch,
  clock: Clock,
  calendar: Calendar,
  "pause-circle": PauseCircle,
  target: Target,
  "refresh-ccw": RefreshCcw,
  database: Database,
  "user-plus": UserPlus,
}

export declare type PathStepOptions = {
  documentTemplate?: string,
  documentManager?: string,
  dataField?: string,
  fromValue?: string,
  toValue?: string,
  action?: string,

  stepName?: string,
  description?: string,
  assignee?: string,
  dateType?: string,
  customDate?: string,

  householdRole?: string,
  contact?: string,
  age?: number,

  householdMemberType?: string,
}

export declare type PathComponentItem = {
  id: string, // Name of the component
  name: string,
  icon: string,
  options: PathStepOptions,
}

export default function PathComponent({ id, name, icon, isTemplate = false }: FlowComponentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [componentOptions, setComponentOptions] = useState<PathStepOptions>({})

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "flow-component",
    item: { id, name, icon, options: componentOptions },
    collect: (monitor) => {
      return {
        isDragging: monitor.isDragging(),
      }
    },
  }), [id, name, icon, componentOptions])

  const Icon = iconMap[icon] || FileText

  const handleOptionChange = (field: string, value: any) => {
    setComponentOptions((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div
          className={`flex items-center p-2 rounded-md cursor-move border ${
            isDragging ? "opacity-50" : ""
          } ${isTemplate ? "bg-secondary" : "bg-background"}`}
          ref={(node) => {
            drag(node);
          }}
        >
          <Icon className="w-5 h-5 mr-2" />
          <span className="text-sm">{name}</span>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name} Options</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {icon === "file" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="documentTemplate">Document Template</Label>
                <Select
                  value={componentOptions.documentTemplate || ""}
                  onValueChange={(value) => handleOptionChange("documentTemplate", value)}
                >
                  <SelectTrigger id="documentTemplate">
                    <SelectValue placeholder="Select document template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template1">Contract</SelectItem>
                    <SelectItem value="template2">Proposal</SelectItem>
                    <SelectItem value="template3">Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentManager">Document Manager</Label>
                <Select
                  value={componentOptions.documentManager || ""}
                  onValueChange={(value) => handleOptionChange("documentManager", value)}
                >
                  <SelectTrigger id="documentManager">
                    <SelectValue placeholder="Select document manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager1">Client Documents</SelectItem>
                    <SelectItem value="manager2">Internal Documents</SelectItem>
                    <SelectItem value="manager3">Legal Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {icon === "database" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="dataField">Data Field</Label>
                <Select
                  value={componentOptions.dataField || ""}
                  onValueChange={(value) => handleOptionChange("dataField", value)}
                >
                  <SelectTrigger id="dataField">
                    <SelectValue placeholder="Select data field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demographic">Demographic</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="tier">Tier</SelectItem>
                    <SelectItem value="tags">Tags</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromValue">From Value</Label>
                <Input
                  id="fromValue"
                  value={componentOptions.fromValue || ""}
                  onChange={(e) => handleOptionChange("fromValue", e.target.value)}
                  placeholder="Enter from value"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toValue">To Value</Label>
                <Input
                  id="toValue"
                  value={componentOptions.toValue || ""}
                  onChange={(e) => handleOptionChange("toValue", e.target.value)}
                  placeholder="Enter to value"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select
                  value={componentOptions.action || ""}
                  onValueChange={(value) => handleOptionChange("action", value)}
                >
                  <SelectTrigger id="action">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="change">Change</SelectItem>
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {icon === "calendar" && name === "Important Date" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="stepName">Step Name</Label>
                <Input
                  id="stepName"
                  value={componentOptions.stepName || ""}
                  onChange={(e) => handleOptionChange("stepName", e.target.value)}
                  placeholder="Enter step name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={componentOptions.description || ""}
                  onChange={(e) => handleOptionChange("description", e.target.value)}
                  placeholder="Enter step description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Input
                  id="assignee"
                  value={componentOptions.assignee || ""}
                  onChange={(e) => handleOptionChange("assignee", e.target.value)}
                  placeholder="Enter assignee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateType">Date Type</Label>
                <Select
                  value={componentOptions.dateType || ""}
                  onValueChange={(value) => handleOptionChange("dateType", value)}
                >
                  <SelectTrigger id="dateType">
                    <SelectValue placeholder="Select date type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customDate">Date</Label>
                <Input
                  type="date"
                  id="customDate"
                  value={componentOptions.customDate || ""}
                  onChange={(e) => handleOptionChange("customDate", e.target.value)}
                />
              </div>
            </>
          )}
          {icon === "calendar" && name === "Age" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="householdRole">Household Role</Label>
                <Select
                  value={componentOptions.householdRole || ""}
                  onValueChange={(value) => handleOptionChange("householdRole", value)}
                >
                  <SelectTrigger id="householdRole">
                    <SelectValue placeholder="Select household role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="headOfHousehold">Head of Household</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  value={componentOptions.contact || ""}
                  onChange={(e) => handleOptionChange("contact", e.target.value)}
                  placeholder="Enter contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  type="number"
                  id="age"
                  value={componentOptions.age || ""}
                  onChange={(e) => handleOptionChange("age", parseInt(e.target.value))}
                  placeholder="Enter age"
                />
              </div>
            </>
          )}
          {icon === "user-plus" && name === "Household Member Added" && (
            <div className="space-y-2">
              <Label htmlFor="householdMemberType">Household Member Type</Label>
              <Select
                value={componentOptions.householdMemberType || ""}
                onValueChange={(value) => handleOptionChange("householdMemberType", value)}
              >
                <SelectTrigger id="householdMemberType">
                  <SelectValue placeholder="Select household member type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="headOfHousehold">Head of Household</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="son">Son</SelectItem>
                  <SelectItem value="daughter">Daughter</SelectItem>
                  <SelectItem value="cousin">Cousin</SelectItem>
                  <SelectItem value="uncle">Uncle</SelectItem>
                  <SelectItem value="grandmother">Grandmother</SelectItem>
                  <SelectItem value="grandfather">Grandfather</SelectItem>
                  <SelectItem value="aunt">Aunt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Add more conditions for other component types as needed */}
          <Button onClick={() => setIsDialogOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

