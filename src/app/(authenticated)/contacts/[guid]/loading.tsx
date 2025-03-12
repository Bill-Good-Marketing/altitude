import {ScrollArea} from "~/components/ui/scroll-area";
import {Button} from "~/components/ui/button";
import {Cake, Calendar, ChevronLeft, Clock, Edit, FileText, Mail, MapPin, Phone, Star} from "lucide-react";
import React from "react";
import {Skeleton} from "~/components/ui/skeleton";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {Card, CardContent} from "~/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "~/components/ui/tabs";

export default function Loading() {
    return <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 font-sans">
        <div className="flex h-screen">
            <aside className="w-64 bg-background border-r border-gray-200 p-4">
                <div className="mb-6">
                    <ScrollArea>
                        <div className={'flex justify-between items-center'}>
                            <ChevronLeft className={'h-6 w-6 mr-2 cursor-pointer'}/>
                            <Skeleton className={'h-12 w-full'}/>
                        </div>
                    </ScrollArea>
                </div>
                <div>
                    <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
                    <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                            <Phone className="mr-2 h-4 w-4"/> Call
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <Mail className="mr-2 h-4 w-4"/> Email
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <Calendar className="mr-2 h-4 w-4"/> Schedule Meeting
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <FileText className="mr-2 h-4 w-4"/> Add Note
                        </Button>
                    </div>
                </div>
            </aside>
            <ContactInfo/>
        </div>
    </div>
}

function ContactInfo() {
    return <div className={"flex-1 overflow-y-auto"}>
        <div className="bg-background shadow-sm p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <Skeleton className={'h-16 w-16 rounded-full'}/>
                    <div>
                        <h1 className="text-2xl font-bold">
                            <Skeleton className={'h-4 mb-2 w-[100px]'}/>
                        </h1>
                        <Skeleton className={'h-2 w-[200px]'}/>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <Select defaultValue={'loading'}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select status"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={'loading'}>Loading...</SelectItem>
                        </SelectContent>
                    </Select>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger>
                                <Cake className="h-5 w-5 text-muted-foreground"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                {/*<p>Birthday: {selectedMember.importantDates?.birthday}</p>*/}
                                <p>Loading...</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger>
                                <Clock className="h-5 w-5 text-muted-foreground"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                {/*<p>Last Contacted: {selectedMember.importantDates?.lastContactedDate}</p>*/}
                                <p>Loading...</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger>
                                <Star className="h-5 w-5 text-muted-foreground"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                {/*<p>Next Follow-up: {selectedMember.importantDates?.nextFollowUpDate}</p>*/}
                                <p>Loading...</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline">
                        <Edit className="mr-2 h-4 w-4"/> Edit Contact
                    </Button>
                </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
                <Skeleton className={'h-4 w-12 rounded-full'}/>
                <Skeleton className={'h-4 w-12 rounded-full'}/>
                <Skeleton className={'h-4 w-12 rounded-full'}/>
            </div>
            <Card className="mt-4">
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className={'flex flex-col space-y-2'}>
                            <h3 className="font-semibold mb-1">Contact Information</h3>
                            <div className={'flex items-center space-x-2'}>
                                <Mail className="inline-block mr-2 h-4 w-4"/>
                                <Skeleton className={'h-4 w-[200px]'}/>
                            </div>
                            <div className={'flex items-center space-x-2'}>
                                <Phone className="inline-block mr-2 h-4 w-4"/>
                                <Skeleton className={'h-4 w-[100px]'}/>
                            </div>
                            <div className={'flex items-center space-x-2'}>
                                <MapPin className="inline-block mr-2 h-4 w-4"/>
                                <Skeleton className={'h-4 w-[100px]'}/>
                            </div>
                        </div>
                        <div className={'flex flex-col space-y-2'}>
                            <h3 className="font-semibold mb-1">Relationship Details</h3>
                            <div className={'flex items-center space-x-2'}>
                                <span>Relation to Head of Household:</span>
                                <Skeleton className={'h-4 w-[100px]'}/>
                            </div>
                            <p>Advisor Team: Not implemented (might be changed?)</p>
                        </div>
                        <div>
                            {/*<h3 className="font-semibold mb-1">Lifecycle Stage</h3>*/}
                            {/*<Select defaultValue={}*/}
                            {/*        onValueChange={handleLifecycleStageChange}>*/}
                            {/*    <SelectTrigger className="w-full">*/}
                            {/*        <SelectValue placeholder="Select lifecycle stage"/>*/}
                            {/*    </SelectTrigger>*/}
                            {/*    <SelectContent>*/}
                            {/*        {lifecycleStages.map((stage) => (*/}
                            {/*            <SelectItem key={stage} value={stage}>{stage}</SelectItem>*/}
                            {/*        ))}*/}
                            {/*    </SelectContent>*/}
                            {/*</Select>*/}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="p-6">
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview & Activity</TabsTrigger>
                    <TabsTrigger value="relationships">Relationships</TabsTrigger>
                    <TabsTrigger value="marketing">Marketing</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                    <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <Skeleton className={'h-[600px] w-full bg-gray-200 dark:bg-zinc-900'}/>
                </TabsContent>
                <TabsContent value="relationships">
                    <Skeleton className={'h-[600px] w-full bg-gray-200 dark:bg-zinc-900'}/>
                </TabsContent>
                <TabsContent value="marketing">
                    <Skeleton className={'h-[600px] w-full bg-gray-200 dark:bg-zinc-900'}/>
                </TabsContent>
                <TabsContent value="documents">
                    <Skeleton className={'h-[600px] w-full bg-gray-200 dark:bg-zinc-900'}/>
                </TabsContent>
                <TabsContent value="audit">
                    <Skeleton className={'h-[600px] w-full bg-gray-200 dark:bg-zinc-900'}/>
                </TabsContent>
                <TabsContent value="opportunities">
                    <Skeleton className={'h-[600px] w-full bg-gray-200 dark:bg-zinc-900'}/>
                </TabsContent>
            </Tabs>
        </div>
    </div>
}