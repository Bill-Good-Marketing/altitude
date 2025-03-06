import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"
import React from "react";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getChildOfType<T extends React.FC<any>>(children: React.ReactNode, type: T): [ReturnType<T> | null, React.ReactNode] {
    const childrenArray = React.Children.toArray(children)
    const _child: ReturnType<T> | null = childrenArray.find(child => React.isValidElement(child) && child.type === type) as ReturnType<T>

    const newChildren = React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === type) {
            return null
        }
        return child
    });

    return [_child, newChildren];
}

export const generateClientId = () => {
    'use no memo'
    return Math.random().toString(16).substring(2, 12) // Generates a random string
}