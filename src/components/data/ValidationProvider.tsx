'use client';
import React from "react";
import {isEmptyString} from "~/util/strings";
import {PublicValidationContext} from "~/hooks/use-validation";
import {useStateRef} from "~/hooks/use-state-ref";

type ValidationResult = true | string

export declare type ValidationContextType = {
    validatedElements: Record<string, (value: any) => ValidationResult>,
    registerValidatedElement: (element: string, validator: (value: any) => ValidationResult) => void,
    validate: () => [boolean, Record<string, ValidationResult>],
    reset: () => void,
    resetValidation: (element: string) => void,
    validateElement: (element: string) => ValidationResult,
    validationResults: Record<string, ValidationResult>,
    setValidationValue: (element: string, value: any, revalidate?: boolean) => void
    // Removes elements from the validation context with a search key
    clearValidation: (searchKey: string) => void
    // Removes elements from the validation context
    clear: () => void
}

const ValidationContext = React.createContext<ValidationContextType>({
    // True indicates that the element is validated, false indicates that the element doesn't need to be validated, and a string indicates a validation error
    validatedElements: {},
    registerValidatedElement: () => {
    },
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
    validationResults: {},
    setValidationValue: () => {
    },
    clearValidation: () => {
    },
    clear: () => {
    }
})

export function ValidationProvider({children}: { children: React.ReactNode }) {
    const [validatedElements, setValidatedElements] = React.useState<Record<string, (value: any) => ValidationResult>>({});
    const [validationResults, setValidationResults] = React.useState<Record<string, ValidationResult>>({});
    const [validationValues, setValidationValues] = React.useState<Record<string, any>>({});

    const validatedElementsRef = useStateRef(validatedElements);
    const validationResultsRef = useStateRef(validationResults);
    const validationValuesRef = useStateRef(validationValues);

    const registerValidatedElement = (element: string, validator: (value: any) => ValidationResult) => {
        setValidatedElements(prev => ({...prev, [element]: (validator)}))
        setValidationResults(prev => ({...prev, [element]: true}))
    }

    const reset = () => {
        setValidationResults({})

        for (const _element in validatedElementsRef.current) {
            const element = document.getElementById(_element);
            if (element) {
                element.classList.remove('invalid')
            }
        }
    }

    const clear = () => {
        setValidationResults({})
        setValidatedElements({})
        setValidationValues({})
    }

    const resetValidation = (_element: string) => {
        setValidationResults(prev => {
            const newValidationResults = {...prev}
            delete newValidationResults[_element]
            return newValidationResults
        })

        const element = document.getElementById(_element);
        if (element) {
            element.classList.remove('invalid')
        }
    }

    const validate = (): [boolean, Record<string, ValidationResult>] => {
        let valid = true;
        const validationResults = {} as Record<string, ValidationResult>;
        for (const _element in validatedElementsRef.current) {
            const element = document.getElementById(_element);
            if (!element) continue;
            const result = validatedElementsRef.current[_element](validationValuesRef.current[_element]);
            validationResults[_element] = result;
            if (typeof result === 'string') {
                valid = false;
            }
            if (element) {
                if (typeof result === 'string') {
                    element.classList.add('invalid')
                } else {
                    element.classList.remove('invalid')
                }
            }
        }
        setValidationResults(validationResults);
        return [valid, validationResults];
    }

    const validateElement = (_element: string) => {
        if (_element in validatedElementsRef.current) {
            const result = validatedElementsRef.current[_element](validationValuesRef.current[_element]);
            setValidationResults(prev => ({...prev, [_element]: result}))
            const element = document.getElementById(_element);
            if (element) {
                if (typeof result === 'string') {
                    element.classList.add('invalid')
                } else {
                    element.classList.remove('invalid')
                }
            }
            return result;
        }
        return true;
    }

    const isValid = (element: string) => {
        return validationResultsRef.current[element] === true
    }

    const setValidationValue = (element: string, value: any, revalidate?: boolean) => {
        setValidationValues(prev => ({...prev, [element]: value}))

        if (revalidate && element in validatedElementsRef.current) {
            setValidationResults(prev => ({...prev, [element]: validatedElementsRef.current[element](value)}))
        }
    }

    const clearValidation = (searchKey: string) => {
        setValidationValues(prev => {
            const newValidationValues = {...prev}
            for (const key in newValidationValues) {
                if (key.includes(searchKey)) {
                    delete newValidationValues[key]
                }
            }
            return newValidationValues
        })
        setValidationResults(prev => {
            const newValidationResults = {...prev}
            for (const key in newValidationResults) {
                if (key.includes(searchKey)) {
                    delete newValidationResults[key]
                }
            }
            return newValidationResults
        })
        setValidatedElements(prev => {
            const newValidatedElements = {...prev}
            for (const key in newValidatedElements) {
                if (key.includes(searchKey)) {
                    delete newValidatedElements[key]
                }
            }
            return newValidatedElements
        })
    }

    return <ValidationContext.Provider value={{
        validatedElements,
        registerValidatedElement,
        validate,
        reset,
        resetValidation,
        validationResults,
        validateElement,
        setValidationValue,
        clearValidation,
        clear
    }}>
        <PublicValidationContext.Provider value={{
            validate,
            reset,
            resetValidation,
            validateElement,
            isValid,
            clearValidation,
            clear,
        }}>
            {children}
        </PublicValidationContext.Provider>
    </ValidationContext.Provider>

}

export function Validation<T>({validator, element, render, value, revalidate}: {
    validator: (value: T) => ValidationResult,
    element: string,
    render?: (result: ValidationResult) => React.ReactNode,
    value?: T,
    revalidate?: boolean
}) {
    const {
        registerValidatedElement,
        resetValidation,
        validationResults,
        validateElement,
        setValidationValue
    } = React.useContext(ValidationContext)

    React.useEffect(() => {
        const _element = element
        const _resetValidation = resetValidation
        registerValidatedElement(_element, validator)

        return () => {
            _resetValidation(_element)
        }
    }, [element, registerValidatedElement, resetValidation, validator])

    React.useEffect(() => {
        setValidationValue(element, value, revalidate)
    }, [element, revalidate, setValidationValue, validateElement, value])

    if (validationResults[element] == null || validationResults[element] === true) {
        return <></>
    }

    return render ? render(validationResults[element]) : <p className={'text-red-500'}>{validationResults[element]}</p>
}

export const RequiredString = ({element, friendlyName, value, render}: {
    element: string,
    friendlyName: string,
    value: string | null,
    render?: (result: ValidationResult) => React.ReactNode
}) => {
    return <Validation render={render} value={value} validator={(value) => {
        return isEmptyString(value) ? `${friendlyName} is required` : true
    }} element={element}/>
}

export const RequiredDate = ({element, value, render}: {
    element: string,
    value?: Date | null,
    render?: (result: ValidationResult) => React.ReactNode
}) => {
    return <Validation render={render} value={value} validator={(value) => {
        if (value == null) {
            return 'Date is required'
        } else if (isNaN(value.getTime())) {
            return 'Invalid date'
        }
        return true
    }} element={element}/>
}