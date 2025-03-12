import React from "react";
import {ClientPage} from "~/app/(authenticated)/contacts/client";
import {QueryWrapper} from "~/components/util/QueryWrapper";
import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import {User} from "~/db/sql/models/User";
import {Metadata} from "next";

async function _ContactsSearchPage({requester}: { requester: User }) {
    return <QueryWrapper>
            <ClientPage user={{
                guid: requester.guid.toString('hex'),
                fullName: requester.fullName!,
                email: requester.email!
            }}/>
    </QueryWrapper>
}

export const metadata: Metadata = {
    title: 'Contacts',
    description: 'Search for contacts, households, and companies.'
}

const ContactsSearchPage = withAuthentication(_ContactsSearchPage);
export default ContactsSearchPage;