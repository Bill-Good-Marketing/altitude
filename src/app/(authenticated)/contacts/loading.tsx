import {Calendar, Edit, Mail, Phone, Search} from "lucide-react";
import {Input} from "~/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {
    ContactStatus,
    ContactStatusNameMapping,
    ContactType,
    ContactTypeNameMapping,
    HouseholdRelationshipStatus,
    HouseholdRelationshipStatusNameMapping
} from "~/common/enum/enumerations";
import {TableCell, TableRow} from "~/components/ui/table";
import React from "react";
import {Skeleton} from "~/components/ui/skeleton";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {Button} from "~/components/ui/button";
import {LoadingDataTable} from "~/components/data/LoadingDataTable";

export default function Loading() {
    return <div className="container w-4/5 mx-auto py-10">
        <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Search Contacts</h1>
            <p className="text-muted-foreground">
                Search for contacts, households, and companies.
            </p>
        </div>
        <div className="flex items-center space-x-2 mb-6">
            <Search className="w-5 h-5 text-muted-foreground"/>
            <Input
                type="text"
                placeholder="Search by name, email, or phone number"
                className="flex-grow"
            />
        </div>
        <div className="flex space-x-4 mb-6">
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Type"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Types</SelectItem>
                    {Object.keys(ContactTypeNameMapping).map((name) => (
                        <SelectItem key={name} value={name}>{ContactTypeNameMapping[name as ContactType]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Statuses</SelectItem>
                    {Object.keys(ContactStatusNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{ContactStatusNameMapping[name as ContactStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Household Status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Household Statuses</SelectItem>
                    {Object.keys(HouseholdRelationshipStatusNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{HouseholdRelationshipStatusNameMapping[name as HouseholdRelationshipStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="rounded-md border">
            <LoadingDataTable columns={['Name', 'Type', 'Status', 'Contact Info', 'Location', 'Actions']} expandable
                              fakeRowCount={25} pageable height={'70vh'}/>
        </div>
    </div>
}

export function LoadingRow() {
    return <TableRow>
        <TableCell>
            <div className="flex items-center">
                <Skeleton className="h-10 w-10 mr-4 rounded-full"/>
                <div>
                    <Skeleton className={'h-4 mb-2 w-[200px]'}/>
                    <br/>
                    <Skeleton className={'h-2 w-[100px]'}/>
                </div>
            </div>
        </TableCell>
        <TableCell>
            <Skeleton className={'h-4 w-[100px]'}/>
        </TableCell>
        <TableCell>
            <Skeleton className={'h-4 w-[100px] rounded-full'}/>
        </TableCell>
        <TableCell>
            <div className="flex flex-col">
                <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground"/>
                    <Skeleton className={'h-4 w-[200px]'}/>
                </div>
                <div className="flex items-center mt-1">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground"/>
                    <Skeleton className={'h-4 w-[100px]'}/>
                </div>
            </div>
        </TableCell>
        <TableCell>
            <Skeleton className={'h-4 w-[100px]'}/>
        </TableCell>
        <TableCell>
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Phone className="h-4 w-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Call</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Mail className="h-4 w-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Email</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Calendar className="h-4 w-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Schedule Meeting</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Edit</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </TableCell>
    </TableRow>
}