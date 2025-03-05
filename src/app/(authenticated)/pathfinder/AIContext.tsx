'use client';
import React from "react";

type AIContext = {
    contactId: string | null,
    contactName: string | null,
    setContact: (contactId: string, contactName: string) => void
}

export const AIContext = React.createContext<AIContext>({
    contactId: null,
    contactName: null,
    setContact: () => {}
})

export const useAIContext = () => React.useContext(AIContext)

export function AIContextProvider({children}: { children: React.ReactNode }) {
    const [contactId, setContactId] = React.useState<string | null>(null)
    const [contactName, setContactName] = React.useState<string | null>(null)

    const setContact = (contactId: string, contactName: string) => {
        setContactId(contactId)
        setContactName(contactName)
    }

    return <AIContext.Provider value={{contactId, contactName, setContact}}>
        {children}
    </AIContext.Provider>
}