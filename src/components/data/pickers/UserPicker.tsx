import {ClientSideReadResult} from "~/db/sql/types/utility";
import {readUser} from "~/common/actions/read";
import {handleServerAction} from "~/util/api/client/APIClient";
import {Picker, PickerPropsCommon} from "~/components/data/Picker";
import React from "react";
import classNames from "classnames";

export declare type UserReadResult = ClientSideReadResult<typeof readUser>

type CommonUserPickerProps = {
    id?: string
    fieldPlaceholder?: string
    className?: string
    container?: HTMLElement | DocumentFragment | null
    dialog?: true,
    modal?: boolean
}

type UserMulitPickerProps = CommonUserPickerProps & {
    multi: true
    value: UserReadResult[]
    onValueChange: (value: UserReadResult[]) => void
}

type UserSinglePickerProps = CommonUserPickerProps & {
    multi?: never
    value: UserReadResult | null
    onValueChange: (value: UserReadResult | null) => void
}

export function UserPicker({
                               id,
                               value,
                               onValueChange,
                               multi,
                               fieldPlaceholder = 'Search users...',
                               className,
                               dialog,
    modal = true,
                           }: UserMulitPickerProps | UserSinglePickerProps) {
    const props: PickerPropsCommon<UserReadResult> = {
        pickerKey: 'users-picker',
        search: async (search, page, perPage) => {
            const result = handleServerAction(await readUser(search, page, perPage));

            if (!result.success) {
                throw new Error(`Error reading contacts: ${result.message}`);
            }
            return result.result!;
        },
        title: 'Search Users',
        datatable: {
            idKey: 'guid',
            columns: [{
                title: 'Name',
                key: 'fullName',
            }, {
                title: 'Email',
                key: 'email',
            }],
        },
        dataTypeName: 'user',
        trigger: {
            id,
            nameKey: 'fullName',
            className: classNames('w-full', className),
            placeholder: fieldPlaceholder,
        },
        searchPlaceholder: 'Search...',
        modalPopover: modal,
    }

    if (multi) {
        return <Picker multi={true} {...props} onValueChange={onValueChange} value={value} dialog={dialog}/>
    }

    return <Picker multi={false} {...props} onValueChange={onValueChange} value={value} dialog={dialog}/>
}