import {HoverCard, HoverCardContent, HoverCardTrigger} from "~/components/ui/hover-card";
import {Building, House, Mail, MapPin, Phone, UserCircle} from "lucide-react";
import {ContactType} from "~/common/enum/enumerations";
import {FormattedLink} from "~/components/util/FormattedLink";
import {cn} from "~/lib/utils";

export function ContactTypeIcon({type, className}: { type: ContactType, className?: string }) {
    const classes = cn('h-4 w-4 text-gray-500 dark:text-gray-400', className)

    switch (type) {
        case ContactType.INDIVIDUAL:
            return <UserCircle className={classes}/>
        case ContactType.HOUSEHOLD:
            return <House className={classes}/>
        case ContactType.COMPANY:
            return <Building className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
    }
}

export function ContactHoverCard({guid, name, type, email, phone, address, showTypeIcon, deleted}: {
    guid: string,
    name: string,
    type: ContactType,
    email: string | null,
    phone: string | null,
    address: string | null,
    showTypeIcon?: boolean,
    deleted?: boolean
}) {
    const shouldHover = email != null || phone != null || address != null || deleted

    if (!shouldHover) {
        return <div className={'flex items-center space-x-2'}>
            {showTypeIcon && <ContactTypeIcon type={type}/>}
            <FormattedLink deleted={deleted} href={`/contacts/${guid}`}>{name}</FormattedLink>
        </div>
    }

    return <div className={'flex items-center space-x-2 text-nowrap'}>
        {showTypeIcon && <ContactTypeIcon type={type}/>}
        <HoverCard>
            <HoverCardTrigger asChild>
                <FormattedLink deleted={deleted} href={`/contacts/${guid}`}>{name}</FormattedLink>
            </HoverCardTrigger>
            <HoverCardContent className="p-2 space-y-2 w-fit max-w-[20vw] text-wrap">
                    {email && <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 min-w-4 text-gray-500 dark:text-gray-400"/>
                        <span>{email}</span>
                    </div>}
                    {phone && <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 min-w-4 text-gray-500 dark:text-gray-400"/>
                        <span>{phone}</span>
                    </div>}
                    {address && <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 min-w-4 text-gray-500 dark:text-gray-400"/>
                        <span>{address}</span>
                    </div>}
            </HoverCardContent>
        </HoverCard>
    </div>
}