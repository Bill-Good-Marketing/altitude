import React from "react";
import NextLink, {LinkProps} from "next/link";

export function FormattedLink({deleted, children, ...props}: Omit<LinkProps, 'className'> & { children: React.ReactNode, useFancyUnderline?: boolean, deleted?: boolean }) {
    if (deleted) {
        return <span className={'font-bold text-gray-500 dark:text-gray-400 italic line-through'}>{children}</span>
    }

    return <NextLink {...props} className="font-bold hover:text-link-blue dark:hover:text-link-blue special-underline">
            {children}
    </NextLink>
}