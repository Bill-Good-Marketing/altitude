import { useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "~/components/ui/drawer"
import { Button } from "~/components/ui/button"
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
import { Bold, Italic, Underline } from 'lucide-react'

interface LetterBuilderDrawerProps {
  isOpen: boolean
  onClose: () => void
  letterData: any
  onSave: (data: any) => void
}

export function LetterBuilderDrawer({ isOpen, onClose, letterData, onSave }: LetterBuilderDrawerProps) {
  const [content, setContent] = useState(letterData.content || "")
  const [template, setTemplate] = useState(letterData.template || "")
  const [from, setFrom] = useState(letterData.from || "")
  const [to, setTo] = useState(letterData.to || [])
  const [formatting, setFormatting] = useState(letterData.formatting || [])

  const handleSave = (isDraft: boolean) => {
    onSave({ content, template, from, to, formatting, isDraft })
    onClose()
  }

  const insertMergeField = (field: string) => {
    setContent(content + `{{${field}}}`)
  }

  const handlePreview = () => {
    // Implement preview logic here
    console.log("Preview:", { content, template, from, to, formatting })
  }

  return (
    <Drawer open={isOpen} onClose={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Letter Builder</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="letterContent">Letter Content</Label>
            <ContextMenu>
              <ContextMenuTrigger>
                <Textarea
                  id="letterContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px]"
                />
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => insertMergeField("firstName")}>
                  Insert First Name
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => insertMergeField("lastName")}>
                  Insert Last Name
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => insertMergeField("address")}>
                  Insert Address
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
            <Label htmlFor="letterTemplate">Letter Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="letterTemplate">
                <SelectValue placeholder="Select letter template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template1">Welcome Letter</SelectItem>
                <SelectItem value="template2">Thank You Letter</SelectItem>
                <SelectItem value="template3">Proposal Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="letterFrom">From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger id="letterFrom">
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
            <Label htmlFor="letterTo">To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger id="letterTo">
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

