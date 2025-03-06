import {ActivityPriority, ActivityStatus, ContactStatus} from "~/common/enum/enumerations";

export const badgeColors: Record<ContactStatus, string> = {
    [ContactStatus.CLIENT]: 'bg-green-500',
    [ContactStatus.PROSPECT]: 'bg-yellow-500',
    [ContactStatus.PLAN_PARTICIPANT]: 'bg-blue-500',
    [ContactStatus.PERM_OFF]: 'bg-red-500',
    [ContactStatus.OFF]: 'bg-gray-800',
    [ContactStatus.STRATEGIC_PARTNER]: 'bg-emerald-500',
    [ContactStatus.LEAD]: 'bg-zinc-500',
    [ContactStatus.OTHER]: 'bg-zinc-500',
}

export const PriorityColors = {
    [ActivityPriority.HIGH]: 'bg-destructive text-primary hover:text-primary-foreground',
    [ActivityPriority.MEDIUM]: 'bg-background text-primary hover:text-primary-foreground',
    [ActivityPriority.LOW]: 'bg-primary text-primary-foreground',
}

export const ActivityStatusColors: Partial<Record<ActivityStatus, string>> = {
    [ActivityStatus.NOT_STARTED]: 'bg-gray-900 text-white',
    [ActivityStatus.PAUSED]: 'bg-stone-200 dark:bg-stone-800 text-black dark:text-white ',
    [ActivityStatus.COMPLETED]: 'bg-emerald-900 text-white',
    [ActivityStatus.CANCELLED]: 'bg-destructive text-white',
    [ActivityStatus.IN_PROGRESS]: 'bg-secondary text-secondary-foreground',
}

export const ActivityStatusIconColors = {
    [ActivityStatus.NOT_STARTED]: 'text-white',
    [ActivityStatus.ASSIGNED]: 'text-cyan-700 dark:text-cyan-300',
    [ActivityStatus.IN_PROGRESS]: 'text-warning',
    [ActivityStatus.WAITING_FOR_INFO]: 'text-info',
    [ActivityStatus.PAUSED]: 'text-stone-900 dark:text-stone-100',
    [ActivityStatus.REASSIGNED]: 'text-orange-700 dark:text-orange-300',
    [ActivityStatus.PENDING_APPROVAL]: 'text-teal-700 dark:text-teal-300',
    [ActivityStatus.IN_REVIEW]: 'text-emerald-700 dark:text-emerald-300',
    [ActivityStatus.COMPLETED]: 'text-green-600 dark:text-green-400',
    [ActivityStatus.CANCELLED]: 'text-white',
    [ActivityStatus.SCHEDULED]: 'text-white',
    [ActivityStatus.FAILED]: 'text-white',
}