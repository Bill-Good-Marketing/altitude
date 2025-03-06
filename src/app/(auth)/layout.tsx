import React from "react";

export default function UnauthenticatedLayout({children}: { children: React.ReactNode }) {
    return <>
        <main>
            {children}
        </main>
    </>
}