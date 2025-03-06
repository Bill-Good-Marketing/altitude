'use client';
// Custom state hook that persists values in session storage so that search-related parameters are remembered across pages.
// Manually reloading the page will reset the state.

import React, {createContext, Dispatch, SetStateAction, useContext, useEffect, useRef, useState} from "react";
import {
    ActivityPriority,
    ActivityStatus,
    ActivityType,
    ContactStatus,
    ContactType,
    HouseholdRelationshipStatus,
    OpportunityStatus,
    TaskScheduleType
} from "~/common/enum/enumerations";
import {TimePeriod} from "~/app/(authenticated)/opportunities/client/opportunity-filters";

type Serializable =
    string
    | number
    | boolean
    | null
    | undefined
    | Date
    | ContactType
    | ContactStatus
    | HouseholdRelationshipStatus
    | ActivityType
    | ActivityStatus
    | TaskScheduleType
    | ActivityPriority
    |OpportunityStatus
    | TimePeriod
    | Array<any>
    | object;

function serialize(value: Serializable): string {
    'use no memo';
    return JSON.stringify(value);
}

function deserialize(value: string): Serializable {
    'use no memo';
    return JSON.parse(value);
}

/* Use in case formatting stuff screws it up
type GenerifiedPersisted<T extends Serializable> =
    T extends ContactType ? ContactType :
    T extends ContactStatus ? ContactStatus :
    T extends HouseholdRelationshipStatus ? HouseholdRelationshipStatus :
    T extends ActivityType ? ActivityType :
    T extends ActivityStatus ? ActivityStatus :
    T extends TaskScheduleType ? TaskScheduleType :
    T extends ActivityPriority ? ActivityPriority :
    T extends TimePeriod ? TimePeriod :
    T extends OpportunityStatus ? OpportunityStatus :
    T extends string ? string :
    T extends number ? number :
    T extends boolean ? boolean :
    T extends Date ? Date :
    T extends null ? null :
    T extends undefined ? undefined :
    T extends object ? T:
    T extends Array<any> ? T :
    never;
*/

type GenerifiedPersisted<T extends Serializable> =
    T extends ContactType ? ContactType :
    T extends ContactStatus ? ContactStatus :
    T extends HouseholdRelationshipStatus ? HouseholdRelationshipStatus :
    T extends ActivityType ? ActivityType :
    T extends ActivityStatus ? ActivityStatus :
    T extends TaskScheduleType ? TaskScheduleType :
    T extends ActivityPriority ? ActivityPriority :
    T extends TimePeriod ? TimePeriod :
    T extends OpportunityStatus ? OpportunityStatus :
    T extends string ? string :
    T extends number ? number :
    T extends boolean ? boolean :
    T extends Date ? Date :
    T extends null ? null :
    T extends undefined ? undefined :
    T extends object ? T:
    T extends Array<any> ? T :
    never;

export function usePersisted<T extends Array<Serializable>[0]>(initialValue: T): [GenerifiedPersisted<T>, Dispatch<SetStateAction<GenerifiedPersisted<T>>>] {
    // Type hacking
    const [value, setValue] = useState<GenerifiedPersisted<T>>(initialValue as unknown as GenerifiedPersisted<T>);
    const [key, setKey] = useState<string>();
    const observerRef = useRef<PerformanceObserver | null>(null);

    const {register} = useContext(PersistenceContext);

    useEffect(() => {
        const key = register();
        const serialized = sessionStorage.getItem(key);
        if (serialized) {
            setValue(deserialize(serialized) as GenerifiedPersisted<T>);
        }

        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if ((entry as PerformanceNavigationTiming).type === "reload") {
                    // Remove data from session storage
                    sessionStorage.removeItem(key);
                }
            });
        });

        observer.observe({type: "navigation", buffered: true});

        observerRef.current = observer;
        setKey(key);
    }, [])

    useEffect(() => {
        if (key != null) {
            const serialized = serialize(value as Serializable);
            console.time('setItem');
            sessionStorage.setItem(key, serialized);
            console.timeEnd('setItem');
        }
    }, [value, key])

    return [value, setValue];
}

const PersistenceContext = createContext<{
    register: () => string
}>({
    register: () => ''
});

export function PersistenceProvider({children}: { children: React.ReactNode }) {
    const keyCount = useRef(0);

    const register = () => {
        const location = window.location.pathname;
        const key = location + ':persist-state:' + keyCount.current.toString();
        keyCount.current += 1;
        return key;
    }

    useEffect(() => {
        keyCount.current = 0;
    }, [])

    return (
        <PersistenceContext.Provider value={{register}}>
            {children}
        </PersistenceContext.Provider>
    );
}