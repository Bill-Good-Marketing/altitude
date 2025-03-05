import React from 'react'
import {QueryWrapper} from "~/components/util/QueryWrapper";
import {ClientPage} from "~/app/(authenticated)/activities/client";
import {withAuthentication} from "~/util/auth/AuthComponentUtils";

// Mock data for tasks (expanded with new fields)
const _EnhancedTaskWorkspace = async () => {
    return <QueryWrapper>
        <ClientPage/>
    </QueryWrapper>
}

const EnhancedTaskWorkspace = withAuthentication(_EnhancedTaskWorkspace);
export default EnhancedTaskWorkspace;

export const metadata = {
    title: 'Activities',
}