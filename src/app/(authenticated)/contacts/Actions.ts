'use server';
import {searchContacts as server_searchContacts} from "~/app/(authenticated)/contacts/common";

'use no memo';

import {ContactResult, ContactSearchFilter} from "~/app/(authenticated)/contacts/client";
import {API} from "~/util/api/ApiResponse";
import {User} from "~/db/sql/models/User";
import {Contact} from "~/db/sql/models/Contact";
import {Sort} from "~/components/data/DataTable";

const _searchContacts = async (user: User, searchString: string, page: number, count: number, sortBy: Sort<ContactResult>, filters: ContactSearchFilter)=> {
    return await server_searchContacts(user.tenetId ?? undefined, searchString, page, count, sortBy, filters);
}

const _deleteContact = async (user: User, guid: string) => {
    const contact = await Contact.readUnique({
        where: {
            id: Buffer.from(guid, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {type: true, status: true}
    });

    if (contact == null) {
        return API.toast('Contact not found', 'error', 404);
    }

    await contact.delete();

    return API.toast('Contact deleted', 'success', 200);
}

export const searchContacts = API.serverAction(_searchContacts);
export const deleteContact = API.serverAction(_deleteContact);