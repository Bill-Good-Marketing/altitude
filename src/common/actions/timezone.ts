'use server';
import {getTimezone as server_getTimezone, TZ_NONE} from "~/util/time/timezone";
import {User} from "~/db/sql/models/User";
import {API} from "~/util/api/ApiResponse";

async function _getTimezone(user: User, city: string, state: string, country: string) {
    const result = await server_getTimezone(city, state, country);
    if (result === TZ_NONE) {
        return API.toast(`Could not determine timezone for ${city}, ${state}, ${country}`, 'error', 400);
    }

    return result.tz;
}

export const getTimezone = API.serverAction(_getTimezone);