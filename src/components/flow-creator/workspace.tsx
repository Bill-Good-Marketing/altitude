"use client"

import React, {Dispatch, SetStateAction, useEffect, useRef, useState} from "react"
import {useDrop} from "react-dnd"
import WorkspaceStep from "./workspace-step"
import {Button} from "~/components/ui/button"
import {ZoomIn, ZoomOut} from 'lucide-react'
import Xarrow, {useXarrow, Xwrapper} from "react-xarrows"
import {generateClientId} from "~/lib/utils";
import {PathComponentItem, PathStepOptions} from "~/components/flow-creator/path-component";

interface WorkspaceProps {
    onSelectStep: (step: PathStep | null) => void
    updateHistory: (newState: { steps: PathStep[], connections: PathConnection[] }) => void
    setSteps: Dispatch<SetStateAction<PathStep[]>>
    setConnections: Dispatch<SetStateAction<PathConnection[]>>
    connections: Array<{ from: string, to: string }>
    steps: PathStep[]
    selectedStep: PathStep | null
}

export declare type PathStep = {
    id: string,
    name: string,
    icon: string,
    options: PathStepOptions,
    position: {
        x: number,
        y: number
    }
}

export declare type PathConnection = {
    from: string,
    to: string,
}

export default function Workspace({selectedStep, onSelectStep, updateHistory, setSteps, steps, setConnections, connections}: WorkspaceProps) {
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({x: 0, y: 0})
    const workspaceRef = useRef<HTMLDivElement>()
    const [isDragging, setIsDragging] = useState(false)
    const [workspaceRect, setWorkspaceRect] = useState<DOMRect>()
    const lastMousePosRef = useRef({x: 0, y: 0})

    const handleZoom = (delta: number) => {
        setZoom((prevZoom) => Math.max(0.5, Math.min(2, prevZoom + delta)))
    }

    useEffect(() => {
        setWorkspaceRect(workspaceRef.current!.getBoundingClientRect())
    }, [])

    const [, drop] = useDrop(() => ({
        accept: "flow-component",
        drop: (item: PathComponentItem, monitor) => {
            const workspaceRect = workspaceRef.current!.getBoundingClientRect()
            const offset = monitor.getClientOffset()!
            const newStep = {
                ...item,
                id: generateClientId(),
                position: {
                    x: (offset.x - workspaceRect.left - pan.x) / zoom,
                    y: (offset.y - workspaceRect.top - pan.y) / zoom,
                },
            }
            setSteps(prev => {
                const newSteps = [...prev, newStep]
                updateHistory({steps: newSteps, connections})
                return newSteps
            })
        },
    }))

    const updateXarrows = useXarrow();

    const [, dropItem] = useDrop(() => ({
        accept: "workspace-step",
        drop: (item: PathStep, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset()!
            const newStep = {
                ...item,
                position: {
                    x: Math.round(item.position.x + delta.x / zoom),
                    y: Math.round(item.position.y + delta.y / zoom),
                },
            }
            setSteps(prev => {
                const newSteps = [...prev].filter(step => step.id !== item.id).concat([newStep])
                updateHistory({steps: newSteps, connections})
                return newSteps
            })
            updateXarrows()
            setIsDragging(false)
        }
    }), [setSteps, updateHistory, connections, zoom])

    const handleConnect = (fromId: string, type: 'left' | 'right', x: number, y: number) => {
        for (const step of steps) {
            if (step.id === fromId) {
                continue
            }
            const oppositeNode = step.id
            const rect = document.getElementById(oppositeNode)?.getBoundingClientRect()
            if (rect != null) {
                const rectGrown = new DOMRect(rect.x - 10, rect.y - 10, rect.width + 20, rect.height + 20)
                if (rectGrown.x <= x && x <= rectGrown.x + rectGrown.width && rectGrown.y <= y && y <= rectGrown.y + rectGrown.height) {
                    const source = type === 'right' ? fromId + '-right' : step.id + '-right'
                    const target = type === 'right' ? step.id + '-left' : fromId + '-left'
                    // Connections are always from the left to the right
                    const newConnection = {from: source, to: target}
                    setConnections(prev => {
                        if (prev.find(connection => connection.from === source && connection.to === target)) {
                            return prev
                        }
                        const newConnections = [...prev, newConnection]
                        updateHistory({steps, connections: newConnections})
                        return newConnections
                    })
                    break
                }
            }
        }
    }

    // Type is left or right, where is the connection linked to the left (input) or right (output) side of the step
    const handleRemoveConnection = (from: string, to: string) => {
        setConnections(prev => {
            const newConnections = prev.filter(connection => {
                return connection.from !== from || connection.to !== to
            })
            updateHistory({steps, connections: newConnections})
            return newConnections
        })
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && (e.target === workspaceRef.current || (e.target as HTMLDivElement).id === 'workspace-parent')) { // Left mouse button
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(true)
            lastMousePosRef.current = {x: e.clientX, y: e.clientY}
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault()
            e.stopPropagation()
            const dx = e.clientX - lastMousePosRef.current.x
            const dy = e.clientY - lastMousePosRef.current.y
            setPan((prevPan) => ({x: prevPan.x + dx, y: prevPan.y + dy}))
            lastMousePosRef.current = {x: e.clientX, y: e.clientY}
        }
    }

    const handleMouseUp = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault()
            e.stopPropagation()
        }
        setIsDragging(false)
    }

    // const handleContextMenu = (e: React.MouseEvent, stepId?: string) => {
    //     e.preventDefault()
    //     // Handle context menu actions
    // }

    const deleteComponent = (stepId: string) => {
        const updatedSteps = steps.filter((step) => step.id !== stepId)
        const updatedConnections = connections.filter(
            (conn) => conn.from.includes(stepId) && conn.to.includes(stepId)
        )
        if (selectedStep?.id === stepId) {
            onSelectStep(null)
        }
        setSteps(updatedSteps)
        setConnections(updatedConnections)
        updateHistory({steps: updatedSteps, connections: updatedConnections})
    }

    // const addConnection = (fromId: number) => {
    //     // Implement logic to add a connection
    // }
    //
    // const branchConnection = (fromId: number) => {
    //     // Implement logic to branch a connection
    // }

    return (
        <div className="flex-1 relative">
            <div className="absolute top-4 right-4 z-10 space-x-2">
                <Button onClick={() => handleZoom(0.1)} size="sm">
                    <ZoomIn className="w-4 h-4"/>
                </Button>
                <Button onClick={() => handleZoom(-0.1)} size="sm">
                    <ZoomOut className="w-4 h-4"/>
                </Button>
            </div>
            <div
                id="workspace-parent"
                className="h-full overflow-hidden"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    cursor: isDragging ? "grabbing" : "grab"
                }}
            >
                <div
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    ref={(node) => {
                        drop(node);
                        dropItem(node);
                        workspaceRef.current = node ?? undefined;
                    }}
                    className="relative w-[500%] h-[2000px] border border-dashed border-gray-300 rounded-md"
                    style={{
                        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                        transformOrigin: "top left",
                        cursor: isDragging ? "grabbing" : "grab"
                    }}
                >
                    <Xwrapper>
                        {steps.map((step) => (
                            <WorkspaceStep
                                key={step.id}
                                step={step}
                                onSelect={() => onSelectStep(step)}
                                onConnect={handleConnect}
                                removeStep={deleteComponent}
                                workspaceRect={workspaceRect}
                                pan={pan}
                                zoom={zoom}
                            />
                        ))}
                        {connections.map((connection, index) => (
                            <Xarrow
                                key={index}
                                start={connection.from.toString()}
                                end={connection.to.toString()}
                                color="gray"
                                path="smooth"
                                startAnchor="right"
                                endAnchor="left"
                                showHead={false}
                                SVGcanvasStyle={{
                                    transform: `scale(${1 / zoom})`,
                                    transformOrigin: "top left",
                                }}
                                divContainerProps={{
                                    className: 'cursor-pointer',
                                    onMouseDown: (event) => {
                                        if (event.ctrlKey) {
                                            handleRemoveConnection(connection.from, connection.to)
                                            return
                                        }
                                    }
                                }}
                            />
                        ))}
                    </Xwrapper>
                </div>
            </div>
        </div>
    )
}