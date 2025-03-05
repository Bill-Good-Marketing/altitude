import {Button} from "~/components/ui/button";
import {Plus, Search} from "lucide-react";
import {Input} from "~/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {
    ActivityPriority,
    ActivityPriorityNameMapping,
    ActivityStatus,
    ActivityStatusNameMapping, ActivityType, ActivityTypeNameMapping,
    TaskScheduleType,
    TaskScheduleTypeNameMapping
} from "~/common/enum/enumerations";
import React from "react";
import {LoadingDataTable} from "~/components/data/LoadingDataTable";

export default function Loading() {
    return <div className="container w-4/5 mx-auto py-10">
        <div className="mb-6 flex justify-between">
            <div>
                <h1 className="text-3xl font-bold mb-2">Search Activities</h1>
                <p className="text-muted-foreground">
                    Search for tasks, schedule items, flows, and one-off waypoints.
                </p>
            </div>
            <div>
                <Button variant={'linkHover2'} className={'force-border'}>
                    <Plus className="h-4 w-4 mr-2"/> New Activity
                </Button>
            </div>
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
            <Select defaultValue="null">
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Classification"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Classifications</SelectItem>
                    {Object.keys(ActivityTypeNameMapping).map((name) => (
                        <SelectItem key={name} value={name}>
                            {ActivityTypeNameMapping[name as ActivityType]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Type"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Types</SelectItem>
                    {Object.keys(TaskScheduleTypeNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{TaskScheduleTypeNameMapping[name as TaskScheduleType]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Statuses</SelectItem>
                    {Object.keys(ActivityStatusNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{ActivityStatusNameMapping[name as ActivityStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Priority"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">All Priorities</SelectItem>
                    {Object.keys(ActivityPriorityNameMapping).map((name) => (
                        <SelectItem key={name}
                                    value={name}>{ActivityPriorityNameMapping[name as ActivityPriority]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                placeholder={'Filter by Contacts'}
                className={'w-full'}
            />
            <Input
                placeholder={'Filter by Assignees'}
                className={'w-full'}
            />
        </div>
        <div className="rounded-md border">
            <LoadingDataTable columns={['Title', 'Type', 'Status', 'Priority', 'Start Date', 'Due Date', 'Assignees', 'Contacts', 'Actions']}
                              fakeRowCount={25} pageable height={'70vh'}/>
        </div>
    </div>
}