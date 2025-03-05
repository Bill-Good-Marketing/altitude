import { useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "~/components/ui/drawer"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group"
import { Bold, Italic, Underline } from "lucide-react"

interface EmailBuilderDrawerProps {
  isOpen: boolean
  onClose: () => void
  emailData: any
  onSave: (data: any) => void
}

export function EmailBuilderDrawer({ isOpen, onClose, emailData, onSave }: EmailBuilderDrawerProps) {
  const [subject, setSubject] = useState(emailData.subject || "")
  const [body, setBody] = useState(emailData.body || "")
  const [template, setTemplate] = useState(emailData.template || "")
  const [from, setFrom] = useState(emailData.from || "")
  const [to, setTo] = useState(emailData.to || [])
  const [formatting, setFormatting] = useState(emailData.formatting || [])

  const handleSave = (isDraft: boolean) => {
    onSave({ subject, body, template, from, to, formatting, isDraft })
    onClose()
  }

  const insertMergeField = (field: string) => {
    setBody(body + `{{${field}}}`)
  }

  const handlePreview = () => {
    // Implement preview logic here
    console.log("Preview:", { subject, body, template, from, to, formatting })
  }

  return (
    <Drawer open={isOpen} onClose={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Email Builder</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailSubject">Subject</Label>
            <Input
              id="emailSubject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailBody">Body</Label>
            <ContextMenu>
              <ContextMenuTrigger>
                <Textarea
                  id="emailBody"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[200px]"
                />
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => insertMergeField("firstName")}>
                  Insert First Name
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => insertMergeField("lastName")}>
                  Insert Last Name
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => insertMergeField("companyName")}>
                  Insert Company Name
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
          <div className="space-y-2">
            <Label>Formatting</Label>
            <ToggleGroup type="multiple" value={formatting} onValueChange={setFormatting}>
              <ToggleGroupItem value="bold" aria-label="Toggle bold">
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Toggle italic">
                <Italic className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Toggle underline">
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailTemplate">Email Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="emailTemplate">
                <SelectValue placeholder="Select email template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template1">Welcome Email</SelectItem>
                <SelectItem value="template2">Follow-up Email</SelectItem>
                <SelectItem value="template3">Newsletter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailFrom">From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger id="emailFrom">
                <SelectValue placeholder="Select sender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advisor">Financial Advisor</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailTo">To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger id="emailTo">
                <SelectValue placeholder="Select recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DrawerFooter>
          <div className="flex justify-between w-full">
            <Button onClick={handlePreview}>Preview</Button>
            <div>
              <Button onClick={() => handleSave(true)} variant="outline" className="mr-2">
                Save as Draft
              </Button>
              <Button onClick={() => handleSave(false)}>Save Changes</Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

