import React from "react";

export declare type SkeletonFormProps = {
    children?: React.ReactNode
}

export default function SkeletonForm({children}: SkeletonFormProps) {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (ref.current) {
            const thisChildren = ref.current.getElementsByTagName('input');
            for (let i = 0; i < thisChildren.length; i++) {
                const elem = thisChildren[i].parentElement; // Get parent div to apply styles to since inputs don't support shimmers
                const child = thisChildren[i]; // Get the input itself
                if (elem == null) {
                    continue;
                }
                if (child.type !== 'checkbox') {
                    elem.classList.add('animate-shimmer', 'animate-pulse', 'rounded-md', 'bg-gray-400');
                }
                child.disabled = true;
                child.value = '';
                child.checked = false;
            }
            const _thisChildren = ref.current.getElementsByTagName('button');
            for (let i = 0; i < _thisChildren.length; i++) {
                const elem = _thisChildren[i].parentElement;
                const child = _thisChildren[i];

                if (elem == null) {
                    continue;
                }

                if (child.role === 'combobox') {
                    elem.classList.add('animate-shimmer', 'animate-pulse', 'rounded-md', 'bg-gray-400', 'text-foreground');
                    child.disabled = true;
                    const placeholder = child.getElementsByTagName('span')[0];
                    if (placeholder) {
                        placeholder.classList.remove('text-primary-foreground');
                        placeholder.classList.add('text-primary')
                    }
                }
            }
            ref.current.style.display = '';
        }
    }, [])

    return <div className="grid gap-4" ref={ref} style={{display: 'none'}} onPointerDownCapture={(event) => {
        event.stopPropagation()
        event.preventDefault()
    }} onClickCapture={(event) => {
        event.stopPropagation()
        event.preventDefault()
    }}>
        {children}
    </div>
}