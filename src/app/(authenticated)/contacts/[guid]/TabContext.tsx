'use client';
import React from "react";
import {Tabs} from "~/components/ui/tabs";

export function TabHandler({children}: { children: React.ReactNode }) {
    const {currentTab, setCurrentTab} = useTabContext()

    return <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value)}>
        {children}
    </Tabs>
}

export const TabContext = React.createContext({
    currentTab: 'overview',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setCurrentTab: (value: string) => {
    }
})

export const useTabContext = () => React.useContext(TabContext)

export function TabProvider({children}: { children: React.ReactNode }) {
    const [currentTab, setCurrentTab] = React.useState('overview')

    return <TabContext.Provider value={{currentTab, setCurrentTab}}>
        {children}
    </TabContext.Provider>
}