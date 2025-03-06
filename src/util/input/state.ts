// Some state management utilities

import {Dispatch, SetStateAction} from "react";
import {clamp} from "~/util/math/clamp";

export const UpdateNumber = (setter: Dispatch<SetStateAction<number>>, type: 'int' | 'float' = 'int') => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
        const _val = event.target.value.trim().replaceAll(',', '')
        if (_val === '') {
            setter(0)
        }
        const parsed = type === 'int' ? parseInt(_val) : parseFloat(_val)
        if (isNaN(parsed)) {
            return;
        }
        setter(parsed);
    }
}

export const BoundedNumber = (setter: Dispatch<SetStateAction<number>>, min: number, max: number, type: 'int' | 'float' = 'int') => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
        const _val = event.target.value.trim().replaceAll(',', '')
        if (_val === '') {
            setter(min)
        }
        const parsed = type === 'int' ? parseInt(_val) : parseFloat(_val)
        if (isNaN(parsed)) {
            return;
        }
        setter(clamp(parsed, min, max));
    }
}