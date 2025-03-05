'use server';

import {Note} from "~/db/sql/models/Note";
import {User} from "~/db/sql/models/User";
import {API} from "~/util/api/ApiResponse";
import {ActivityStatus, ActivityType, NoteType, TaskScheduleType} from "~/common/enum/enumerations";
import {Contact} from "~/db/sql/models/Contact";
import {Activity} from "~/db/sql/models/Activity";

const _completeCall = async (user: User, contact: string, notes: string, type: 'outbound' | 'inbound') => {
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to complete a call', 'error', 400);
    }

    const note = new Note(undefined, {
        content: notes,
        tenetId: user.tenetId ?? undefined,
        authorId: user.guid,
        contactId: Buffer.from(contact, 'hex'),
        noteType: type === 'outbound' ? NoteType.CALL_OUTBOUND : NoteType.CALL_INBOUND,
    })

    await note.commit();

    return API.toast('Call saved', 'success', 200);
}

const _setUpFollowUp = async (user: User, contact: string, phoneNumber: string, notes: string, type: 'outbound' | 'inbound', title: string, followUpDate: Date, followUpEndDate: Date) => {
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to create a note', 'error', 400);
    }

    const note = new Note(undefined, {
        content: notes,
        tenetId: user.tenetId ?? undefined,
        authorId: user.guid,
        contactId: Buffer.from(contact, 'hex'),
        noteType: type === 'outbound' ? NoteType.CALL_OUTBOUND : NoteType.CALL_INBOUND,
    })

    const call = new Activity(undefined, {
        title,
        tenetId: user.tenetId ?? undefined,
        assignedById: user.guid,
        contacts: [new Contact(contact)],
        startDate: followUpDate,
        endDate: followUpEndDate,
        type: ActivityType.SCHEDULED,
        status: ActivityStatus.SCHEDULED,
        taskScheduleType: TaskScheduleType.COMMUNICATION_CALL,
        phoneNumber: phoneNumber,
        users: [user]
    })

    await Promise.all([note.commit(), call.commit()]);

    return API.toast('Call and follow-up saved', 'success', 200);
}

export const completeCall = API.serverAction(_completeCall);
export const setUpFollowUp = API.serverAction(_setUpFollowUp);