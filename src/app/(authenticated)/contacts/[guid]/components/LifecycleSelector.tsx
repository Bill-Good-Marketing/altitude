'use client';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import React from "react";
import {handleServerAction} from "~/util/api/client/APIClient";
import {LifecycleStage, LifecycleStageNameMapping} from "~/common/enum/enumerations";
import {updateLifecycleStage} from "~/app/(authenticated)/contacts/[guid]/components/Actions";

export function LifecycleSelector({current, id}: { current: string | null, id: string }) {
    const [interimValue, setInterimValue] = React.useState(current);

    return <Select value={interimValue ?? 'null'}
            onValueChange={async (value) => {
                setInterimValue(value)
                const response = handleServerAction(await updateLifecycleStage(id, value as LifecycleStage | 'null'));
                if (!response.success) {
                    setInterimValue(current)
                }
            }}>
        <SelectTrigger className="w-full">
            <SelectValue placeholder="Select lifecycle stage"/>
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="null">N/A</SelectItem>
            {Object.keys(LifecycleStageNameMapping).map((stage) => (
                <SelectItem key={stage} value={stage}>{LifecycleStageNameMapping[stage as LifecycleStage]}</SelectItem>
            ))}
        </SelectContent>
    </Select>
}