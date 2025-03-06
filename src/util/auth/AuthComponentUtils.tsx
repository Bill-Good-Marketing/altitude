//import 'server-only';
import {AccessGroup} from "~/common/enum/enumerations";
import React from "react";
import {notFound, redirect} from "next/navigation";
import {getAuthSession} from "~/util/auth/AuthUtils";
import {headers} from "next/headers";
import {LogLevel} from "~/common/enum/serverenums";
import {User} from "~/db/sql/models/User";
import {Log} from "~/db/sql/models/Log";
import {DefaultError} from "~/components/util/error";
import {connection} from "next/server";
import {quickTrace} from "~/util/tracing";
import { Redirect } from "~/components/util/Redirect";

export interface AuthenticatedComponentProps {
    requester: User,
    params: Promise<any>,
    searchParams: Promise<{ [key: string]: any }>
}

export function withAuthentication(ServerComponent: React.FC<AuthenticatedComponentProps>, requiredRoles?: AccessGroup[], hidden?: boolean) {
    return async function WrappedAuthenticatedComponent({params, searchParams}: {
        params: Promise<any>,
        searchParams: Promise<{ [key: string]: any }>
    }) {
        if (process.env.INSTRUMENTATION === 'true') {
            await connection();
        }
        return quickTrace('wrapper.withAuthentication', async (span) => {
            const user = await getAuthSession();

            if (user == null) {
                span.setAttribute('wrapper.user', 'unauthenticated');
            } else if (user === 'refresh') {
                span.setAttribute('wrapper.user', 'refresh');
            } else {
                span.setAttribute('wrapper.user', user.type ?? 'undefined');
            }

            if (user === 'refresh') {
                if (hidden) {
                    return notFound();
                }
                const headerList = await headers();
                const searchParams = new URLSearchParams();
                const activePath = headerList.get('x-pathname');
                if (activePath) {
                    searchParams.set('redirect', activePath);
                } else {
                    searchParams.set('redirect', '/');
                }
                return redirect(`/token-refresh?${searchParams.toString()}`);
            }
            if (user == null || (requiredRoles && !requiredRoles.includes(user.type!))) {
                if (hidden) {
                    const headerList = await headers();
                    const ip = headerList.get('x-real-ip') || headerList.get('x-forwarded-for') || 'unknown';
                    const activePath = headerList.get('x-pathname');
                    if (user != null && user.trueAccess != null && requiredRoles?.includes(user.trueAccess)) {
                        return <DefaultError>
                            <h1>Woah there!</h1>
                            <h3>You normally have permission to access this page, but your view does not have permission
                                to
                                be here.</h3>
                            <p className={'text-secondary text-bold'}>Please go to another page or change your view to
                                one
                                that <i>can</i> access this page!</p>
                        </DefaultError>
                    }
                    await Log.log(`User attempted to access a hidden page ${activePath} without the required permissions`, LogLevel.WARNING, undefined, user?.email, `IP: ${ip}`, `withAuthentication ${activePath}`, user?.tenetId);
                    return notFound();
                }
                return <Redirect to={'/login'}/>;
            }
            return <ServerComponent requester={user} params={params} searchParams={searchParams}/>
        })
    }
}

export function withAdminAuthentication(ServerComponent: React.FC<AuthenticatedComponentProps>) {
    return withAuthentication(ServerComponent, [AccessGroup.ADMIN, AccessGroup.SYSADMIN], true);
}