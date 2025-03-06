import CalendarView from './client';
import {QueryWrapper} from "~/components/util/QueryWrapper";
import React from "react";
import {withAuthentication} from "~/util/auth/AuthComponentUtils";

const CalendarViewPage = () => {
    return <QueryWrapper>
        <CalendarView/>
    </QueryWrapper>
}

export const metadata = {
    title: 'My Calendar',
}

export default withAuthentication(CalendarViewPage);