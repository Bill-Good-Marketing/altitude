'use client';
import React from "react";

export function DateRenderer({date, fallback='Unknown', includeTime = false}: { date: Date | null, fallback?: string, includeTime?: boolean }) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <>Loading...</>
    }

    if (date == null) {
        return <>{fallback}</>
    }

    return <>{includeTime ? date.toLocaleString() : date.toLocaleDateString()}</>
}

export function DateTimeRenderer({date, fallback = 'Unknown'}: { date: Date | null, fallback?: string }) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <>Loading...</>
    }

    if (date == null) {
        return <>{fallback}</>
    }

    return <>{date.toLocaleString()}</>
}