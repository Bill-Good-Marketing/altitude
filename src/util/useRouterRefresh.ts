'use client';

import {useRouter} from "next/navigation";
import {useEffect, useState, useTransition} from "react";
import {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Wrapper around `router` from `next/navigation` `useRouter()` to return a Promise that resolves after the various router actions are completed.
 */
export function useAsyncRouter() {
    return {
        refresh: useAsyncRouterFunction('refresh'),
        replace: useAsyncRouterFunction('replace'),
        back: useAsyncRouterFunction('back'),
        forward: useAsyncRouterFunction('forward'),
        prefetch: useAsyncRouterFunction('prefetch'),
        push: useAsyncRouterFunction('push'),
    }
}
/**
 * Wrapper around `router.refresh()` from `next/navigation` `useRouter()` to return Promise, and resolve after refresh completed
 *
 * Thanks to https://github.com/vercel/next.js/discussions/58520#discussioncomment-9605299 for providing the solution
 *
 * @returns Refresh function
 */
export function useAsyncRouterFunction<T extends keyof AppRouterInstance>(funcKey: T) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [resolve, setResolve] = useState<((value: unknown) => void) | null>(null)
    const [isTriggered, setIsTriggered] = useState(false)

    const wrappedFunc = (...args: Parameters<AppRouterInstance[T]>) => {
        return new Promise<void>((resolve) => {
            setResolve(() => resolve)
            startTransition(() => {
                const func = router[funcKey] as (...args: Parameters<AppRouterInstance[T]>) => void;
                func(...args);
            })
        });
    }

    useEffect(() => {
        if (isTriggered && !isPending) {
            if (resolve) {
                resolve(null)

                setIsTriggered(false)
                setResolve(null)
            }
        }
        if (isPending) {
            setIsTriggered(true)
        }

    }, [isTriggered, isPending, resolve])

    return wrappedFunc
}
