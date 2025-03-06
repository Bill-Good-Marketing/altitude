import {toast} from "sonner";

export declare type ToastResponse = {
    isToast: true;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export function isToast(result: any): result is ToastResponse {
    'use no memo';
    if (typeof result !== 'object') {
        return false;
    }
    return result != null && 'isToast' in result;
}

export declare type ActionResponse<T> = {
    success: boolean;
    result?: T;
    message: string;
}

export declare type ActionResultType<Func extends (...args: any[]) => Promise<any>> = Exclude<Awaited<ReturnType<Func>>, ToastResponse>;

export function handleServerAction<T>(result: T | ToastResponse): ActionResponse<T> {
    'use no memo';
    if (isToast(result)) {
        toast[result.type]((result as ToastResponse).message)
        return {
            success: (result as ToastResponse).type === 'success' || result.type === 'info',
            message: (result as ToastResponse).message
        };
    }

    return {
        result: result as T,
        success: true,
        message: typeof result === 'string' ? result : ''
    };
}