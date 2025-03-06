'use server';
import {User} from "~/db/sql/models/User";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {ReadWhere} from "~/db/sql/types/where";
import {ContactTimelineEvent, TimelineSelect, toFeedItem} from "~/db/sql/models/ContactTimelineEvent";
import {API} from "~/util/api/ApiResponse";

async function _getUserTimeline(user: User, offset: number, count: number): Promise<[FeedItem[], number]> {
    const where: ReadWhere<ContactTimelineEvent> = {
        userId: user.guid,
        tenetId: user.tenetId ?? undefined
    }

    return await Promise.all([(await ContactTimelineEvent.read({
        where,
        orderBy: {
            createdAt: 'desc'
        },
        select: TimelineSelect,
        limit: count,
        offset
    })).map(toFeedItem), ContactTimelineEvent.count(where)])
}

export const getUserTimeline = API.serverAction(_getUserTimeline);