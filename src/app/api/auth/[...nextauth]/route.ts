import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth, {NextAuthOptions, RequestInternal, Session, User as NextAuthUser} from "next-auth";
import {encode, JWTEncodeParams} from "next-auth/jwt";
import {comparePassword} from "~/util/db/datamanagement";
import {AccessGroup, AccessGroupNameMapping} from "~/common/enum/enumerations";
import {AccessGroupHierarchy, LogLevel} from "~/common/enum/serverenums";
import {NextRequest, NextResponse} from "next/server";
import {isAdmin} from "~/util/auth/Permissions";
import {validateGUID} from "~/util/db/validation";
import {NonGenericServerError, UniqueConstraintViolationError, ValidationError} from "~/common/errors";
import {User} from "~/db/sql/models/User";
import {Log} from "~/db/sql/models/Log";
import {Token} from "~/db/sql/models/Token";
import {generateGuid} from "~/util/db/guid";
import {dbClient} from "~/db/sql/SQLBase";
import {PrismaClientKnownRequestError} from "@prisma/client/runtime/library";
import {getIP, isTokenValid} from "~/util/auth/AuthUtils";
import {revalidateCache} from "~/util/api/caching";

export const TOKEN_VERSION = process.env.TOKEN_VERSION ?? '1';

type UserData = {
    guid: string;
    fullName: string;
    email: string;
    type: AccessGroup;
    enabled: boolean;
    tenetId?: string;
}

export declare type JWTToken = {
    rememberMe: boolean;
    user: UserData;
    version: string; // If the version doesn't match, the token is invalidated. This is based on the TOKEN_VERSION environment variable.
    view?: AccessGroup | string; // Access groups, office role, or view as a specific user
    viewData?: UserData;
    invalidated?: boolean; // If the token is invalidated, it will be deleted from the database.
    tokenId: string; // The token id, used for invalidating the token
}

interface AuthUser extends NextAuthUser {
    name: string;
    type: AccessGroup;
    enabled: boolean;
    rememberMe: boolean; // Used for remember me
    tenetId?: string;
}

class LoginError extends Error {
    private _marker: string = 'LoginError';

    constructor(message: string) {
        super(message);
    }

    static is(error: unknown): error is LoginError {
        return (error as LoginError)._marker === 'LoginError';
    }
}

const JWT_MAX_AGE = 60 * 60 * 4; // 4 hours
const JWT_MAX_AGE_REMEMBER_ME = 15 * 60 * 60 * 24 * 365; // 15 years

export async function standardAuthorize(credentials?: Record<'email' | 'password' | 'rememberMe', string>, req?: Pick<RequestInternal, "body" | "query" | "headers" | "method">, ip?: string): Promise<AuthUser | null> {
    if (credentials == null) {
        return null
    }

    const {email, password, rememberMe} = credentials;

    try {
        if (!email || !password) {
            return null
        }

        const rememberMeBool = rememberMe === 'true';

        // Look up the user from the credentials supplied
        const user = await User.readUnique({
            where: {email: email},
            select: {
                email: true,
                fullName: true,
                type: true,
                enabled: true,
                tenetId: true,
                password: true,
                // passwordChangeRequired: true,
                // activationToken: true
            }
        });

        if (!user) {
            return null
        }
        // else if (user.activationToken != null && !user.enabled) {
        //     throw new LoginError('You haven\'t activated your account yet! Please check your email for a link to setup and activate your account.');
        // }

        // Check if the password is correct
        if (comparePassword(password, user.password)) {
            if (!user.enabled) {
                if (isAdmin(user.type)) {
                    await Log.log(`The ${AccessGroupNameMapping[user.type!]} account ${user.email} was disabled and an attempt was made to log in.`, LogLevel.CRITICAL, undefined, user.email, `An attempt was made to log in with the email ${user.email} from the IP address ${ip}.`, `standardAuthorize`, user?.tenetId);
                }
                throw new LoginError('Your account has been disabled. Please contact the site administrator.')
            }
            // else if (user.passwordChangeRequired) {
            //     throw new LoginError('You need to reset your password before logging in. Please check email for a reset link.')
            // }

            if (isAdmin(user.type)) {
                //${user.system ? ` ${user.email} is a system account` : ''}
                await Log.log(`The ${AccessGroupNameMapping[user.type!]} account ${user.email} logged in.`, LogLevel.INFO, undefined, user.email, `The user ${user.email} logged in from the IP address ${ip}`, `standardAuthorize`, user?.tenetId);
            }

            return {
                id: user.guid.toString('hex'),
                name: user.fullName || '',
                email: email,
                type: user.type || AccessGroup.CLIENT,
                enabled: user.enabled!,
                rememberMe: rememberMeBool,
                tenetId: user.tenetId?.toString('hex')
            }
        } else {
            if (isAdmin(user.type)) {
                await Log.log(`The ${AccessGroupNameMapping[user.type!]} account ${user.email} failed to log in.`, LogLevel.HIGH, undefined, user.email, `An attempt was made to log in with the email ${user.email} from the IP address ${ip}.`, `standardAuthorize`, user?.tenetId);
            }

            return null
        }
    } catch (e) {
        if (ValidationError.is(e)) {
            await Log.log(`Log in `, LogLevel.HIGH, (e as Error).stack, undefined, `An error occurred while a user was trying to log in from the IP address ${ip}.\nDetails: ${e.message}`, `standardAuthorize`);
            throw new Error('Validation Error, please contact the site administrator.');
        } else if (UniqueConstraintViolationError.is(e)) {
            await Log.log(`Log in unique constraint error`, LogLevel.WARNING, (e as Error).stack, undefined, `An error occurred while a user was trying to log in from the IP address ${ip}.\nDetails: ${e.message}`, `standardAuthorize`);
            throw new Error('Validation Error, please contact the site administrator.');
        } else if (NonGenericServerError.is(e)) {
            await Log.log(`Log in server error`, LogLevel.CRITICAL, (e as Error).stack, undefined, `An error occurred while a user was trying to log in from the IP address ${ip}.\nDetails: ${e.getLogMessage()}\n${(e.cause as Error | undefined)?.message ?? ''}`, `standardAuthorize`);
            throw new Error('An internal server error occurred. Please contact the site administrator.');
        } else if (LoginError.is(e)) {
            throw e; // Rethrow the error, logging is handled before error is thrown, if necessary
        } else {
            await Log.log(`Log in error`, LogLevel.CRITICAL, (e as Error).stack, undefined, `An error occurred while a user was trying to log in from the IP address ${ip}.\nDetails: ${(e as Error).message}`, `standardAuthorize`);
        }

        if (process.env.NODE_ENV === 'production') {
            console.error(e);
            throw new Error('Internal Server Error');
        }

        throw e; // Log and rethrow
    }
}

const ViewEmailMapping: { [key: string]: string } = {
    'client': 'client@billgood.local',
}

type ViewableOfficeRoles = 'advisor' | 'office-admin' | 'staff'
const ArrayOfViewableOfficeRoles: ViewableOfficeRoles[] = ['advisor', 'office-admin', 'staff'];

function AuthOptionsProvider(ip = 'unknown'): NextAuthOptions {
    return {
        providers: [
            CredentialsProvider({
                id: "standard",
                name: "Standard Login",
                credentials: {
                    email: {label: "email", type: "text"},
                    password: {label: "password", type: "password"},
                    rememberMe: {label: "rememberMe", type: "checkbox"}
                },
                authorize: (credentials, req) => standardAuthorize(credentials, req, ip)
            }),
        ],
        session: {
            strategy: "jwt",
            maxAge: JWT_MAX_AGE_REMEMBER_ME, // 15 years
        },
        jwt: {
            maxAge: JWT_MAX_AGE, // 30 days
            async encode(params: JWTEncodeParams) {
                const {token} = params;
                if (token) {
                    if (token.rememberMe) {
                        params.maxAge = JWT_MAX_AGE_REMEMBER_ME;
                    }
                }
                return encode(params)
            }
        },
        pages: {
            'signIn': '/login',
            'error': '/login',
            'newUser': '/signup',
        },

        callbacks: {
            // @ts-expect-error - This is a valid callback, typescript is just having issues lol
            async jwt({token, user, trigger, session}: {
                token: JWTToken,
                user: AuthUser,
                trigger?: string,
                session: {
                    view?: string | AccessGroup,
                    refresh?: boolean
                };
            }): Promise<JWTToken> {
                async function getViewData(view: AccessGroup | ViewableOfficeRoles | string, allowed: Set<AccessGroup | ViewableOfficeRoles | 'guid'>): Promise<JWTToken['viewData']> {
                    if (validateGUID(view) && allowed.has('guid')) {
                        const user = await User.getById(view, {
                            email: true,
                            fullName: true,
                            type: true,
                            enabled: true,
                            tenetId: true
                        });
                        if (user == null) {
                            return undefined;
                        }

                        const hierarchyIndex = AccessGroupHierarchy.indexOf(token.user.type! as AccessGroup);
                        const targetIndex = AccessGroupHierarchy.indexOf(user.type!);

                        if (hierarchyIndex <= targetIndex) {
                            // Don't want to let sysadmins act as other sysadmins
                            return undefined;
                        }

                        return {
                            guid: user.guid.toString('hex'),
                            fullName: user.fullName!,
                            email: user.email!,
                            type: user.type!,
                            enabled: user.enabled!,
                            tenetId: user.tenetId?.toString('hex')
                        }
                    } else if (allowed.has(view as AccessGroup | ViewableOfficeRoles)) {
                        switch (view) {
                            case 'client':
                            case 'admin': {
                                const user = await User.getByEmail(ViewEmailMapping[session.view!])
                                if (user == null) {
                                    return undefined;
                                }
                                return {
                                    guid: user.guid.toString('hex'),
                                    fullName: user.fullName!,
                                    email: user.email!,
                                    type: user.type!,
                                    enabled: user.enabled!,
                                    tenetId: user.tenetId?.toString('hex')
                                };
                            }
                        }
                    } else if ((!allowed.has(view as AccessGroup | ViewableOfficeRoles)) || (validateGUID(view) && !allowed.has('guid'))) {
                        // Severe security issue, someone may be trying to escalate privileges
                        await Log.log(`Unauthorized attempt to change session view to ${view}`, LogLevel.CRITICAL, undefined, token.user.email!, `Session view: ${session.view} is not allowed to be changed to ${view}.\n\nIP Address: ${ip}`, 'nextauth#jwt/sessionUpdate', token.user.tenetId ? Buffer.from(token.user.tenetId!, 'hex') : null);
                    }
                }

                if (user) {
                    token.user = {
                        guid: user.id,
                        fullName: user.name!,
                        email: user.email!,
                        type: user.type!,
                        enabled: user.enabled!,
                        tenetId: user.tenetId
                    }
                    token.tokenId = generateGuid().toString('hex');
                    token.rememberMe = user.rememberMe;
                    token.version = TOKEN_VERSION;

                    const tokenObj = new Token(token.tokenId)
                    tokenObj.new = true;
                    tokenObj.userId = Buffer.from(token.user.guid, 'hex');
                    await tokenObj.commit();
                }

                if (trigger === 'update' && session) {
                    if (session.view && isAdmin(token.user.type as AccessGroup | undefined)) {
                        switch (token.user.type) {
                            // case 'sysadmin': {
                            //     if (session.view === 'sysadmin') {
                            //         token.view = undefined;
                            //         token.viewData = undefined;
                            //     } else {
                            //         token.view = session.view;
                            //         token.viewData = await getViewData(session.view, new Set(['guid', ...ArrayOfViewableOfficeRoles, ...ViewableRoles]));
                            //         if (token.viewData == null) {
                            //             token.view = undefined;
                            //             token.viewData = undefined;
                            //         }
                            //     }
                            //     break;
                            // }
                            case AccessGroup.ADMIN: {
                                if (session.view === 'admin' || session.view === 'sysadmin') {
                                    token.view = undefined;
                                    token.viewData = undefined;
                                } else {
                                    token.view = session.view;
                                    token.viewData = await getViewData(session.view, new Set(['guid', ...ArrayOfViewableOfficeRoles, AccessGroup.CLIENT]));
                                    if (token.viewData == null) {
                                        token.view = undefined;
                                        token.viewData = undefined;
                                    }
                                }
                                break;
                            }
                        }
                    }

                    // Reload session data
                    if (session.refresh) {
                        try {
                            const [user] = await Promise.all([
                                await User.getById(token.user.guid as string, {
                                    'email': true,
                                    'fullName': true,
                                    'type': true,
                                    'enabled': true,
                                    'tenetId': true
                                }),
                                dbClient.token.update({
                                    where: {
                                        id: Buffer.from(token.tokenId, 'hex')
                                    },
                                    data: {
                                        refresh: false
                                    }
                                })
                            ]);

                            if (user == null) {
                                // @ts-expect-error - This is a valid cache key
                                await revalidateCache(`valid-${token.tokenId}`)
                                token.invalidated = true;
                                return token;
                            }
                            // @ts-expect-error - Trust me bro, this is a valid cache key
                            await revalidateCache([`valid-${token.tokenId}`, `valid-${user.guid.toString('hex')}`])

                            token.user = {
                                guid: user.guid.toString('hex'),
                                fullName: user.fullName!,
                                email: user.email!,
                                type: user.type!,
                                enabled: user.enabled!,
                                tenetId: user.tenetId?.toString('hex')
                            }
                        } catch (e) {
                            if (e instanceof PrismaClientKnownRequestError && e.message.includes('Record to update not found.')) {
                                token.invalidated = true;
                                return token;
                            }
                            throw e;
                        }
                    }
                }
                return token
            },

            // @ts-expect-error - see above
            async session({session, token}: {
                session: Session & { refresh: boolean },
                token: JWTToken,
            }): Promise<Session & { refresh: boolean }> {
                if (token && token.invalidated) {
                    const tokenObj = new Token(token.tokenId)
                    await tokenObj.delete();
                    return {
                        expires: new Date().toISOString(),
                        refresh: false
                    };
                } else if (token) {
                    session.user = {
                        name: token.user.fullName,
                    }
                    session.refresh = await isTokenValid(token) === 'refresh'
                }
                return session
            }
        }
    }
}

const auth = async function (req: NextRequest, res: NextResponse) {
    const reqIp = await getIP() || 'unknown';

    const _AuthOptions: NextAuthOptions = AuthOptionsProvider(reqIp);
    const handler = NextAuth(_AuthOptions);
    return handler(req, res)
}

export {auth as GET, auth as POST}