import {getAuthSession} from "~/util/auth/AuthUtils";
import React from "react";
import TokenRefresh from "~/app/(auth)/token-refresh/client";
import {redirect} from "next/navigation";
import SessionWrapper from "~/components/util/SessionWrapper";

export default async function RefreshTokenPage({searchParams}: { searchParams?: Promise<{ redirect?: string }> }) {
    const user = await getAuthSession();
    const _redirect = (await searchParams)?.redirect;
    if (user === 'refresh') {
        return <div className={'text-center'} style={{
            alignItems: 'center',
            height: '100vh'
        }}>
            <div style={{
                alignSelf: 'center',
            }}>
                <h1><b>{"We're updating some data..."}</b></h1>
                <h3>{'Please wait a moment and then we\'ll take you back to the page you were on.'}</h3>
                <SessionWrapper><TokenRefresh actuallyRefresh={true} redirectUri={_redirect ?? '/'}/></SessionWrapper>
            </div>
        </div>
    } else if (user == null) {
        return redirect('/login');
    } else {
        return <SessionWrapper><TokenRefresh actuallyRefresh={false} redirectUri={_redirect ?? '/'}/></SessionWrapper>
    }
}

