import {ContactType, ContactTypeNameMapping} from "~/common/enum/enumerations";
import {FormField} from "~/components/form/FormUtils";
import React from "react";
import {Input} from "~/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";

export function ContactAdder({type, setType, lName, fName, onChange}: {
    type: ContactType,
    setType?: (type: ContactType) => void,
    lName: string,
    fName: string,

    onChange: (fName: string, lName: string) => void,
}) {
    let lastNameFieldName = 'Last Name'

    if (type === ContactType.HOUSEHOLD) {
        lastNameFieldName = 'Household Name'
    } else if (type === ContactType.COMPANY) {
        lastNameFieldName = 'Company Name'
    }

    return <div className="grid gap-4">
        {setType && <FormField grid={false} required htmlFor={'type'} label={'Type'}>
            <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                    <SelectValue placeholder="Select type"/>
                </SelectTrigger>
                <SelectContent>
                    {Object.keys(ContactTypeNameMapping).map((type) => (
                        <SelectItem key={type} value={type}>{ContactTypeNameMapping[type as ContactType]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>}
        {type === ContactType.INDIVIDUAL && <FormField grid={false} required htmlFor={'firstName'} label={'First Name'}>
            <Input name={'firstName'} value={fName} onChange={(e) => onChange(e.target.value, lName)}/>
        </FormField>}
        <FormField grid={false} required htmlFor={'lastName'} label={lastNameFieldName}>
            <Input name={'lastName'} value={lName} onChange={(e) => onChange(fName, e.target.value)}/>
        </FormField>
    </div>
}