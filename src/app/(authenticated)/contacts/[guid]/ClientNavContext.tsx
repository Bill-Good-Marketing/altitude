'use client';
import React, {useEffect} from "react";
import {ContactType} from "~/common/enum/enumerations";
import {useAIContext} from "~/app/(authenticated)/pathfinder/AIContext";

export declare type ContactInfo = {
    guid: string,
    fullName: string,
    primaryEmail: string | null,
    type: ContactType,
    primaryPhone: string | null,
    primaryAddress: {
        city: string,
        state: string,
        country: string,
        tz: string | null
    } | null
}

export const ContactSelectionContext = React.createContext<{
    selectedContact: ContactInfo | null
    setSelectedContact: (contact: ContactInfo) => void
}>({
    selectedContact: null,
    setSelectedContact: () => {
    }
})

export function ContactSelectionProvider({children, defaultValue}: {
    children: React.ReactNode,
    defaultValue: ContactInfo
}) {
    const [selectedContact, setSelectedContact] = React.useState<ContactInfo>(defaultValue)
    const {setContact} = useAIContext()

    useEffect(() => {
        if (defaultValue == null || defaultValue.guid == null || defaultValue.fullName == null) {
            return
        }
        setContact(defaultValue.guid, defaultValue.fullName)
    }, [defaultValue])

    const handleSelect = (contact: ContactInfo) => {
        setSelectedContact(contact)
        setContact(contact.guid, contact.fullName)
    }

    return <ContactSelectionContext.Provider value={{
        selectedContact,
        setSelectedContact: handleSelect
    }}>
        {children}
    </ContactSelectionContext.Provider>
}

export function useContactSelection() {
    const {selectedContact, setSelectedContact} = React.useContext(ContactSelectionContext)
    return {selectedContact, setSelectedContact}
}