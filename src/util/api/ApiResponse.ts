import {NextRequest, NextResponse} from "next/server";
import {AccessGroup} from "~/common/enum/enumerations";
import {apiRouteWrapper, getJWTToken, isTokenValid, serverActionWrapper, validateJWT} from "~/util/auth/AuthUtils";
import {ToastResponse} from "~/util/api/client/APIClient";
import {PerformInTransaction} from "~/db/sql/transaction";
import {User} from "~/db/sql/models/User";
import {TOKEN_VERSION} from "~/app/api/auth/[...nextauth]/route";
import {Token} from "~/db/sql/models/Token";

export interface ApiResponse<DataType> {
    status: number;
    message: string;
    data: DataType | null; // Null if there was an error.
}

export declare type MessageApiResponse = ApiResponse<null>;

export interface KeyedObject<DataType> {
    [key: string]: DataType;
}

class Transactional {
    static route<T>(callback: (user: User, req: NextRequest, res: NextResponse) => Promise<NextResponse<T>>, requiredRoles?: AccessGroup[], hidden?: boolean) {
        const transactionedCallback = async (user: User, req: NextRequest, res: NextResponse) => {
            const response = await PerformInTransaction(async () => {
                return await callback(user, req, res)
            })

            if (response === undefined) {
                throw new Error('Transaction rolled back');
            }

            return response;
        }

        return apiRouteWrapper(transactionedCallback, requiredRoles, hidden)
    }

    static admin<T>(callback: (user: User, req: NextRequest, res: NextResponse) => Promise<NextResponse<T>>) {
        return Transactional.route(callback, [AccessGroup.ADMIN], true);
    }

    static serverAction<T, U extends any[]>(callback: (user: User, ...args: U) => Promise<T>, requiredRoles?: AccessGroup[], hidden?: boolean, ignoreArgs: boolean = false) {
        const transactionedCallback = async (user: User, ...args: U) => {
            const response = await PerformInTransaction(async () => {
                return await callback(user, ...args)
            })

            if (response == null) {
                throw new Error('Transaction rolled back');
            }

            return response;
        }

        return serverActionWrapper(transactionedCallback, requiredRoles, hidden, ignoreArgs)
    }

    static adminAction<T, U extends any[]>(callback: (user: User, ...args: U) => Promise<T>, ignoreArgs: boolean = false) {
        return Transactional.serverAction(callback, [AccessGroup.ADMIN], true, ignoreArgs);
    }
}

export class API {
    static error(message: string, status: number): NextResponse<MessageApiResponse> {
        return NextResponse.json({
            status,
            message,
            data: null
        }, {status, statusText: message});
    }

    static success(message: string, status: number = 200): NextResponse<MessageApiResponse> {
        return NextResponse.json({
            status,
            message,
            data: null
        }, {status, statusText: message});
    }

    static response<DataType>(data: DataType, message?: string, status: number = 200): NextResponse<ApiResponse<DataType>> {
        return NextResponse.json({
            status,
            message: message || 'Success',
            data
        }, {status, statusText: message || 'Success'});
    }

    // Make the route/server action perform within a transaction
    public static Transactional = Transactional;

    static route<T>(callback: (user: User, req: NextRequest, res: NextResponse) => Promise<NextResponse<T>>, requiredRoles?: AccessGroup[], hidden?: boolean) {
        return apiRouteWrapper(callback, requiredRoles, hidden)
    }

    static admin<T>(callback: (user: User, req: NextRequest, res: NextResponse) => Promise<NextResponse<T>>) {
        return API.route(callback, [AccessGroup.ADMIN, AccessGroup.SYSADMIN], true);
    }

    static toast(message: string, type: 'success' | 'error' | 'info' | 'warning', status: number): ToastResponse {
        return {
            isToast: true,
            message: message + `${type === 'error' ? ` (Status ${status})` : ''}`,
            type
        };
    }

    static serverAction<T, U extends any[]>(callback: (user: User, ...args: U) => Promise<T>, requiredRoles?: AccessGroup[], hidden?: boolean, ignoreArgs: boolean = false) {
        return serverActionWrapper(callback, requiredRoles, hidden, ignoreArgs)
    }

    static adminAction<T, U extends any[]>(callback: (user: User, ...args: U) => Promise<T>, ignoreArgs: boolean = false) {
        return API.serverAction(callback, [AccessGroup.ADMIN, AccessGroup.SYSADMIN], true, ignoreArgs);
    }

    static async isAuthenticated(): Promise<boolean> {
        const token = await getJWTToken();
        if (token == null) {
            return false;
        }

        const validateToken = validateJWT(token);

        if (!validateToken) {
            return false;
        }

        if (token.invalidated || token.version !== TOKEN_VERSION) {
            const tokenObj = new Token(token.tokenId)
            await tokenObj.delete();
            return false;
        } else if (!(await isTokenValid(token))) {
            return false;
        }
        
        return true;
    }

    static readOnly(): NextResponse<MessageApiResponse> {
        return API.error('You are in a readonly state and cannot perform this action', 403);
    }

    static readOnlyToast(): ToastResponse {
        return {
            isToast: true,
            message: 'You are in a readonly state and cannot perform this action',
            type: 'error'
        };
    }

    static isToast(response: any): response is ToastResponse {
        return typeof response === 'object' && response != null && 'isToast' in response
    }
}