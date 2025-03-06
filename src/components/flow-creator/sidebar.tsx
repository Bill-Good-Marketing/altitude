import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { ScrollArea } from "~/components/ui/scroll-area"
import PathComponent from "./path-component"
import KanbanView from "./kanban-view"

const components = [
  { id: "email", name: "Send Email", icon: "mail" },
  { id: "task", name: "Assign Task", icon: "check-square" },
  { id: "send-form", name: "Send Form", icon: "file-text" },
  { id: "sms", name: "Send SMS", icon: "message-square" },
  { id: "call", name: "Phone Call", icon: "phone" },
  { id: "approval", name: "Approval", icon: "user-check" },
  { id: "send-document", name: "Send Document", icon: "file" },
  { id: "condition", name: "Condition", icon: "git-branch" },
  { id: "wait", name: "Wait", icon: "clock" },
  { id: "schedule-meeting", name: "Schedule Meeting", icon: "calendar" },
  { id: "send-letter", name: "Send Letter", icon: "mail" },
  { id: "pause", name: "Pause", icon: "pause-circle" },
  { id: "generate-opportunity", name: "Generate Opportunity", icon: "target" },
  { id: "reschedule-task", name: "Reschedule Task", icon: "refresh-ccw" },
  { id: "data-updated", name: "Data Updated", icon: "database" },
]

const templates = [
  { id: "onboarding", name: "Client Onboarding", icon: "users" },
  { id: "review", name: "Annual Review", icon: "calendar" },
  { id: "followup", name: "Follow-up Sequence", icon: "repeat" },
]

const triggers = [
  { id: "age-trigger", name: "Age", icon: "calendar" },
  { id: "marital-status-trigger", name: "Marital Status", icon: "users" },
  { id: "household-member-trigger", name: "Household Member Added", icon: "user-plus" },
  { id: "referral-trigger", name: "Referral Offered", icon: "user-check" },
  { id: "important-date-trigger", name: "Important Date", icon: "calendar" },
]

export default function Sidebar() {
  return (
    <div className="w-fit border-r bg-background">
      <Tabs defaultValue="components" className="h-full">
        <TabsList className="grid w-full h-fit grid-cols-4 bg-muted rounded-lg gap-2">
          <TabsTrigger
            value="components"
            className="px-3 py-2 rounded-md transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-background/80 data-[state=active]:animate-[${activeTabAnimation} 0.3s ease-in-out]"
          >
            Components
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="px-3 py-2 rounded-md transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-background/80 data-[state=active]:animate-[${activeTabAnimation} 0.3s ease-in-out]"
          >
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="triggers"
            className="px-3 py-2 rounded-md transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-background/80 data-[state=active]:animate-[${activeTabAnimation} 0.3s ease-in-out]"
          >
            Triggers
          </TabsTrigger>
          <TabsTrigger
            value="kanban"
            className="px-3 py-2 rounded-md transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-background/80 data-[state=active]:animate-[${activeTabAnimation} 0.3s ease-in-out]"
          >
            Kanban
          </TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="h-[calc(100%-40px)]">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-2 p-4">
              {components.map((component) => (
                <PathComponent key={component.id} {...component} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="templates" className="h-[calc(100%-40px)]">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 gap-2 p-4">
              {templates.map((template) => (
                <PathComponent key={template.id} {...template} isTemplate />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="triggers" className="h-[calc(100%-40px)]">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-2 p-4">
              {triggers.map((trigger) => (
                <PathComponent key={trigger.id} {...trigger} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="kanban" className="h-[calc(100%-40px)]">
          <KanbanView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

