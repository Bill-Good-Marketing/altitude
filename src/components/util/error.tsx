import React from "react";

export default function NotFound() {
    return (
        <div className={'flex m-auto text-center'} style={{
            alignItems: 'center',
            height: '100vh'
        }}>
            <div style={{
                alignSelf: 'center',
            }}>
                <h1><b>404</b></h1>
                <h3>{'It seems like that page doesn\'t exist!'}</h3>
                <a href={'/'} className={'text-secondary'}>Return Home</a>
            </div>
        </div>
    )
}

export function DefaultError({children}: {children: React.ReactNode}) {
    return <div className={'text-center vw-100 vh-100 position-absolute'} style={{
        top: 0,
        left: 0,
    }}>
        <div className={'flex m-auto text-center w-full h-full'} style={{
            alignItems: 'center'
        }}>
            <div>
                {children}
            </div>
        </div>
    </div>
}