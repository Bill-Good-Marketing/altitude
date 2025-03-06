'use client';
import React from "react";
import {ValidationContextType} from "~/components/data/ValidationProvider";

export const PublicValidationContext = React.createContext<Pick<ValidationContextType, 'clear' | 'validate' | 'reset' | 'resetValidation' | 'validateElement' | 'clearValidation'> & {
    isValid: (element: string) => boolean
}>({
    validate: () => {
        return [true, {}]
    },
    reset: () => {
    },
    resetValidation: () => {
    },
    validateElement: () => {
        return true
    },
    isValid: () => {
        return true
    },
    // Clears all validations with a given key. Useful for clearing subforms with a common key such as an id.
    clearValidation: () => {
    },
    clear: () => {
    }
})

export const useValidation = () => React.useContext(PublicValidationContext)