import React from "react";
import {BadgeCheck, BadgeX, Loader2} from "lucide-react";
import {ClassNameMapping} from "~/common/enum/enumerations";
import {ModelKeys} from "~/db/sql/keys";
import {pluralize, splitCamelCase, toTitleCase} from "~/util/strings";

export const Tool = ({name, args, result, state}: {
    state: 'call' | 'result' | 'partial-call',
    name: string,
    args: any,
    result?: any
}) => {
    switch (name) {
        case 'read':
            switch (state) {
                case "partial-call":
                    return <ToolCall>
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span className="text-sm">
                            Reading Data...
                        </span>
                    </ToolCall>
                case 'call':
                    return <ToolCall>
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span className="text-sm">
                            Reading {toTitleCase(pluralize(ClassNameMapping[args.model as ModelKeys]))}
                        </span>
                    </ToolCall>
                case 'result':
                    if (typeof result === 'object' && 'error' in result) {
                        return <ToolCall>
                            <BadgeX className="h-4 w-4 text-red-500"/>
                            <span className="text-sm">
                                {result.error}
                            </span>
                        </ToolCall>
                    }
                    return <ToolCall>
                        <BadgeCheck className="h-4 w-4 text-green-500"/>
                        <span className="text-sm">
                            Read {toTitleCase(pluralize(ClassNameMapping[args.model as ModelKeys]))}
                        </span>
                    </ToolCall>
                default:
                    return <ToolCall>
                        <BadgeCheck className="h-4 w-4 text-green-500"/>
                        <span className="text-sm">
                            Read {toTitleCase(pluralize(ClassNameMapping[args.model as ModelKeys]))}
                        </span>
                    </ToolCall>
            }

        default:
            const _name = toTitleCase(splitCamelCase(name.replaceAll('_', ' ')));
            // Translate camel case to sentence case (e.g. readContact -> Read Contact)

            switch (state) {
                case 'call':
                case "partial-call":
                    return <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span className="text-sm">
                            {_name}
                        </span>
                    </div>
                case 'result':
                    return <div className="flex items-center space-x-2">
                        <BadgeCheck className="h-4 w-4 text-green-500"/>
                        <span className="text-sm">
                            {_name}
                        </span>
                    </div>
                default:
                    return <div className="flex items-center space-x-2">
                        <BadgeCheck className="h-4 w-4 text-green-500"/>
                        <span className="text-sm">
                            {_name}
                        </span>
                    </div>
            }
    }
}

function ToolCall({children}: { children: React.ReactNode }) {
    return <div className="flex items-center space-x-2">
        {children}
    </div>
}