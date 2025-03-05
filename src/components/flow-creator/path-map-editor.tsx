"use client"

import {useEffect, useState} from "react"
import {DndProvider} from "react-dnd"
import {HTML5Backend} from "react-dnd-html5-backend"
import TopBar from "./top-bar"
import Sidebar from "./sidebar"
import Workspace, {PathConnection, PathStep} from "./workspace"
import PropertiesPanel from "./properties-panel"
import PreviewMode from "./preview-mode"
import {Button} from "~/components/ui/button"
import {Play, Redo2, Undo2} from 'lucide-react'
import {useStateRef} from "~/hooks/use-state-ref";

type PathHistoryItem = {
  steps: PathStep[],
  connections: PathConnection[]
}

export default function PathMapEditor() {
  const [selectedStep, setSelectedStep] = useState<PathStep | null>(null)
  const [history, setHistory] = useState<Array<PathHistoryItem>>([{steps: [], connections: []}])
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyIndexRef = useStateRef(historyIndex)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [steps, setSteps] = useState<PathStep[]>([])
  const [connections, setConnections] = useState<PathConnection[]>([])
  const [view, setView] = useState('flow') // 'flow' or 'kanban'

  const updateHistory = (newState: PathHistoryItem) => {
    const historyIdx = historyIndexRef.current;
    const callback = (prevHistory: PathHistoryItem[]) => {
      const newHistory = [...prevHistory.slice(0, historyIdx + 1), newState]
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    }

    setHistory(callback)
  }

  useEffect(() => {
    setHistoryIndex(history.length - 1)
  }, [history])

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prevIndex) => {
        const newIdx = prevIndex - 1
        setSteps(history[newIdx].steps)
        setConnections(history[newIdx].connections)
        return newIdx
      })
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prevIndex) => {
        const newIdx = prevIndex + 1
        setSteps(history[newIdx].steps)
        setConnections(history[newIdx].connections)
        return newIdx
      })
    }
  }

  const togglePreviewMode = () => {
    setIsPreviewMode((prev) => !prev)
  }

  const toggleView = () => {
    setView((prev) => prev === 'flow' ? 'kanban' : 'flow')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex items-center justify-end space-x-2 p-2 border-b">
          <Button onClick={undo} disabled={historyIndex <= 0}>
            <Undo2 className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo2 className="w-4 h-4 mr-2" />
            Redo
          </Button>
          <Button onClick={togglePreviewMode}>
            <Play className="w-4 h-4 mr-2" />
            {isPreviewMode ? "Exit Preview" : "Preview"}
          </Button>
          <Button onClick={toggleView}>
            {view === 'flow' ? "Switch to Kanban" : "Switch to Flow"}
          </Button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          {isPreviewMode ? (
            <PreviewMode steps={steps} />
          ) : (
            <>
              {view === 'flow' ? (
                <Workspace
                  onSelectStep={setSelectedStep}
                  updateHistory={updateHistory}
                  steps={steps}
                  connections={connections}
                  setSteps={setSteps}
                  setConnections={setConnections}
                  selectedStep={selectedStep}
                />
              ) : (
                <div className="flex-1">
                  {/* Kanban view will be rendered here */}
                </div>
              )}
              <PropertiesPanel selectedStep={selectedStep} updateHistory={updateHistory} />
            </>
          )}
        </div>
      </div>
    </DndProvider>
  )
}

