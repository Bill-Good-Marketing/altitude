'use server';
import {Opportunity} from "~/db/sql/models/Opportunity";
import {API} from "~/util/api/ApiResponse";
import {User} from "~/db/sql/models/User";
import {TimePeriod} from "~/app/(authenticated)/opportunities/client/opportunity-filters";
import {ContactReadResult} from "~/components/data/pickers/ContactPicker";
import {UserReadResult} from "~/components/data/pickers/UserPicker";
import {searchOpportunities as server_searchOpportunities, getOpportunityStatistics as server_getOpportunityStatistics} from "~/app/(authenticated)/opportunities/common";
import {ClientOpportunity} from "~/app/(authenticated)/opportunities/client/opportunity-table";
import { Sort } from "~/components/data/DataTable";
import {OpportunityStatus} from "~/common/enum/enumerations";

const _updateOpportunityCloseDate = async (user: User, guid: string, date: Date) => {
    const opportunity = await Opportunity.readUnique({
        where: {
            id: Buffer.from(guid, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {expectedCloseDate: true}
    });

    if (opportunity == null) {
        return API.toast('Opportunity not found', 'error', 404);
    }

    opportunity.expectedCloseDate = date;
    await opportunity.commit();

    return API.toast('Opportunity updated', 'success', 200);
}

const _getOpportunities = async (user: User, searchString: string, timePeriod: TimePeriod, statusFilter: OpportunityStatus | null, contacts: ContactReadResult[], teamMembers: UserReadResult[], sortBy: Sort<ClientOpportunity>, page: number, perPage: number) => {
    if (perPage > 100) {
        perPage = 100;
    }

    return await server_searchOpportunities(user.tenetId ?? undefined, searchString, timePeriod, statusFilter, contacts, teamMembers, sortBy, page, perPage);
}

const _getOpportunityStatistics = async (user: User, timePeriod: TimePeriod) => {
    return await server_getOpportunityStatistics(user.tenetId ?? undefined, timePeriod);
}

export const updateOpportunityCloseDate = API.serverAction(_updateOpportunityCloseDate);
export const getOpportunities = API.serverAction(_getOpportunities);
export const getOpportunityStatistics = API.serverAction(_getOpportunityStatistics);