'use client';

import React from "react";
import {signOut} from "next-auth/react";

export function SignOutButton() {
    return <span
        onClick={() => signOut({
            callbackUrl: '/login',
        })}
        className="block px-4 py-2 text-sm text-gray-700 dark:text-white data-[focus]:bg-gray-100 dark:bg-zinc-950">
        Sign out
    </span>
}
