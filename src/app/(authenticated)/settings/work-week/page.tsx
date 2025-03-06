import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import React from "react";
import {WorkWeekConfiguration} from "~/app/(authenticated)/settings/work-week/client";

import "./page.css"

function WorkWeek() {
    return <WorkWeekConfiguration/>
}

export const metadata = {
    title: 'Configure Office Work Week',
}

export default withAuthentication(WorkWeek);