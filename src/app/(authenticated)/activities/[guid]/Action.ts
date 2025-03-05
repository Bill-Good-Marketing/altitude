'use server';
import {User} from "~/db/sql/models/User";
import {API} from "~/util/api/ApiResponse";
import { Activity } from "~/db/sql/models/Activity";
import {ActivityStatus} from "~/common/enum/enumerations";

const _toggleStep = async (user: User, activity: string, step: string, completed: boolean) => {
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to complete a step', 'error', 400);
    }

    const act = await Activity.readUnique({
        where: {
            id: Buffer.from(activity, 'hex'),
            tenetId: user.tenetId
        },
        select: {
            status: true,
            steps: {
                select: {
                    completed: true,
                }
            }
        }
    })

    if (act == null) {
        return API.toast('Activity not found', 'error', 404);
    }

    let allCompleted = true;
    for (const _step of act.steps) {
        if (_step.guid.toString('hex') === step) {
            _step.completed = completed;
        }
        if (!_step.completed) {
            allCompleted = false;
        }
    }

    if (allCompleted) {
        act.status = ActivityStatus.COMPLETED;
    } else if (act.status === ActivityStatus.COMPLETED) {
        act.status = ActivityStatus.IN_PROGRESS;
    }

    await act.commit();

    return {completed: allCompleted}
}

export const toggleStep = API.serverAction(_toggleStep);