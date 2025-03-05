import {useDrag} from "react-dnd"
import {iconMap} from "./path-component"
import React, {useEffect, useState} from "react"
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,} from "~/components/ui/context-menu"
import {PathStep} from "~/components/flow-creator/workspace";
import Xarrow, {useXarrow, Xwrapper} from "react-xarrows";
import {useStateRef} from "~/hooks/use-state-ref";

interface WorkspaceStepProps {
    step: PathStep
    onSelect: () => void
    onConnect: (fromId: string, type: 'left' | 'right', x: number, y: number) => void
    removeStep: (id: string) => void,
    workspaceRect?: DOMRect,
    pan: { x: number, y: number }
    zoom: number
}

export default function WorkspaceStep({step, onSelect, onConnect, removeStep, workspaceRect, pan, zoom}: WorkspaceStepProps) {
    const [connecting, setConnecting] = useState(null as 'left' | 'right' | null)

    const updateXarrow = useXarrow();

    const [{isDragging}, drag] = useDrag(() => ({
        type: "workspace-step",
        item: step,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        end: () => {
            updateXarrow()
        }
    }), [step])

    const Icon = iconMap[step.icon]

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    ref={(node) => {
                        drag(node);
                    }}
                    className={`absolute p-2 bg-white dark:bg-zinc-950 border rounded-md shadow-sm cursor-move ${
                        isDragging ? "opacity-50" : ""
                    }`}
                    style={{
                        left: step.position.x,
                        top: step.position.y,
                    }}
                    onClick={onSelect}
                    data-step-id={step.id}
                    id={step.id}
                >
                    <div className="flex items-center">
                        {Icon && <Icon className="w-5 h-5 mr-2"/>}
                        <span className="text-sm font-medium">{step.name}</span>
                    </div>
                    <Xwrapper>
                        <ConnectionDots step={step} connecting={connecting} workspaceRect={workspaceRect} pan={pan} zoom={zoom} onConnect={onConnect} setConnecting={setConnecting}/>
                    </Xwrapper>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => removeStep(step.id)}>
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

function ConnectionDots({step, connecting, setConnecting, workspaceRect, pan, zoom, onConnect}: {
    step: PathStep,
    connecting: 'left' | 'right' | null,
    setConnecting: (connecting: 'left' | 'right' | null) => void
    workspaceRect?: DOMRect,
    pan: { x: number, y: number }
    zoom: number
    onConnect: (fromId: string, type: 'left' | 'right', x: number, y: number) => void
}) {
    const [relMouseX, setRelMouseX] = useState(0)
    const [relMouseY, setRelMouseY] = useState(0)

    const panRef = useStateRef(pan)
    const zoomRef = useStateRef(zoom)

    const updateXarrow = useXarrow();

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (workspaceRect == null) {
                return
            }

            const viewportX = event.clientX - workspaceRect.left
            const viewportY = event.clientY - workspaceRect.top

            setRelMouseX((viewportX / zoomRef.current) - (panRef.current.x / zoomRef.current))
            setRelMouseY((viewportY / zoomRef.current) - (panRef.current.y / zoomRef.current))

            updateXarrow()
        }
        const handleMouseUp = (event: MouseEvent) => {
            if (connecting != null) {
                event.preventDefault()
                event.stopPropagation()
                setConnecting(null)

                const elem = document.getElementById(`${step.id}-preview-arrow`)
                if (elem == null) return
                onConnect(step.id, connecting, elem.getBoundingClientRect().left, elem.getBoundingClientRect().top)
            }
        }
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [workspaceRect, onConnect, connecting, setConnecting])


    return <div className="mt-2 flex justify-between">
            <div className="w-2 h-2 bg-gray-300 rounded-full cursor-pointer" id={`${step.id}-left`} onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setConnecting('left')
            }}/>
            <div className="w-2 h-2 bg-gray-300 rounded-full cursor-pointer" id={`${step.id}-right`} onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setConnecting('right')
            }}/>

            {connecting !== null && <>
                <div className={'fixed h-5 w-5'} id={`${step.id}-preview-arrow`} style={{
                    left: relMouseX,
                    top: relMouseY,
                }}/>

                <Xarrow
                    start={step.id + '-' + connecting}
                    end={step.id + '-preview-arrow'}
                    color="gray"
                    path="smooth"
                    startAnchor={connecting}
                    endAnchor={connecting === 'left' ? 'right' : 'left'}
                    SVGcanvasStyle={{
                        transform: `scale(${1 / zoomRef.current})`,
                        transformOrigin: "top left",
                    }}
                    showHead={false}
                />
            </>}
    </div>
}

