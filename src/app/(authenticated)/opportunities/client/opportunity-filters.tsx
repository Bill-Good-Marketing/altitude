'use client';
import {Card} from "~/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select"
import React, {useEffect, useState} from "react"
import {Input} from "~/components/ui/input";
import {SearchIcon} from "lucide-react";
import {isEmptyString} from "~/util/strings";
import {ContactPicker, ContactReadResult} from "~/components/data/pickers/ContactPicker";
import {UserPicker, UserReadResult} from "~/components/data/pickers/UserPicker";
import {Label} from "~/components/ui/label";
import {OpportunityStatus, OpportunityStatusNameMapping} from "~/common/enum/enumerations";

export type TimePeriod = "this-year" | "this-quarter" | "this-month" | "next-month" | "next-quarter"

export function OpportunityFilters({
    timePeriod,
    setTimePeriod,
    statusFilter,
    setStatusFilter,
    contacts,
    setContacts,
    teamMembers,
    setTeamMembers,
    searchTerm,
    setSearchTerm,
}: {
    timePeriod: TimePeriod,
    setTimePeriod: React.Dispatch<React.SetStateAction<TimePeriod>>,
    statusFilter: OpportunityStatus | null,
    setStatusFilter: React.Dispatch<React.SetStateAction<OpportunityStatus | null>>,
    contacts: ContactReadResult[],
    setContacts: React.Dispatch<React.SetStateAction<ContactReadResult[]>>,
    teamMembers: UserReadResult[],
    setTeamMembers: React.Dispatch<React.SetStateAction<UserReadResult[]>>,
    searchTerm: string,
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
}) {
    const [interimSearchTerm, setInterimSearchTerm] = useState("")
    const [initPersisted, setInitPersisted] = useState(false)

    useEffect(() => {
        if (initPersisted || searchTerm === '') {
            return
        }
        // Only on init in case there's a persisted value
        setInterimSearchTerm(searchTerm)
        setInitPersisted(true)
    }, [searchTerm, initPersisted])

    return (
        <Card className="p-4 mb-4">
            <div className="flex items-end gap-4">
                <div className={'w-full'}>
                    <Label className="block text-sm font-medium mb-1">Search</Label>
                    <Input
                        placeholder="Search..."
                        endIcon={SearchIcon} className="w-full"
                        onBlur={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                setSearchTerm(searchTerm)
                            } else if (event.key === ' ') {
                                if (searchTerm.trim().length !== interimSearchTerm.trim().length) {
                                    setSearchTerm(interimSearchTerm)
                                }
                            }
                        }}
                        value={interimSearchTerm}
                        onChange={(e) => {
                            if (isEmptyString(e.target.value)) {
                                setSearchTerm('')
                            }
                            setInterimSearchTerm(e.target.value)
                        }}/>
                </div>
                <div className="w-full">
                    <Label className="block text-sm font-medium mb-1">Status</Label>
                    <Select value={statusFilter ?? 'null'} onValueChange={(value) => setStatusFilter(value === 'null' ? null : value as OpportunityStatus)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null">All Statuses</SelectItem>
                            {Object.keys(OpportunityStatusNameMapping).map((name) => (
                                <SelectItem key={name}
                                            value={name}>{OpportunityStatusNameMapping[name as OpportunityStatus]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full">
                    <Label className="block text-sm font-medium mb-1">Time Period</Label>
                    <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select date range"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this-month">This Month</SelectItem>
                            <SelectItem value="this-quarter">This Quarter</SelectItem>
                            <SelectItem value="this-year">This Year</SelectItem>
                            <SelectItem value="next-month">Next Month</SelectItem>
                            <SelectItem value="next-quarter">Next Quarter</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full">
                    <Label className="block text-sm font-medium mb-1">Contacts</Label>
                    <ContactPicker
                        value={contacts}
                        onValueChange={(value) => setContacts(value)}
                        fieldPlaceholder="Select contacts"
                        multi
                    />
                </div>
                <div className="w-full">
                    <Label className="block text-sm font-medium mb-1">Team Members</Label>
                    <UserPicker
                        value={teamMembers}
                        onValueChange={(value) => setTeamMembers(value)}
                        fieldPlaceholder="Select team members"
                        multi
                    />
                </div>
                {/*<div className="w-full">*/}
                {/*  <label className="block text-sm font-medium mb-1">Product Type</label>*/}
                {/*  <Select onValueChange={(value) => setProductType(value)}>*/}
                {/*    <SelectTrigger>*/}
                {/*      <SelectValue placeholder="Select product type" />*/}
                {/*    </SelectTrigger>*/}
                {/*    <SelectContent>*/}
                {/*      <SelectItem value="retirement">Retirement Planning</SelectItem>*/}
                {/*      <SelectItem value="401k">401(k) Plan</SelectItem>*/}
                {/*      <SelectItem value="estate">Estate Planning</SelectItem>*/}
                {/*      <SelectItem value="investment">Investment Management</SelectItem>*/}
                {/*    </SelectContent>*/}
                {/*  </Select>*/}
                {/*</div>*/}
                {/*<div className="w-full">*/}
                {/*  <label className="block text-sm font-medium mb-1">Team</label>*/}
                {/*  <Select onValueChange={(value) => setTeam(value)}>*/}
                {/*    <SelectTrigger>*/}
                {/*      <SelectValue placeholder="Select team" />*/}
                {/*    </SelectTrigger>*/}
                {/*    <SelectContent>*/}
                {/*      <SelectItem value="team-a">Team A</SelectItem>*/}
                {/*      <SelectItem value="team-b">Team B</SelectItem>*/}
                {/*      <SelectItem value="team-c">Team C</SelectItem>*/}
                {/*    </SelectContent>*/}
                {/*  </Select>*/}
                {/*</div>*/}
            </div>
        </Card>
    )
}
