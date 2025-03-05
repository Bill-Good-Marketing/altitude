import {ActivityType, TaskScheduleType} from "~/common/enum/enumerations";
import {
    BadgeCheck,
    Ban,
    BriefcaseBusiness,
    CalendarCog,
    CalendarIcon,
    ChartPie,
    CircleDollarSign,
    CircleHelp,
    ClipboardCheck,
    ContactIcon,
    FileCheck,
    Files,
    FolderOpen,
    House,
    LayoutList,
    ListTodoIcon,
    LockIcon, LucideIcon, Mail,
    MessageCircle,
    PhoneCall,
    PhoneIncoming,
    PhoneOutgoing,
    Presentation,
    RockingChair,
    Shield,
    SpeechIcon,
    TrendingUpDown, UserIcon,
    UsersRound,
    VideoIcon,
    WorkflowIcon
} from "lucide-react";
import React from "react";

export const ActivityTypeIcons: { [key in TaskScheduleType]: LucideIcon } = {
    [TaskScheduleType.COMMUNICATION]: SpeechIcon,
    [TaskScheduleType.COMMUNICATION_CALL]: PhoneCall,
    [TaskScheduleType.COMMUNICATION_CALL_OUTBOUND]: PhoneOutgoing,
    [TaskScheduleType.COMMUNICATION_CALL_INBOUND]: PhoneIncoming,
    [TaskScheduleType.COMMUNICATION_MESSAGE]: MessageCircle,
    [TaskScheduleType.COMMUNICATION_EMAIL]: Mail,

    [TaskScheduleType.MEETING]: UsersRound,
    [TaskScheduleType.MEETING_CLIENT]: ContactIcon,
    [TaskScheduleType.MEETING_VIRTUAL]: VideoIcon,
    [TaskScheduleType.MEETING_INTERNAL]: Presentation,
    [TaskScheduleType.MEETING_PERSONAL]: CalendarIcon,
    [TaskScheduleType.MEETING_IN_PERSON]: UserIcon,


    [TaskScheduleType.FINANCIAL_PLANNING]: BriefcaseBusiness,
    [TaskScheduleType.FINANCIAL_PLANNING_INVESTMENT_STRATEGY]: ChartPie,
    [TaskScheduleType.FINANCIAL_PLANNING_PORTFOLIO_REVIEW]: CircleDollarSign,
    [TaskScheduleType.FINANCIAL_PLANNING_TAX_PLANNING]: CircleDollarSign,
    [TaskScheduleType.FINANCIAL_PLANNING_ESTATE_PLANNING]: House,
    [TaskScheduleType.FINANCIAL_PLANNING_RETIREMENT_PLANNING]: RockingChair,
    [TaskScheduleType.FINANCIAL_PLANNING_RISK_ASSESSMENT]: TrendingUpDown,

    [TaskScheduleType.TASK]: ClipboardCheck,
    [TaskScheduleType.TASK_ADMIN]: FolderOpen,
    [TaskScheduleType.TASK_COMPLIANCE_CHECK]: BadgeCheck,
    [TaskScheduleType.TASK_DOCUMENT_PREPARATION]: Files,
    [TaskScheduleType.TASK_PAPERWORK]: FileCheck,
    [TaskScheduleType.TASK_TODO]: LayoutList,

    [TaskScheduleType.HOLD]: LockIcon,
    [TaskScheduleType.HOLD_PRIVATE]: Shield,
    [TaskScheduleType.HOLD_BLOCKED]: Ban,
    [TaskScheduleType.HOLD_TENTATIVE]: CalendarCog,
}

export function ActivityTypeIcon({type, baseType}: { type: TaskScheduleType | null, baseType: ActivityType }) {
    const classes = `w-5 h-5 mr-2`

    if (baseType === ActivityType.PATH) {
        return <WorkflowIcon className={classes}/>
    } else if (baseType === ActivityType.WAYPOINT) {
        return <ListTodoIcon className={classes}/>
    }

    if (type == null) {
        return <CircleHelp className={classes}/>
    }
    const Icon = ActivityTypeIcons[type];
    return <Icon className={classes}/>
}