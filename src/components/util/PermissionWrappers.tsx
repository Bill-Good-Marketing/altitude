import React from "react";
import {AccessGroup} from "~/common/enum/enumerations";
import {isAdmin} from "~/util/auth/Permissions";
import {User} from "~/db/sql/models/User";

export function Admin({user, children, useTrueAccess = false}: {
    user: User,
    children: React.ReactNode,
    useTrueAccess?: boolean
}) {
    return isAdmin(user.type) || (useTrueAccess && isAdmin(user.trueAccess)) ? <>{children}</> : null
}

export function Client({user, children}: {
    user: User,
    children: React.ReactNode,
}) {
    return user.type === AccessGroup.CLIENT ? <>{children}</> : null
}