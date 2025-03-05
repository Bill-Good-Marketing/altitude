import { Save, Play, Settings } from 'lucide-react'
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"

export default function TopBar() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold">Flow Creator</h1>
        <Input placeholder="Enter flow name" className="w-64" />
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" size="sm">
          <Play className="w-4 h-4 mr-2" />
          Test
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  )
}

