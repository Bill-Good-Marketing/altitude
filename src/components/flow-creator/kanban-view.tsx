import React, { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion"

// Define local types for the provided objects
type DroppableProvided = {
  innerRef: (element: HTMLElement | null) => any,
  droppableProps: any,
  placeholder: React.ReactNode,
}

type DraggableProvided = {
  innerRef: (element: HTMLElement | null) => any,
  draggableProps: any,
  dragHandleProps: any,
}

interface Objective {
  id: string
  title: string
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  actions: any[]
}

const KanbanView: React.FC = () => {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('')
  const [expandedObjectives, setExpandedObjectives] = useState<string[]>([])

  const addObjective = () => {
    if (newObjectiveTitle.trim() !== '') {
      const newObjective: Objective = {
        id: `objective-${Date.now()}`,
        title: newObjectiveTitle,
        tasks: []
      }
      setObjectives([...objectives, newObjective])
      setNewObjectiveTitle('')
    }
  }

  const addTask = (objectiveId: string) => {
    const updatedObjectives = objectives.map(objective => {
      if (objective.id === objectiveId) {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: 'New Task',
          actions: []
        }
        return { ...objective, tasks: [...objective.tasks, newTask] }
      }
      return objective
    })
    setObjectives(updatedObjectives)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const sourceObjectiveId = result.source.droppableId
    const destObjectiveId = result.destination.droppableId

    if (sourceObjectiveId === destObjectiveId) {
      // Reordering within the same objective
      const objective = objectives.find(obj => obj.id === sourceObjectiveId)
      if (objective) {
        const newTasks = Array.from(objective.tasks)
        const [reorderedItem] = newTasks.splice(result.source.index, 1)
        newTasks.splice(result.destination.index, 0, reorderedItem)

        const newObjectives = objectives.map(obj =>
          obj.id === sourceObjectiveId ? { ...obj, tasks: newTasks } : obj
        )
        setObjectives(newObjectives)
      }
    } else {
      // Moving task between objectives
      const sourceObjective = objectives.find(obj => obj.id === sourceObjectiveId)
      const destObjective = objectives.find(obj => obj.id === destObjectiveId)

      if (sourceObjective && destObjective) {
        const sourceTasks = Array.from(sourceObjective.tasks)
        const destTasks = Array.from(destObjective.tasks)
        const [movedTask] = sourceTasks.splice(result.source.index, 1)
        destTasks.splice(result.destination.index, 0, movedTask)

        const newObjectives = objectives.map(obj => {
          if (obj.id === sourceObjectiveId) {
            return { ...obj, tasks: sourceTasks }
          }
          if (obj.id === destObjectiveId) {
            return { ...obj, tasks: destTasks }
          }
          return obj
        })
        setObjectives(newObjectives)
      }
    }
  }

  const toggleObjectiveExpansion = (objectiveId: string) => {
    setExpandedObjectives(prev =>
      prev.includes(objectiveId)
        ? prev.filter(id => id !== objectiveId)
        : [...prev, objectiveId]
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="New Objective"
            value={newObjectiveTitle}
            onChange={(e) => setNewObjectiveTitle(e.target.value)}
          />
          <Button onClick={addObjective}>
            <Plus className="w-4 h-4 mr-2" />
            Add Objective
          </Button>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          {objectives.map((objective) => (
            <Accordion
              key={objective.id}
              type="single"
              collapsible
              className="w-full"
            >
              <AccordionItem value={objective.id}>
                <AccordionTrigger
                  onClick={() => toggleObjectiveExpansion(objective.id)}
                  className="flex justify-between items-center w-full p-2 bg-muted rounded-md hover:bg-muted/80"
                >
                  <span>{objective.title}</span>
                  {expandedObjectives.includes(objective.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <Droppable droppableId={objective.id}>
                    {(provided: DroppableProvided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 mt-2"
                      >
                        {objective.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided: DraggableProvided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="p-2 bg-background rounded-md shadow-sm"
                              >
                                {task.title}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  <Button
                    onClick={() => addTask(objective.id)}
                    className="mt-2"
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </DragDropContext>
      </div>
    </ScrollArea>
  )
}

export default KanbanView
