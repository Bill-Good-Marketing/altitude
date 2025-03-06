'use client';
import {useSession} from "next-auth/react";
import React, {useEffect} from "react";
import {Session} from "next-auth";

export default function TokenRefresh({actuallyRefresh, redirectUri}: {
    actuallyRefresh: boolean,
    redirectUri?: string
}) {
    const {update, status, data: _data} = useSession();
    const data = _data as Session & { refresh: boolean };

    useEffect(() => {
        async function main() {
            if (actuallyRefresh) {
                await update({
                    refresh: true
                })
            }
            if (redirectUri === '/token-refresh') {
                window.location.assign('/');
            } else window.location.assign(redirectUri ?? '/');
        }

        if (status === 'authenticated' && data?.refresh) {
            main();
        } else if (status === 'authenticated' && !data?.refresh) {
            if (redirectUri === '/token-refresh') {
                window.location.assign('/');
            } else window.location.assign(redirectUri ?? '/');
        }
    }, [status])

    return <></>
}