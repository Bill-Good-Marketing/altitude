import {readContact} from "~/common/actions/read";
import {ClientSideReadResult} from "~/db/sql/types/utility";
import {Picker, PickerPropsCommon} from "~/components/data/Picker";
import {handleServerAction} from "~/util/api/client/APIClient";
import {Avatar, AvatarFallback} from "~/components/ui/avatar";
import {ContactType} from "~/common/enum/enumerations";
import {Building, House, UserCircle} from "lucide-react";
import React, {CSSProperties} from "react";
import classNames from "classnames";

export type ContactReadResult = ClientSideReadResult<typeof readContact<['fullName', 'primaryEmail', 'type']>>

type CommonContactPickerProps = {
    id?: string
    fieldPlaceholder?: string
    className?: string
    requireEmail?: boolean
    requirePhone?: boolean
    modal?: boolean
    dialog?: boolean
}

type WithAdderProps = CommonContactPickerProps & {
    useAdder: true
    adder: React.ReactNode
    adderHeight: CSSProperties['height']
    add: () => void
    cancelAdd: () => void
    adderTitle: string
}

type NonAdderProps = CommonContactPickerProps & {
    useAdder?: false
    adder?: never
    adderHeight?: never
    add?: never
    cancelAdd?: never
    adderTitle?: never
}

type ContactMulitPickerProps = CommonContactPickerProps & {
    multi: true
    value: ContactReadResult[]
    onValueChange: (value: ContactReadResult[]) => void
}

type ContactSinglePickerProps = CommonContactPickerProps & {
    multi?: never
    value: ContactReadResult | null
    onValueChange: (value: ContactReadResult | null) => void
}

type ContactPickerProps = CommonContactPickerProps
    & (WithAdderProps | NonAdderProps)
    & (ContactMulitPickerProps | ContactSinglePickerProps)

export function ContactPicker({
                                  id,
                                  value,
                                  onValueChange,
                                  multi,
                                  fieldPlaceholder = 'Search contacts...',
                                  className,
                                  requireEmail = false,
                                  requirePhone = false,
                                  dialog,
                                  adder,
                                  useAdder,
                                  adderHeight,
                                  add,
                                  cancelAdd,
                                  modal = true,
                              }: ContactPickerProps) {
    const props: PickerPropsCommon<ContactReadResult> = {
        pickerKey: 'contacts-picker',
        search: async (search, page, perPage) => {
            const result = handleServerAction(await readContact(search, page, perPage, ['fullName', 'primaryEmail', 'type'], {
                requireEmail,
                requirePhone
            }));

            if (!result.success) {
                throw new Error(`Error reading contacts: ${result.message}`);
            }
            return result.result!;
        },
        title: 'Search Contacts',
        searchPlaceholder: 'Search...',
        datatable: {
            idKey: 'guid',
            columns: [{
                title: '',
                key: 'icon',
                render: (row: ContactReadResult) => (
                    <Avatar className="h-10 w-10 mr-4">
                        <AvatarFallback>
                            {row.type === ContactType.INDIVIDUAL &&
                                <UserCircle className="h-4/5 w-4/5 text-primary"/>}
                            {row.type === ContactType.HOUSEHOLD &&
                                <House className="h-4/5 w-4/5 text-primary"/>}
                            {row.type === ContactType.COMPANY &&
                                <Building className="h-4/5 w-4/5 text-primary"/>}
                        </AvatarFallback>
                    </Avatar>
                )
            }, {
                title: 'Name',
                key: 'fullName',
            }, {
                title: 'Email',
                key: 'primaryEmail',
            }],
        },
        dataTypeName: 'contact',
        trigger: {
            id,
            nameKey: 'fullName',
            className: classNames('w-full', className),
            placeholder: fieldPlaceholder,
        },
        modalPopover: modal,
        dialog,
    }

    const adderProps: {
        useAdder: true,
        adder: React.ReactNode,
        adderHeight: CSSProperties['height'],
        add: () => void,
        cancelAdd: () => void,
        adderTitle: string
    } = {
        useAdder: true,
        adder: adder!,
        adderHeight: adderHeight!,
        add: add!,
        cancelAdd: cancelAdd!,
        adderTitle: 'Add Contact'
    }

    if (multi) {
        if (useAdder) {
            return <Picker
                multi={true} {...props} onValueChange={onValueChange} value={value} {...adderProps}/>
        }
        return <Picker multi={true} {...props} onValueChange={onValueChange} value={value}/>
    }

    if (useAdder) {
        return <Picker
            multi={false} {...props} onValueChange={onValueChange} value={value} {...adderProps}/>
    }
    return <Picker multi={false} {...props} onValueChange={onValueChange} value={value}/>
}