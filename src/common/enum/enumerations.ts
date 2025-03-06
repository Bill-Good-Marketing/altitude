import {ModelKeys} from "~/db/sql/keys";

/* BEGIN GENERATED ENUM ContactStatus DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ContactStatus {
    	CLIENT = 'CLIENT',
		LEAD = 'LEAD',
		OFF = 'OFF',
		PERM_OFF = 'PERM_OFF',
		PROSPECT = 'PROSPECT',
		STRATEGIC_PARTNER = 'STRATEGIC_PARTNER',
		PLAN_PARTICIPANT = 'PLAN_PARTICIPANT',
		OTHER = 'OTHER'
}
/* END GENERATED ENUM ContactStatus DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ContactStatusNameMapping: { [key in ContactStatus]: string } = {
    [ContactStatus.CLIENT]: 'Client',
    [ContactStatus.LEAD]: 'Lead',
    [ContactStatus.OFF]: 'Off',
    [ContactStatus.PERM_OFF]: 'Permanently Off',
    [ContactStatus.PROSPECT]: 'Prospect',
    [ContactStatus.STRATEGIC_PARTNER]: 'Strategic Partner',
    [ContactStatus.PLAN_PARTICIPANT]: 'Plan Participant',
    [ContactStatus.OTHER]: 'Other',
}

/* BEGIN GENERATED ENUM AccessGroup DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum AccessGroup {
    	SYSADMIN = 'SYSADMIN',
		ADMIN = 'ADMIN',
		CLIENT = 'CLIENT'
}
/* END GENERATED ENUM AccessGroup DO NOT MODIFY OR REMOVE THIS COMMENT */

export const AccessGroupNameMapping: { [key in AccessGroup]: string } = {
    [AccessGroup.SYSADMIN]: 'System Administrator',
    [AccessGroup.ADMIN]: 'Administrator',
    [AccessGroup.CLIENT]: 'Client',
}

/* BEGIN GENERATED ENUM ContactType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ContactType {
    	INDIVIDUAL = 'INDIVIDUAL',
		HOUSEHOLD = 'HOUSEHOLD',
		COMPANY = 'COMPANY'
}
/* END GENERATED ENUM ContactType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ContactTypeNameMapping: { [key in ContactType]: string } = {
    [ContactType.INDIVIDUAL]: 'Individual',
    [ContactType.HOUSEHOLD]: 'Household',
    [ContactType.COMPANY]: 'Company',
}

/* BEGIN GENERATED ENUM HouseholdRelationshipStatus DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum HouseholdRelationshipStatus {
    	HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD',
		SPOUSE = 'SPOUSE',
		SON = 'SON',
		DAUGHTER = 'DAUGHTER',
		AUNT = 'AUNT',
		UNCLE = 'UNCLE',
		FATHER = 'FATHER',
		MOTHER = 'MOTHER',
		BROTHER = 'BROTHER',
		SISTER = 'SISTER',
		NIECE = 'NIECE',
		NEPHEW = 'NEPHEW'
}
/* END GENERATED ENUM HouseholdRelationshipStatus DO NOT MODIFY OR REMOVE THIS COMMENT */

export const HouseholdRelationshipStatusNameMapping: { [key in HouseholdRelationshipStatus]: string } = {
    [HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD]: 'Head of Household of',
    [HouseholdRelationshipStatus.SPOUSE]: 'Spouse',
    [HouseholdRelationshipStatus.SON]: 'Son',
    [HouseholdRelationshipStatus.DAUGHTER]: 'Daughter',
    [HouseholdRelationshipStatus.AUNT]: 'Aunt',
    [HouseholdRelationshipStatus.UNCLE]: 'Uncle',
    [HouseholdRelationshipStatus.FATHER]: 'Father',
    [HouseholdRelationshipStatus.MOTHER]: 'Mother',
    [HouseholdRelationshipStatus.BROTHER]: 'Brother',
    [HouseholdRelationshipStatus.SISTER]: 'Sister',
    [HouseholdRelationshipStatus.NIECE]: 'Niece',
    [HouseholdRelationshipStatus.NEPHEW]: 'Nephew',
}

/* BEGIN GENERATED ENUM ActivityType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ActivityType {
    	PATH = 'PATH',
		WAYPOINT = 'WAYPOINT',
		TASK = 'TASK',
		SCHEDULED = 'SCHEDULED'
}
/* END GENERATED ENUM ActivityType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ActivityTypeNameMapping: { [key in ActivityType]: string } = {
    [ActivityType.TASK]: 'Task',
    [ActivityType.SCHEDULED]: 'Scheduled Item',
    [ActivityType.PATH]: 'Path',
    [ActivityType.WAYPOINT]: 'Waypoint',
}

/* BEGIN GENERATED ENUM ActivityPriority DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ActivityPriority {
    	HIGH = 'HIGH',
		MEDIUM = 'MEDIUM',
		LOW = 'LOW'
}
/* END GENERATED ENUM ActivityPriority DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ActivityPriorityNameMapping: { [key in ActivityPriority]: string } = {
    [ActivityPriority.HIGH]: 'High',
    [ActivityPriority.MEDIUM]: 'Medium',
    [ActivityPriority.LOW]: 'Low',
}

/* BEGIN GENERATED ENUM CompanyRelationshipStatus DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum CompanyRelationshipStatus {
    	OWNS_COMPANY = 'OWNS_COMPANY',
		C_SUTIE = 'C_SUTIE',
		EXECUTIVE = 'EXECUTIVE',
		MANAGER = 'MANAGER',
		EMPLOYEE = 'EMPLOYEE',
		CONTRACTOR = 'CONTRACTOR',
		PARTNER = 'PARTNER',
		CHAIRMAN_OF_THE_BOARD = 'CHAIRMAN_OF_THE_BOARD',
		BOARD_MEMBER = 'BOARD_MEMBER'
}
/* END GENERATED ENUM CompanyRelationshipStatus DO NOT MODIFY OR REMOVE THIS COMMENT */

export enum ContactRelationshipType {
    // Company
    OWNS_COMPANY = CompanyRelationshipStatus.OWNS_COMPANY,
    C_SUTIE = CompanyRelationshipStatus.C_SUTIE,
    EXECUTIVE = CompanyRelationshipStatus.EXECUTIVE,
    MANAGER = CompanyRelationshipStatus.MANAGER,
    EMPLOYEE = CompanyRelationshipStatus.EMPLOYEE,
    CONTRACTOR = CompanyRelationshipStatus.CONTRACTOR,
    PARTNER = CompanyRelationshipStatus.PARTNER,
    CHAIRMAN_OF_THE_BOARD = CompanyRelationshipStatus.CHAIRMAN_OF_THE_BOARD,
    BOARD_MEMBER = CompanyRelationshipStatus.BOARD_MEMBER,

    PRIMARY_CONTACT = 'PRIMARY_CONTACT',

    // Household
    HEAD_OF_HOUSEHOLD = HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD,
    HOUSEHOLD = 'HOUSEHOLD',

    // Familial
    FATHER = HouseholdRelationshipStatus.FATHER,
    MOTHER = HouseholdRelationshipStatus.MOTHER,
    BROTHER = HouseholdRelationshipStatus.BROTHER,
    SISTER = HouseholdRelationshipStatus.SISTER,
    NIECE = HouseholdRelationshipStatus.NIECE,
    NEPHEW = HouseholdRelationshipStatus.NEPHEW,
    SON = HouseholdRelationshipStatus.SON,
    DAUGHTER = HouseholdRelationshipStatus.DAUGHTER,
    AUNT = HouseholdRelationshipStatus.AUNT,
    UNCLE = HouseholdRelationshipStatus.UNCLE,
    COUSIN = 'COUSIN',
    SPOUSE = HouseholdRelationshipStatus.SPOUSE,

    // Professional
    REFERRED = 'REFERRED',
    LAWYER = 'LAWYER',
    ESTATE_PLANNER = 'ESTATE_PLANNER',
    ACCOUNTANT = 'ACCOUNTANT',
}

export const ContactRelationshipTypeNameMapping: { [key in ContactRelationshipType]: string } = {
    [ContactRelationshipType.OWNS_COMPANY]: 'Owns Company',
    [ContactRelationshipType.C_SUTIE]: 'C-Suite Executive of',
    [ContactRelationshipType.EMPLOYEE]: 'Employee of',
    [ContactRelationshipType.CONTRACTOR]: 'Contractor for',
    [ContactRelationshipType.PARTNER]: 'Partner of',
    [ContactRelationshipType.EXECUTIVE]: 'Executive of',
    [ContactRelationshipType.MANAGER]: 'Manager of',
    [ContactRelationshipType.CHAIRMAN_OF_THE_BOARD]: 'Chairman of the Board of',
    [ContactRelationshipType.BOARD_MEMBER]: 'Board Member of',
    [ContactRelationshipType.PRIMARY_CONTACT]: 'Primary Contact for',
    [ContactRelationshipType.HOUSEHOLD]: 'Household',
    [ContactRelationshipType.HEAD_OF_HOUSEHOLD]: 'Head of Household of',
    [ContactRelationshipType.FATHER]: 'Father',
    [ContactRelationshipType.MOTHER]: 'Mother',
    [ContactRelationshipType.BROTHER]: 'Brother',
    [ContactRelationshipType.SISTER]: 'Sister',
    [ContactRelationshipType.NIECE]: 'Niece',
    [ContactRelationshipType.NEPHEW]: 'Nephew',
    [ContactRelationshipType.SON]: 'Son',
    [ContactRelationshipType.DAUGHTER]: 'Daughter',
    [ContactRelationshipType.AUNT]: 'Aunt',
    [ContactRelationshipType.UNCLE]: 'Uncle',
    [ContactRelationshipType.COUSIN]: 'Cousin',
    [ContactRelationshipType.SPOUSE]: 'Spouse',
    [ContactRelationshipType.REFERRED]: 'Referred',
    [ContactRelationshipType.LAWYER]: 'Lawyer',
    [ContactRelationshipType.ESTATE_PLANNER]: 'Estate Planner',
    [ContactRelationshipType.ACCOUNTANT]: 'Accountant',
}

export function getContactTypeFromRelationshipType(relationshipType: ContactRelationshipType): ContactType {
    if (professionalRelationships.includes(relationshipType) || companyRelationships.includes(relationshipType)) {
        return ContactType.COMPANY;
    } else if (familialRelationships.includes(relationshipType) || relationshipType === ContactRelationshipType.EMPLOYEE || relationshipType === ContactRelationshipType.EXECUTIVE || relationshipType === ContactRelationshipType.REFERRED) {
        return ContactType.INDIVIDUAL;
    } else if (householdRelationships.includes(relationshipType)) {
        return ContactType.HOUSEHOLD;
    }

    throw new Error(`Cannot determine which contact type relationship type ${relationshipType} is`);
}

export const companyRelationships = [ContactRelationshipType.CONTRACTOR,
    ContactRelationshipType.PARTNER,
    ContactRelationshipType.EXECUTIVE,
    ContactRelationshipType.OWNS_COMPANY,
    ContactRelationshipType.EMPLOYEE,
    ContactRelationshipType.PRIMARY_CONTACT,
    ContactRelationshipType.MANAGER,
    ContactRelationshipType.C_SUTIE
];

export const familialRelationships = [ContactRelationshipType.FATHER, ContactRelationshipType.MOTHER, ContactRelationshipType.BROTHER, ContactRelationshipType.SISTER, ContactRelationshipType.NIECE, ContactRelationshipType.NEPHEW, ContactRelationshipType.SON, ContactRelationshipType.DAUGHTER, ContactRelationshipType.AUNT, ContactRelationshipType.UNCLE, ContactRelationshipType.COUSIN, ContactRelationshipType.SPOUSE];
export const professionalRelationships = [ContactRelationshipType.LAWYER, ContactRelationshipType.ESTATE_PLANNER, ContactRelationshipType.ACCOUNTANT];
export const householdRelationships = [ContactRelationshipType.HEAD_OF_HOUSEHOLD, ContactRelationshipType.HOUSEHOLD]

/* BEGIN GENERATED ENUM LifecycleStage DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum LifecycleStage {
    	ACCUMULATION = 'ACCUMULATION',
		PRE_RETIREMENT = 'PRE_RETIREMENT',
		RETIREMENT = 'RETIREMENT',
		SEMI_RETIRED = 'SEMI_RETIRED',
		NOT_ASSIGNED = 'NOT_ASSIGNED',
		PRE_INVESTMENT = 'PRE_INVESTMENT',
		LEGACY = 'LEGACY'
}
/* END GENERATED ENUM LifecycleStage DO NOT MODIFY OR REMOVE THIS COMMENT */

export const LifecycleStageNameMapping: { [key in LifecycleStage]: string } = {
    [LifecycleStage.ACCUMULATION]: 'Accumulation',
    [LifecycleStage.PRE_RETIREMENT]: 'Pre-Retirement',
    [LifecycleStage.RETIREMENT]: 'Retirement',
    [LifecycleStage.SEMI_RETIRED]: 'Semi Retired',
    [LifecycleStage.NOT_ASSIGNED]: 'Not Assigned',
    [LifecycleStage.PRE_INVESTMENT]: 'Pre-Investment',
    [LifecycleStage.LEGACY]: 'Legacy',
}

/* BEGIN GENERATED ENUM AddressType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum AddressType {
    	HOME = 'HOME',
		WORK = 'WORK',
		VACATION = 'VACATION',
		OTHER = 'OTHER'
}
/* END GENERATED ENUM AddressType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const AddressTypeNameMapping: { [key in AddressType]: string } = {
    [AddressType.HOME]: 'Home',
    [AddressType.WORK]: 'Work',
    [AddressType.VACATION]: 'Vacation',
    [AddressType.OTHER]: 'Other',
}

/* BEGIN GENERATED ENUM PhoneType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum PhoneType {
    	HOME = 'HOME',
		WORK = 'WORK',
		VACATION = 'VACATION',
		MOBILE = 'MOBILE',
		OTHER = 'OTHER'
}
/* END GENERATED ENUM PhoneType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const PhoneTypeNameMapping: { [key in PhoneType]: string } = {
    [PhoneType.HOME]: 'Home',
    [PhoneType.WORK]: 'Work',
    [PhoneType.VACATION]: 'Vacation',
    [PhoneType.OTHER]: 'Other',
    [PhoneType.MOBILE]: 'Mobile',
}

/* BEGIN GENERATED ENUM ImportantDateType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ImportantDateType {
    	ANNIVERSARY = 'ANNIVERSARY',
		RETIREMENT = 'RETIREMENT',
		BIRTHDAY = 'BIRTHDAY'
}
/* END GENERATED ENUM ImportantDateType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ImportantDateTypeNameMapping: { [key in ImportantDateType]: string } = {
    [ImportantDateType.ANNIVERSARY]: 'Anniversary',
    [ImportantDateType.RETIREMENT]: 'Retirement',
    [ImportantDateType.BIRTHDAY]: 'Birthday',
}

export const CompanyRelationshipStatusNameMapping: { [key in CompanyRelationshipStatus]: string } = {
    [CompanyRelationshipStatus.OWNS_COMPANY]: 'Owns Company',
    [CompanyRelationshipStatus.C_SUTIE]: 'C-Suite Executive',
    [CompanyRelationshipStatus.EXECUTIVE]: 'Executive',
    [CompanyRelationshipStatus.MANAGER]: 'Manager',
    [CompanyRelationshipStatus.EMPLOYEE]: 'Employee',
    [CompanyRelationshipStatus.CONTRACTOR]: 'Contractor',
    [CompanyRelationshipStatus.PARTNER]: 'Partner',
    [CompanyRelationshipStatus.CHAIRMAN_OF_THE_BOARD]: 'Chairman of the Board',
    [CompanyRelationshipStatus.BOARD_MEMBER]: 'Board Member',
}

export const ClassNameMapping: { [key in ModelKeys]: string } = {
    contact: 'contact',
    activity: 'activity',
    contactEmail: 'email',
    contactPhone: 'phone number',
    address: 'address',
    configOption: 'configuration option',
    importantDate: 'important date',
    log: 'log',
    token: 'token',
    tenet: 'tenet',
    user: 'user',
    note: 'note',
    attachment: 'attachment',
    auditEvent: 'audit event',
    contactTimelineEvent: 'contact timeline event',
    activityStep: 'activity step',
    activityWaypoint: 'activity waypoint',
    activityTemplate: 'activity template',
    activityWaypointTemplate: 'activity waypoint template',
    templateAssignment: 'template assignment',
    activityTemplateStep: 'activity template step',
    opportunity: 'opportunity',
    productType: 'product type',
    activityTemplateStepAssignment: 'activity template step assignment',
    opportunityProduct: 'opportunity product',
    wrappedObject: 'wrapped object',
    testObject: 'test object',
    joinedObject1: 'joined object 1',
    joinedObject2: 'joined object 2',
    selfReferencialJoinModel: 'self referencial join model',
}

/* BEGIN GENERATED ENUM TaskScheduleType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum TaskScheduleType {
    	COMMUNICATION = 'COMMUNICATION',
		COMMUNICATION_CALL = 'COMMUNICATION_CALL',
		COMMUNICATION_CALL_OUTBOUND = 'COMMUNICATION_CALL_OUTBOUND',
		COMMUNICATION_CALL_INBOUND = 'COMMUNICATION_CALL_INBOUND',
		COMMUNICATION_MESSAGE = 'COMMUNICATION_MESSAGE',
		COMMUNICATION_EMAIL = 'COMMUNICATION_EMAIL',
		MEETING = 'MEETING',
		MEETING_VIRTUAL = 'MEETING_VIRTUAL',
		MEETING_IN_PERSON = 'MEETING_IN_PERSON',
		MEETING_CLIENT = 'MEETING_CLIENT',
		MEETING_INTERNAL = 'MEETING_INTERNAL',
		MEETING_PERSONAL = 'MEETING_PERSONAL',
		FINANCIAL_PLANNING = 'FINANCIAL_PLANNING',
		FINANCIAL_PLANNING_PORTFOLIO_REVIEW = 'FINANCIAL_PLANNING_PORTFOLIO_REVIEW',
		FINANCIAL_PLANNING_INVESTMENT_STRATEGY = 'FINANCIAL_PLANNING_INVESTMENT_STRATEGY',
		FINANCIAL_PLANNING_TAX_PLANNING = 'FINANCIAL_PLANNING_TAX_PLANNING',
		FINANCIAL_PLANNING_ESTATE_PLANNING = 'FINANCIAL_PLANNING_ESTATE_PLANNING',
		FINANCIAL_PLANNING_RETIREMENT_PLANNING = 'FINANCIAL_PLANNING_RETIREMENT_PLANNING',
		FINANCIAL_PLANNING_RISK_ASSESSMENT = 'FINANCIAL_PLANNING_RISK_ASSESSMENT',
		TASK = 'TASK',
		TASK_ADMIN = 'TASK_ADMIN',
		TASK_COMPLIANCE_CHECK = 'TASK_COMPLIANCE_CHECK',
		TASK_DOCUMENT_PREPARATION = 'TASK_DOCUMENT_PREPARATION',
		TASK_PAPERWORK = 'TASK_PAPERWORK',
		TASK_TODO = 'TASK_TODO',
		HOLD = 'HOLD',
		HOLD_PRIVATE = 'HOLD_PRIVATE',
		HOLD_BLOCKED = 'HOLD_BLOCKED',
		HOLD_TENTATIVE = 'HOLD_TENTATIVE'
}
/* END GENERATED ENUM TaskScheduleType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const TaskScheduleTypeNameMapping: { [key in TaskScheduleType]: string } = {
    [TaskScheduleType.COMMUNICATION]: 'Communication',
    [TaskScheduleType.COMMUNICATION_CALL]: 'Call',
    [TaskScheduleType.COMMUNICATION_CALL_OUTBOUND]: 'Outbound Call',
    [TaskScheduleType.COMMUNICATION_CALL_INBOUND]: 'Inbound Call',
    [TaskScheduleType.COMMUNICATION_MESSAGE]: 'Message',
    [TaskScheduleType.COMMUNICATION_EMAIL]: 'Email',
    [TaskScheduleType.MEETING]: 'Meeting',
    [TaskScheduleType.MEETING_VIRTUAL]: 'Virtual Meeting',
    [TaskScheduleType.MEETING_IN_PERSON]: 'In-Person Meeting',
    [TaskScheduleType.MEETING_CLIENT]: 'Client Meeting',
    [TaskScheduleType.MEETING_INTERNAL]: 'Internal Meeting',
    [TaskScheduleType.MEETING_PERSONAL]: 'Personal Meeting',
    [TaskScheduleType.FINANCIAL_PLANNING]: 'Financial Planning',
    [TaskScheduleType.FINANCIAL_PLANNING_PORTFOLIO_REVIEW]: 'Portfolio Review',
    [TaskScheduleType.FINANCIAL_PLANNING_INVESTMENT_STRATEGY]: 'Investment Strategy',
    [TaskScheduleType.FINANCIAL_PLANNING_TAX_PLANNING]: 'Tax Planning',
    [TaskScheduleType.FINANCIAL_PLANNING_ESTATE_PLANNING]: 'Estate Planning',
    [TaskScheduleType.FINANCIAL_PLANNING_RETIREMENT_PLANNING]: 'Retirement Planning',
    [TaskScheduleType.FINANCIAL_PLANNING_RISK_ASSESSMENT]: 'Risk Assessment',
    [TaskScheduleType.TASK]: 'Task',
    [TaskScheduleType.TASK_ADMIN]: 'Admin',
    [TaskScheduleType.TASK_COMPLIANCE_CHECK]: 'Compliance Check',
    [TaskScheduleType.TASK_DOCUMENT_PREPARATION]: 'Document Preparation',
    [TaskScheduleType.TASK_PAPERWORK]: 'Paperwork',
    [TaskScheduleType.TASK_TODO]: 'To-Do',
    [TaskScheduleType.HOLD]: 'Hold',
    [TaskScheduleType.HOLD_PRIVATE]: 'Private',
    [TaskScheduleType.HOLD_BLOCKED]: 'Blocked',
    [TaskScheduleType.HOLD_TENTATIVE]: 'Tentative',
}

export type TaskParents = 'COMMUNICATION' | 'MEETING' | 'FINANCIAL_PLANNING' | 'TASK' | 'HOLD'

export const TaskScheduleSubtypes: { [key in TaskParents]: TaskScheduleType[] } = {
    [TaskScheduleType.COMMUNICATION]: [
        TaskScheduleType.COMMUNICATION_CALL,
        TaskScheduleType.COMMUNICATION_CALL_OUTBOUND,
        TaskScheduleType.COMMUNICATION_CALL_INBOUND,
        TaskScheduleType.COMMUNICATION_MESSAGE,
        TaskScheduleType.COMMUNICATION_EMAIL
    ],
    [TaskScheduleType.MEETING]: [
        TaskScheduleType.MEETING_VIRTUAL,
        TaskScheduleType.MEETING_INTERNAL,
        TaskScheduleType.MEETING_CLIENT,
        TaskScheduleType.MEETING_PERSONAL,
        TaskScheduleType.MEETING_IN_PERSON
    ],
    [TaskScheduleType.FINANCIAL_PLANNING]: [
        TaskScheduleType.FINANCIAL_PLANNING_INVESTMENT_STRATEGY,
        TaskScheduleType.FINANCIAL_PLANNING_PORTFOLIO_REVIEW,
        TaskScheduleType.FINANCIAL_PLANNING_TAX_PLANNING,
        TaskScheduleType.FINANCIAL_PLANNING_ESTATE_PLANNING,
        TaskScheduleType.FINANCIAL_PLANNING_RETIREMENT_PLANNING,
        TaskScheduleType.FINANCIAL_PLANNING_RISK_ASSESSMENT
    ],
    [TaskScheduleType.TASK]: [
        TaskScheduleType.TASK_ADMIN,
        TaskScheduleType.TASK_COMPLIANCE_CHECK,
        TaskScheduleType.TASK_DOCUMENT_PREPARATION,
        TaskScheduleType.TASK_PAPERWORK,
        TaskScheduleType.TASK_TODO
    ],
    [TaskScheduleType.HOLD]: [
        TaskScheduleType.HOLD_PRIVATE,
        TaskScheduleType.HOLD_BLOCKED,
        TaskScheduleType.HOLD_TENTATIVE
    ]
}

export const TaskScheduleSubtypeToParent: { [key in TaskScheduleType]: TaskParents } = {
    [TaskScheduleType.COMMUNICATION]: TaskScheduleType.COMMUNICATION,
    [TaskScheduleType.COMMUNICATION_CALL]: TaskScheduleType.COMMUNICATION,
    [TaskScheduleType.COMMUNICATION_CALL_OUTBOUND]: TaskScheduleType.COMMUNICATION,
    [TaskScheduleType.COMMUNICATION_CALL_INBOUND]: TaskScheduleType.COMMUNICATION,
    [TaskScheduleType.COMMUNICATION_MESSAGE]: TaskScheduleType.COMMUNICATION,
    [TaskScheduleType.COMMUNICATION_EMAIL]: TaskScheduleType.COMMUNICATION,
    [TaskScheduleType.MEETING]: TaskScheduleType.MEETING,
    [TaskScheduleType.MEETING_VIRTUAL]: TaskScheduleType.MEETING,
    [TaskScheduleType.MEETING_INTERNAL]: TaskScheduleType.MEETING,
    [TaskScheduleType.MEETING_CLIENT]: TaskScheduleType.MEETING,
    [TaskScheduleType.MEETING_PERSONAL]: TaskScheduleType.MEETING,
    [TaskScheduleType.MEETING_IN_PERSON]: TaskScheduleType.MEETING,
    [TaskScheduleType.FINANCIAL_PLANNING]: TaskScheduleType.FINANCIAL_PLANNING,
    [TaskScheduleType.FINANCIAL_PLANNING_INVESTMENT_STRATEGY]: TaskScheduleType.FINANCIAL_PLANNING,
    [TaskScheduleType.FINANCIAL_PLANNING_PORTFOLIO_REVIEW]: TaskScheduleType.FINANCIAL_PLANNING,
    [TaskScheduleType.FINANCIAL_PLANNING_TAX_PLANNING]: TaskScheduleType.FINANCIAL_PLANNING,
    [TaskScheduleType.FINANCIAL_PLANNING_ESTATE_PLANNING]: TaskScheduleType.FINANCIAL_PLANNING,
    [TaskScheduleType.FINANCIAL_PLANNING_RETIREMENT_PLANNING]: TaskScheduleType.FINANCIAL_PLANNING,
    [TaskScheduleType.FINANCIAL_PLANNING_RISK_ASSESSMENT]: TaskScheduleType.FINANCIAL_PLANNING,
    [TaskScheduleType.TASK]: TaskScheduleType.TASK,
    [TaskScheduleType.TASK_ADMIN]: TaskScheduleType.TASK,
    [TaskScheduleType.TASK_COMPLIANCE_CHECK]: TaskScheduleType.TASK,
    [TaskScheduleType.TASK_DOCUMENT_PREPARATION]: TaskScheduleType.TASK,
    [TaskScheduleType.TASK_PAPERWORK]: TaskScheduleType.TASK,
    [TaskScheduleType.TASK_TODO]: TaskScheduleType.TASK,
    [TaskScheduleType.HOLD]: TaskScheduleType.HOLD,
    [TaskScheduleType.HOLD_PRIVATE]: TaskScheduleType.HOLD,
    [TaskScheduleType.HOLD_BLOCKED]: TaskScheduleType.HOLD,
    [TaskScheduleType.HOLD_TENTATIVE]: TaskScheduleType.HOLD,
}

/* BEGIN GENERATED ENUM ActivityStatus DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ActivityStatus {
    	NOT_STARTED = 'NOT_STARTED',
		ASSIGNED = 'ASSIGNED',
		IN_PROGRESS = 'IN_PROGRESS',
		WAITING_FOR_INFO = 'WAITING_FOR_INFO',
		PAUSED = 'PAUSED',
		REASSIGNED = 'REASSIGNED',
		PENDING_APPROVAL = 'PENDING_APPROVAL',
		IN_REVIEW = 'IN_REVIEW',
		COMPLETED = 'COMPLETED',
		CANCELLED = 'CANCELLED',
		FAILED = 'FAILED',
		SCHEDULED = 'SCHEDULED'
}
/* END GENERATED ENUM ActivityStatus DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ActivityStatusNameMapping: { [key in ActivityStatus]: string } = {
    [ActivityStatus.NOT_STARTED]: 'Not Started',
    [ActivityStatus.ASSIGNED]: 'Assigned',
    [ActivityStatus.IN_PROGRESS]: 'In Progress',
    [ActivityStatus.WAITING_FOR_INFO]: 'Waiting for Info',
    [ActivityStatus.PAUSED]: 'Paused',
    [ActivityStatus.REASSIGNED]: 'Reassigned',
    [ActivityStatus.PENDING_APPROVAL]: 'Pending Approval',
    [ActivityStatus.IN_REVIEW]: 'In Review',
    [ActivityStatus.COMPLETED]: 'Completed',
    [ActivityStatus.CANCELLED]: 'Cancelled',
    [ActivityStatus.SCHEDULED]: 'Scheduled',
    [ActivityStatus.FAILED]: 'Failed',
}

/* BEGIN GENERATED ENUM ContactTimelineEventType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ContactTimelineEventType {
    	NOTE = 'NOTE',
		ACTIVITY_CREATED = 'ACTIVITY_CREATED',
		ACTIVITY_COMPLETED = 'ACTIVITY_COMPLETED',
		ACTIVITY_CANCELLED = 'ACTIVITY_CANCELLED',
		ACTIVITY_FAILED = 'ACTIVITY_FAILED',
		ACTIVITY_STATUS_CHANGED = 'ACTIVITY_STATUS_CHANGED',
		ACTIVITY_REMOVED = 'ACTIVITY_REMOVED',
		ACTIVITY_STEP_CHANGED = 'ACTIVITY_STEP_CHANGED',
		ACTIVITY_ADDED_TO = 'ACTIVITY_ADDED_TO',
		ACTIVITY_REMOVED_FROM = 'ACTIVITY_REMOVED_FROM',
		WAYPOINT_CREATED = 'WAYPOINT_CREATED',
		CONTACT_CREATED = 'CONTACT_CREATED',
		CONTACT_REMOVED = 'CONTACT_REMOVED',
		MEMBER_ADDED = 'MEMBER_ADDED',
		MEMBER_REMOVED = 'MEMBER_REMOVED',
		RELATIONSHIP_ADDED = 'RELATIONSHIP_ADDED',
		RELATIONSHIP_REMOVED = 'RELATIONSHIP_REMOVED',
		OPPORTUNITY_CREATED = 'OPPORTUNITY_CREATED',
		OPPORTUNITY_REMOVED = 'OPPORTUNITY_REMOVED',
		OPPORTUNITY_WON = 'OPPORTUNITY_WON',
		OPPORTUNITY_LOST = 'OPPORTUNITY_LOST',
		OPPORTUNITY_CANCELLED = 'OPPORTUNITY_CANCELLED',
		OPPORTUNITY_STATUS_CHANGED = 'OPPORTUNITY_STATUS_CHANGED',
		EMAIL_SENT = 'EMAIL_SENT',
		EMAIL_RECEIVED = 'EMAIL_RECEIVED'
}
/* END GENERATED ENUM ContactTimelineEventType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ContactTimelineEventTypeNameMapping: { [key in ContactTimelineEventType]: string } = {
    [ContactTimelineEventType.NOTE]: 'Note',
    [ContactTimelineEventType.ACTIVITY_CREATED]: 'Activity Created',
    [ContactTimelineEventType.ACTIVITY_COMPLETED]: 'Activity Completed',
    [ContactTimelineEventType.ACTIVITY_CANCELLED]: 'Activity Cancelled',
    [ContactTimelineEventType.ACTIVITY_FAILED]: 'Activity Failed',
    [ContactTimelineEventType.ACTIVITY_STATUS_CHANGED]: 'Activity Status Changed',
    [ContactTimelineEventType.ACTIVITY_STEP_CHANGED]: 'Activity Step Changed',
    [ContactTimelineEventType.ACTIVITY_REMOVED]: 'Activity Removed',
    [ContactTimelineEventType.ACTIVITY_ADDED_TO]: 'Activity Added To',
    [ContactTimelineEventType.ACTIVITY_REMOVED_FROM]: 'Activity Removed From',
    [ContactTimelineEventType.WAYPOINT_CREATED]: 'Waypoint Created',
    [ContactTimelineEventType.CONTACT_CREATED]: 'Contact Created',
    [ContactTimelineEventType.CONTACT_REMOVED]: 'Contact Removed',
    [ContactTimelineEventType.MEMBER_ADDED]: 'Member Added',
    [ContactTimelineEventType.MEMBER_REMOVED]: 'Member Removed',
    [ContactTimelineEventType.RELATIONSHIP_ADDED]: 'Relationship Added',
    [ContactTimelineEventType.RELATIONSHIP_REMOVED]: 'Relationship Removed',
    [ContactTimelineEventType.OPPORTUNITY_CREATED]: 'Opportunity Created',
    [ContactTimelineEventType.OPPORTUNITY_REMOVED]: 'Opportunity Removed',
    [ContactTimelineEventType.OPPORTUNITY_WON]: 'Opportunity Won',
    [ContactTimelineEventType.OPPORTUNITY_LOST]: 'Opportunity Lost',
    [ContactTimelineEventType.OPPORTUNITY_CANCELLED]: 'Opportunity Cancelled',
    [ContactTimelineEventType.OPPORTUNITY_STATUS_CHANGED]: 'Opportunity Status Changed',
    [ContactTimelineEventType.EMAIL_SENT]: 'Email Sent',
    [ContactTimelineEventType.EMAIL_RECEIVED]: 'Email Received'
}

/* BEGIN GENERATED ENUM ContactTimelineEventJoinType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ContactTimelineEventJoinType {
    	ACTIVITY_CONTACT = 'ACTIVITY_CONTACT',
		MEMBER_CONTACT = 'MEMBER_CONTACT',
		MEMBER_PARENT = 'MEMBER_PARENT',
		CONTACT_TARGET = 'CONTACT_TARGET',
		OPPORTUNITY_CONTACT = 'OPPORTUNITY_CONTACT',
		RELATIONSHIP_FROM = 'RELATIONSHIP_FROM',
		RELATIONSHIP_TO = 'RELATIONSHIP_TO'
}
/* END GENERATED ENUM ContactTimelineEventJoinType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ContactTimelineEventJoinTypeNameMapping: { [key in ContactTimelineEventJoinType]: string } = {
    [ContactTimelineEventJoinType.ACTIVITY_CONTACT]: 'Activity Contact',
    [ContactTimelineEventJoinType.MEMBER_CONTACT]: 'Member Contact',
    [ContactTimelineEventJoinType.MEMBER_PARENT]: 'Member Parent',
    [ContactTimelineEventJoinType.CONTACT_TARGET]: 'Contact Target',
    [ContactTimelineEventJoinType.OPPORTUNITY_CONTACT]: 'Opportunity Contact',
    [ContactTimelineEventJoinType.RELATIONSHIP_FROM]: 'Relationship From',
    [ContactTimelineEventJoinType.RELATIONSHIP_TO]: 'Relationship To'
}

/* BEGIN GENERATED ENUM DateOffsetType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum DateOffsetType {
    	WAYPOINT = 'WAYPOINT',
		ACTIVITY = 'ACTIVITY',
		PATH_START = 'PATH_START'
}
/* END GENERATED ENUM DateOffsetType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const DateOffsetTypeNameMapping: { [key in DateOffsetType]: string } = {
    [DateOffsetType.WAYPOINT]: 'Relative to Parent Waypoint\'s Start',
    [DateOffsetType.ACTIVITY]: 'Relative to Another Activity\'s Start',
    [DateOffsetType.PATH_START]: 'Relative to Path\'s Start'
}

/* BEGIN GENERATED ENUM Role DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum Role {
    	COMPUTER_OPERATOR = 'COMPUTER_OPERATOR',
		ADVISOR = 'ADVISOR',
		SERVICE_ASSISTANT = 'SERVICE_ASSISTANT',
		SALES_ASSISTANT = 'SALES_ASSISTANT'
}
/* END GENERATED ENUM Role DO NOT MODIFY OR REMOVE THIS COMMENT */

export const RoleNameMapping: { [key in Role]: string } = {
    [Role.COMPUTER_OPERATOR]: 'Computer Operator',
    [Role.ADVISOR]: 'Advisor',
    [Role.SERVICE_ASSISTANT]: 'Service Assistant',
    [Role.SALES_ASSISTANT]: 'Sales Assistant'
}

/* BEGIN GENERATED ENUM ActivityStepType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum ActivityStepType {
    	CHECK = 'CHECK',
		ATTACHMENT = 'ATTACHMENT',
		FORM = 'FORM'
}
/* END GENERATED ENUM ActivityStepType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const ActivityStepTypeNameMapping: { [key in ActivityStepType]: string } = {
    [ActivityStepType.CHECK]: 'Checkbox',
    [ActivityStepType.ATTACHMENT]: 'Attachment',
    [ActivityStepType.FORM]: 'Form'
}

/* BEGIN GENERATED ENUM OpportunityStatus DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum OpportunityStatus {
    	UNSTARTED = 'UNSTARTED',
		IDENTIFIED = 'IDENTIFIED',
		FIRST_APPOINTMENT = 'FIRST_APPOINTMENT',
		SECOND_APPOINTMENT = 'SECOND_APPOINTMENT',
		THIRD_APPOINTMENT = 'THIRD_APPOINTMENT',
		CLOSING = 'CLOSING',
		PAPERWORK = 'PAPERWORK',
		WON = 'WON',
		LOST = 'LOST',
		CANCELLED = 'CANCELLED'
}
/* END GENERATED ENUM OpportunityStatus DO NOT MODIFY OR REMOVE THIS COMMENT */

export const OpportunityStatusNameMapping: { [key in OpportunityStatus]: string } = {
    [OpportunityStatus.UNSTARTED]: 'Unstarted',
    [OpportunityStatus.IDENTIFIED]: 'Identified',
    [OpportunityStatus.FIRST_APPOINTMENT]: 'First Appointment',
    [OpportunityStatus.SECOND_APPOINTMENT]: 'Second Appointment',
    [OpportunityStatus.THIRD_APPOINTMENT]: 'Third Appointment',
    [OpportunityStatus.CLOSING]: 'Closing',
    [OpportunityStatus.PAPERWORK]: 'Paperwork',
    [OpportunityStatus.WON]: 'Won',
    [OpportunityStatus.LOST]: 'Lost',
    [OpportunityStatus.CANCELLED]: 'Cancelled'
}

/* BEGIN GENERATED ENUM NoteType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum NoteType {
    	NOTE = 'NOTE',
		CALL = 'CALL',
		CALL_OUTBOUND = 'CALL_OUTBOUND',
		CALL_INBOUND = 'CALL_INBOUND'
}
/* END GENERATED ENUM NoteType DO NOT MODIFY OR REMOVE THIS COMMENT */

export const NoteTypeNameMapping: { [key in NoteType]: string } = {
    [NoteType.NOTE]: 'Note',
    [NoteType.CALL]: 'Call',
    [NoteType.CALL_OUTBOUND]: 'Outbound Call',
    [NoteType.CALL_INBOUND]: 'Inbound Call'
}













































































































































/* BEGIN GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */
export declare type AIEnumKey = 'ActivityStepType' | 'DateOffsetType' | 'ContactTimelineEventType' | 'ContactTimelineEventJoinType' | 'NoteType' | 'OpportunityStatus' | 'ActivityType' | 'ActivityPriority' | 'TaskScheduleType' | 'ActivityStatus' | 'AddressType' | 'ContactType' | 'ContactStatus' | 'PhoneType' | 'ImportantDateType' | 'HouseholdRelationshipStatus' | 'CompanyRelationshipStatus' | 'LifecycleStage' | 'Role';
// Key is the enum name
export const AIEnabledCommonEnums: Record<AIEnumKey, {
    definition: Record<string, string>,
    description: string | null,
    nameMapping: string,
}> = {
    ActivityStepType: { definition: ActivityStepType, description: 'Describes the type of step in an activity', nameMapping: 'ActivityStepTypeNameMapping' },
	DateOffsetType: { definition: DateOffsetType, description: 'Describes how a date is offset in a template, either from the beginning of the template, the start of the activity\'s parent waypoint, or the completion of another activity within the path', nameMapping: 'DateOffsetTypeNameMapping' },
	ContactTimelineEventType: { definition: ContactTimelineEventType, description: 'Describes the type of timeline event that occurred', nameMapping: 'ContactTimelineEventTypeNameMapping' },
	ContactTimelineEventJoinType: { definition: ContactTimelineEventJoinType, description: 'Describes how the contact was related to the event', nameMapping: 'ContactTimelineEventJoinTypeNameMapping' },
	NoteType: { definition: NoteType, description: null, nameMapping: 'NoteTypeNameMapping' },
	OpportunityStatus: { definition: OpportunityStatus, description: null, nameMapping: 'OpportunityStatusNameMapping' },
	ActivityType: { definition: ActivityType, description: 'Describes the type of activity. Paths contain multiple waypoints and may be connected to a logical "blueprint". Multi-activities have child activities and are not connected to a blueprint. Tasks and scheduled items are single activities which may have multiple steps.', nameMapping: 'ActivityTypeNameMapping' },
	ActivityPriority: { definition: ActivityPriority, description: null, nameMapping: 'ActivityPriorityNameMapping' },
	TaskScheduleType: { definition: TaskScheduleType, description: 'Describes the subtype of task or scheduled activities', nameMapping: 'TaskScheduleTypeNameMapping' },
	ActivityStatus: { definition: ActivityStatus, description: null, nameMapping: 'ActivityStatusNameMapping' },
	AddressType: { definition: AddressType, description: null, nameMapping: 'AddressTypeNameMapping' },
	ContactType: { definition: ContactType, description: null, nameMapping: 'ContactTypeNameMapping' },
	ContactStatus: { definition: ContactStatus, description: null, nameMapping: 'ContactStatusNameMapping' },
	PhoneType: { definition: PhoneType, description: null, nameMapping: 'PhoneTypeNameMapping' },
	ImportantDateType: { definition: ImportantDateType, description: null, nameMapping: 'ImportantDateTypeNameMapping' },
	HouseholdRelationshipStatus: { definition: HouseholdRelationshipStatus, description: 'Describes the relationship status of a household member to the head of household', nameMapping: 'HouseholdRelationshipStatusNameMapping' },
	CompanyRelationshipStatus: { definition: CompanyRelationshipStatus, description: null, nameMapping: 'CompanyRelationshipStatusNameMapping' },
	LifecycleStage: { definition: LifecycleStage, description: 'Describes the investment lifecycle stage of a contact', nameMapping: 'LifecycleStageNameMapping' },
	Role: { definition: Role, description: 'Describes the role of a client user', nameMapping: 'RoleNameMapping' }
}
/* END GENERATED ENUM LIST DO NOT MODIFY OR REMOVE THIS COMMENT */