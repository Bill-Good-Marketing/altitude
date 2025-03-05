//import 'server-only';
import {connection, NextRequest, NextResponse} from "next/server";
import {AccessGroup} from "~/common/enum/enumerations";
import {notFound} from "next/navigation";
import {API} from "~/util/api/ApiResponse";
import {NonGenericServerError, ReadOnlyError, UniqueConstraintViolationError, ValidationError} from "~/common/errors";
import {ToastResponse} from "~/util/api/client/APIClient";
import {AccessGroupHierarchy, LogLevel} from "~/common/enum/serverenums";
import {cookies, headers} from "next/headers";
import {getMaintenanceMessage, isMaintenance} from "~/util/maintenance";
import {User} from "~/db/sql/models/User";
import {Log} from "~/db/sql/models/Log";
import {JWTToken, TOKEN_VERSION} from "~/app/api/auth/[...nextauth]/route";
import {decode} from "next-auth/jwt";
import {Token} from "~/db/sql/models/Token";
import {cacheThis} from "~/util/api/caching";
import {isAdmin} from "~/util/auth/Permissions";
import {quickTrace} from "~/util/tracing";

let unittestUser: User | null = null;

export async function getJWTToken(): Promise<JWTToken | null> {
    const cookieName = process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
    let tokenCookie = (await cookies()).get(cookieName);
    if (tokenCookie == null && process.env.NODE_ENV === 'production') {
        tokenCookie = (await cookies()).get('next-auth.session-token');
    }
    if (tokenCookie == null) {
        return null;
    }
    try {
        return await decode({
            token: tokenCookie.value,
            secret: process.env.NEXTAUTH_SECRET!,
        }) as JWTToken | null;
    } catch (e) {
        await Log.log(`Error decoding JWT token. Likely the encryption secret has changed.`, LogLevel.HIGH, (e as Error).stack, undefined, `${(e as Error).message}`, 'getAuthToken');
        return null;
    }
}

export function validateJWT(token: JWTToken) {
    return !(token.version == null || token.user == null || token.user.type == null || token.user.guid == null || (token.user.tenetId == null && token.user.type === AccessGroup.CLIENT));
}

export const getAuthSession = async (): Promise<User | null | 'refresh'> => {
    return quickTrace('getAuthSession', async (span) => {
        if (process.env.NODE_ENV === 'test') {
            return unittestUser;
        }
        const token = await quickTrace('getAuthSession#getJWTToken', async () => await getJWTToken());
        if (token == null) {
            return null;
        }

        const validateToken = validateJWT(token);

        if (!validateToken) {
            span.setAttribute('wrapper.failureFlag', 'invalidToken');
            span.setAttribute('wrapper.unauthorized', true);
            return null;
        }

        if (token.invalidated || token.version !== TOKEN_VERSION) {
            const tokenObj = new Token(token.tokenId)
            await tokenObj.delete();
            span.setAttribute('wrapper.failureFlag', 'invalidToken');
            span.setAttribute('wrapper.unauthorized', true);
            return null;
        }

        const validToken = await isTokenValid(token);
        if (validToken === false) {
            span.setAttribute('wrapper.failureFlag', 'invalidToken');
            span.setAttribute('wrapper.unauthorized', true);
            return null;
        } else if (validToken === 'refresh') {
            span.setAttribute('wrapper.failureFlag', 'refreshToken');
            span.setAttribute('wrapper.unauthorized', true);
            return 'refresh';
        }

        let userData = token.user;
        if (token.viewData && isAdmin(token.user.type)) {
            userData = token.viewData;
        }
        const user = new User(userData.guid, {
            fullName: userData.fullName,
            email: userData.email,
            type: userData.type,
            enabled: userData.enabled,
            tenetId: token.user.tenetId ? Buffer.from(token.user.tenetId, 'hex') : null
        })
        user.new = false;
        if (token.viewData) {
            // Don't want to let people modify another user's data.
            user.trueAccess = token.user.type;
            // If the user view is not a system user and not staff, then make the view read only
            // TODO: May want to add system users later
            user.setReadOnly();
        }
        return user;
    })
}

export async function withUser(user: User, callback: () => Promise<any>): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('This function is only for testing');
    }

    unittestUser = user;
    await callback();
    unittestUser = null;
}

export function apiRouteWrapper<T>(callback: (user: User, req: NextRequest, res: NextResponse) => Promise<NextResponse<T>>, requiredRoles?: AccessGroup[], hidden?: boolean) {
    return async (req: NextRequest, res: NextResponse) => {
        if (process.env.INSTRUMENTATION === 'true') {
            await connection();
        }
        return quickTrace('apiRouteWrapper', async (span) => {
            const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
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
                return API.error('Token Refresh Required', 401);
            }

            const maintenance = isMaintenance();
            const message = getMaintenanceMessage();

            if (user == null || (requiredRoles && !requiredRoles.includes(user.type!))) {
                if (maintenance && !user?.isAdmin) {
                    return API.error(message, 503);
                }
                let body = ''
                if (req.headers.get('Content-Type') === 'application/json') {
                    body = JSON.stringify(await req.json(), null, 2);
                } else {
                    body = await req.text();
                }
                if (hidden) {
                    if (user?.trueAccess == null || requiredRoles?.includes(user.trueAccess)) {
                        return API.error('We know you can access this route, but your view does not have permission to send this request.', 403);
                    }
                    await Log.log(`Unauthorized access attempt to protected and hidden API route (${req.url})`, LogLevel.CRITICAL, undefined, user?.email, `Route: ${req.url}#${req.method}\n\nRequest: ${body}\n\nIP: ${ip}`, `apiRouteWrapper/${callback.name}`, user?.tenetId);
                    return notFound();
                }
                await Log.log(`Unauthorized access attempt to API route (${req.url})`, LogLevel.CRITICAL, undefined, user?.email, `Route: ${req.url}#${req.method}\n\nRequest: ${body}\n\nIP: ${ip}`, `apiRouteWrapper/${callback.name}`, user?.tenetId);
                return API.error('Unauthorized', 401);
            }

            const clonedReq = req.clone();

            return await callback(user, req, res).catch(async (e) => {
                let body = ''
                if (req.headers.get('Content-Type') === 'application/json') {
                    body = JSON.stringify(await clonedReq.json(), null, 2);
                } else {
                    body = await clonedReq.text();
                }
                if (ValidationError.is(e)) {
                    return API.error(e.message, 400);
                } else if (UniqueConstraintViolationError.is(e)) {
                    return API.error(e.getClientMessage(), 409);
                } else if (NonGenericServerError.is(e)) {
                    console.error(e);
                    await Log.log(e.getLogMessage(), e.securitySeverity, (e.cause as Error | undefined)?.stack, user.email, `Route: ${req.url}#${req.method}\n\nRequest: ${body}\n\nIP: ${ip}`, `apiRouteWrapper/${callback.name}`, user?.tenetId);
                    return API.error(e.getClientMessage(), 500);
                } else if (ReadOnlyError.is(e)) {
                    return API.error(e.getClientMessage(), 403);
                }
                console.error(e);
                await Log.log('Internal Server Error', LogLevel.HIGH, e.stack, user.email, `Route: ${req.url}#${req.method}\n\nRequest: ${body}\n\nIP: ${ip}`, `apiRouteWrapper/${callback.name}`, user?.tenetId);
                return API.error('Internal Server Error', 500);
            });
        });
    }
}

export async function getIP() {
    const _headers = await headers();
    return _headers.get('x-real-ip') || _headers.get('x-forwarded-for') || 'unknown';
}

/**
 * Checks if the requester has the permission to update the target type
 *
 * A permission level cannot update a permission level above it or the same permission level except for SYSADMIN.
 *
 * System support and above have update permissions to begin with.
 * @param requesterType The access group of the requester
 * @param targetType The access group of the target
 * @returns True if the requester has the permission to update the target type, false otherwise
 */
export function hasUpdatePermission(requesterType: AccessGroup, targetType: AccessGroup) {
    // TODO: May want to add a sys admin role later
    return requesterType === AccessGroup.ADMIN && targetType !== AccessGroup.ADMIN;
}

/**
 * Returns the permissions that the requester can assign to another user, assuming they can update the target user.
 * @param requesterType The access group of the requester
 * @returns The permissions that the requester can assign to another user
 */
export function getAssignablePermissions(requesterType: AccessGroup) {
    switch (requesterType) {
        // case AccessGroups.SYSADMIN:
        case AccessGroup.ADMIN:
            return AccessGroupHierarchy;
        // case AccessGroups.ADMIN:
        //     const adminIndex = AccessGroupHierarchy.indexOf(AccessGroups.ADMIN);
        //     return AccessGroupHierarchy.slice(0, adminIndex); // All permissions before the admin index
        default:
            return [];
    }
}

export function serverActionWrapper<T, U extends any[]>(callback: (user: User, ...args: U) => Promise<T>, requiredRoles?: AccessGroup[], hidden?: boolean, ignoreArgs: boolean = false) {
    return async (...args: U): Promise<T | ToastResponse> => {
        if (process.env.INSTRUMENTATION === 'true') {
            await connection();
        }
        return quickTrace(callback.name, async (span) => {
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
                return API.toast('Token Refresh Required', 'error', 401);
            }
            const ip = await getIP();
            if (user == null || (requiredRoles && !requiredRoles.includes(user.type!))) {
                if (hidden) {
                    if (user?.trueAccess == null || requiredRoles?.includes(user.trueAccess)) {
                        return API.toast('We know you can access this route, but your view does not have permission to send this request.', 'error', 403);
                    }
                    await Log.log(`Unauthorized access attempt to protected and hidden server action (${callback.name})`, LogLevel.CRITICAL, undefined, user?.email, `Arguments: ${ignoreArgs ? '(ignored)' : JSON.stringify(args, null, 2)}\n\nIP: ${ip}`, `serverActionWrapper/${callback.name}`, user?.tenetId);
                    return notFound();
                }
                await Log.log(`Unauthorized access attempt to server action (${callback.name})`, LogLevel.CRITICAL, undefined, user?.email, `Arguments: ${ignoreArgs ? '(ignored)' : JSON.stringify(args, null, 2)}\n\nIP: ${ip}`, `serverActionWrapper/${callback.name}`, user?.tenetId);
                return API.toast('Unauthorized', 'error', 401);
            }

            if (process.env.LOG_ACTIONS === 'true') {
                function argToString(args: any): string {
                    if (args === null) {
                        return 'null';
                    }
                    if (typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean') {
                        if (args === '') {
                            return 'STRING::EMPTY';
                        }
                        return args.toString();
                    }
                    if (Array.isArray(args)) {
                        return `[${args.map(argToString).join(', ')}]`;
                    }
                    if (typeof args === 'object') {
                        return 'object';
                    }
                    if (args instanceof Date) {
                        return args.toISOString();
                    }
                    if (args === undefined) {
                        return 'undefined';
                    }
                    return 'unknown (' + typeof args + ')';
                }

                console.log(`Run ${callback.name}(${args.map(argToString).join(', ')})`);
            }

            return await callback(user, ...args).catch(async (e) => {
                if (ValidationError.is(e)) {
                    return API.toast(e.message, 'error', 400);
                } else if (UniqueConstraintViolationError.is(e)) {
                    return API.toast(e.getClientMessage(), 'error', 409);
                } else if (NonGenericServerError.is(e)) {
                    console.error(e);
                    await Log.log(e.getLogMessage(), e.securitySeverity, (e.cause as Error | undefined)?.stack, user.email, `Arguments: ${ignoreArgs ? '(ignored)' : JSON.stringify(args, null, 2)}\n\nIP: ${ip}`, `serverActionWrapper/${callback.name}`, user?.tenetId);
                    return API.toast(e.getClientMessage(), 'error', 500);
                } else if (ReadOnlyError.is(e)) {
                    return API.toast(e.getClientMessage(), 'error', 403);
                }
                console.error(e);
                await Log.log('Internal Server Error', LogLevel.HIGH, e.stack, user.email, `Arguments: ${ignoreArgs ? '(ignored)' : JSON.stringify(args, null, 2)}\n\nIP: ${ip}\n\n${e.message}`, `serverActionWrapper/${callback.name}`, user?.tenetId);
                return API.toast('Internal Server Error', 'error', 500);
            })
        });
    }
}

function cache_tokenValid(token: JWTToken) {
    return cacheThis(async () => {
        return await Token.isValid(token);
        // @ts-expect-error - valid-{tokenId} cannot be made into a valid key (it's dynamic, not based on a type)
    }, 'auth/isTokenValid', ['tokenValid', `valid-${token.user.guid}`, `valid-${token.tokenId}`], {
        revalidate: 60 * 15, // 15 minutes
    })
}

export async function isTokenValid(token: JWTToken) {
    const func = cache_tokenValid(token);
    return await func();
}