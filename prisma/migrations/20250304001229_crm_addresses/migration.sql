-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tests";

-- CreateEnum
CREATE TYPE "crm"."ActivityStepType" AS ENUM ('CHECK', 'ATTACHMENT', 'FORM');

-- CreateEnum
CREATE TYPE "crm"."DateOffsetType" AS ENUM ('WAYPOINT', 'ACTIVITY', 'PATH_START');

-- CreateEnum
CREATE TYPE "crm"."ContactTimelineEventType" AS ENUM ('NOTE', 'ACTIVITY_CREATED', 'ACTIVITY_COMPLETED', 'ACTIVITY_CANCELLED', 'ACTIVITY_FAILED', 'ACTIVITY_STATUS_CHANGED', 'ACTIVITY_REMOVED', 'ACTIVITY_STEP_CHANGED', 'ACTIVITY_ADDED_TO', 'ACTIVITY_REMOVED_FROM', 'WAYPOINT_CREATED', 'CONTACT_CREATED', 'CONTACT_REMOVED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'RELATIONSHIP_ADDED', 'RELATIONSHIP_REMOVED', 'OPPORTUNITY_CREATED', 'OPPORTUNITY_REMOVED', 'OPPORTUNITY_WON', 'OPPORTUNITY_LOST', 'OPPORTUNITY_CANCELLED', 'OPPORTUNITY_STATUS_CHANGED', 'EMAIL_SENT', 'EMAIL_RECEIVED');

-- CreateEnum
CREATE TYPE "crm"."Auditable" AS ENUM ('CONTACT', 'NOTE', 'ACTIVITY', 'OPPORTUNITY', 'USER', 'ADDRESS', 'CONTACT_EMAIL', 'CONTACT_PHONE', 'IMPORTANT_DATE', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "crm"."AuditEventType" AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "crm"."ContactTimelineEventJoinType" AS ENUM ('ACTIVITY_CONTACT', 'MEMBER_CONTACT', 'MEMBER_PARENT', 'CONTACT_TARGET', 'OPPORTUNITY_CONTACT', 'RELATIONSHIP_FROM', 'RELATIONSHIP_TO');

-- CreateEnum
CREATE TYPE "crm"."NoteType" AS ENUM ('NOTE', 'CALL', 'CALL_OUTBOUND', 'CALL_INBOUND');

-- CreateEnum
CREATE TYPE "crm"."OpportunityStatus" AS ENUM ('UNSTARTED', 'IDENTIFIED', 'FIRST_APPOINTMENT', 'SECOND_APPOINTMENT', 'THIRD_APPOINTMENT', 'CLOSING', 'PAPERWORK', 'WON', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "crm"."ActivityType" AS ENUM ('PATH', 'WAYPOINT', 'TASK', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "crm"."ActivityPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "crm"."TaskScheduleType" AS ENUM ('COMMUNICATION', 'COMMUNICATION_CALL', 'COMMUNICATION_CALL_OUTBOUND', 'COMMUNICATION_CALL_INBOUND', 'COMMUNICATION_MESSAGE', 'COMMUNICATION_EMAIL', 'MEETING', 'MEETING_VIRTUAL', 'MEETING_IN_PERSON', 'MEETING_CLIENT', 'MEETING_INTERNAL', 'MEETING_PERSONAL', 'FINANCIAL_PLANNING', 'FINANCIAL_PLANNING_PORTFOLIO_REVIEW', 'FINANCIAL_PLANNING_INVESTMENT_STRATEGY', 'FINANCIAL_PLANNING_TAX_PLANNING', 'FINANCIAL_PLANNING_ESTATE_PLANNING', 'FINANCIAL_PLANNING_RETIREMENT_PLANNING', 'FINANCIAL_PLANNING_RISK_ASSESSMENT', 'TASK', 'TASK_ADMIN', 'TASK_COMPLIANCE_CHECK', 'TASK_DOCUMENT_PREPARATION', 'TASK_PAPERWORK', 'TASK_TODO', 'HOLD', 'HOLD_PRIVATE', 'HOLD_BLOCKED', 'HOLD_TENTATIVE');

-- CreateEnum
CREATE TYPE "crm"."ActivityStatus" AS ENUM ('NOT_STARTED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_INFO', 'PAUSED', 'REASSIGNED', 'PENDING_APPROVAL', 'IN_REVIEW', 'COMPLETED', 'CANCELLED', 'FAILED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "crm"."AddressType" AS ENUM ('HOME', 'WORK', 'VACATION', 'OTHER');

-- CreateEnum
CREATE TYPE "crm"."ContactType" AS ENUM ('INDIVIDUAL', 'HOUSEHOLD', 'COMPANY');

-- CreateEnum
CREATE TYPE "crm"."ContactStatus" AS ENUM ('CLIENT', 'LEAD', 'OFF', 'PERM_OFF', 'PROSPECT', 'STRATEGIC_PARTNER', 'PLAN_PARTICIPANT', 'OTHER');

-- CreateEnum
CREATE TYPE "crm"."AccessGroup" AS ENUM ('SYSADMIN', 'ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "crm"."PhoneType" AS ENUM ('HOME', 'WORK', 'VACATION', 'MOBILE', 'OTHER');

-- CreateEnum
CREATE TYPE "crm"."ImportantDateType" AS ENUM ('ANNIVERSARY', 'RETIREMENT', 'BIRTHDAY');

-- CreateEnum
CREATE TYPE "crm"."LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "crm"."HouseholdRelationshipStatus" AS ENUM ('HEAD_OF_HOUSEHOLD', 'SPOUSE', 'SON', 'DAUGHTER', 'AUNT', 'UNCLE', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'NIECE', 'NEPHEW');

-- CreateEnum
CREATE TYPE "crm"."CompanyRelationshipStatus" AS ENUM ('OWNS_COMPANY', 'C_SUTIE', 'EXECUTIVE', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'PARTNER', 'CHAIRMAN_OF_THE_BOARD', 'BOARD_MEMBER');

-- CreateEnum
CREATE TYPE "crm"."LifecycleStage" AS ENUM ('ACCUMULATION', 'PRE_RETIREMENT', 'RETIREMENT', 'SEMI_RETIRED', 'NOT_ASSIGNED', 'PRE_INVESTMENT', 'LEGACY');

-- CreateEnum
CREATE TYPE "crm"."Role" AS ENUM ('COMPUTER_OPERATOR', 'ADVISOR', 'SERVICE_ASSISTANT', 'SALES_ASSISTANT');

-- CreateTable
CREATE TABLE "crm"."tenets" (
    "id" BYTEA NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."users" (
    "id" BYTEA NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "password" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "type" "crm"."AccessGroup" NOT NULL DEFAULT 'CLIENT',
    "tenetId" BYTEA,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contacts" (
    "id" BYTEA NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "importantNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "crm"."ContactType" NOT NULL,
    "status" "crm"."ContactStatus" NOT NULL,
    "lifecycleStage" "crm"."LifecycleStage",
    "lastContactedDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "householdId" BYTEA,
    "householdStatus" "crm"."HouseholdRelationshipStatus",
    "companyId" BYTEA,
    "position" TEXT,
    "companyStatus" "crm"."CompanyRelationshipStatus",
    "headOfHouseholdId" BYTEA,
    "industry" TEXT,
    "website" TEXT,
    "size" INTEGER,
    "primaryContactId" BYTEA,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_relationships" (
    "id" BYTEA NOT NULL,
    "sourceId" BYTEA NOT NULL,
    "targetId" BYTEA NOT NULL,
    "type" TEXT NOT NULL,
    "established" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "contact_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activity_steps" (
    "id" BYTEA NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "activityId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "type" "crm"."ActivityStepType" NOT NULL DEFAULT 'CHECK',
    "order" INTEGER NOT NULL,

    CONSTRAINT "activity_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activity_step_user_joins" (
    "activityStepId" BYTEA NOT NULL,
    "userId" BYTEA NOT NULL,

    CONSTRAINT "activity_step_user_joins_pkey" PRIMARY KEY ("activityStepId","userId")
);

-- CreateTable
CREATE TABLE "crm"."user_waypoint_join" (
    "userId" BYTEA NOT NULL,
    "waypointId" BYTEA NOT NULL,

    CONSTRAINT "user_waypoint_join_pkey" PRIMARY KEY ("userId","waypointId")
);

-- CreateTable
CREATE TABLE "crm"."activity_waypoints" (
    "id" BYTEA NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "summary" TEXT,
    "status" "crm"."ActivityStatus" NOT NULL,
    "order" INTEGER NOT NULL,
    "actualStart" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "actualEnd" TIMESTAMP(3),
    "activityId" BYTEA NOT NULL,
    "templateId" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenetId" BYTEA NOT NULL,

    CONSTRAINT "activity_waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."template_assignments" (
    "id" BYTEA NOT NULL,
    "specificUserId" BYTEA,
    "specificRole" "crm"."Role",
    "activityTemplateId" BYTEA,
    "waypointTemplateId" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenetId" BYTEA NOT NULL,

    CONSTRAINT "template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activity_waypoint_templates" (
    "id" BYTEA NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defaultStatus" "crm"."ActivityStatus" NOT NULL,
    "order" INTEGER NOT NULL,
    "dateOffsetType" "crm"."DateOffsetType" NOT NULL,
    "dueDate" INTEGER NOT NULL,
    "parentActivityId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenetId" BYTEA NOT NULL,

    CONSTRAINT "activity_waypoint_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activity_template_steps" (
    "id" BYTEA NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "crm"."ActivityStepType" NOT NULL DEFAULT 'CHECK',
    "activityTemplateId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,

    CONSTRAINT "activity_template_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activity_template_step_assignments" (
    "id" BYTEA NOT NULL,
    "specificUserId" BYTEA,
    "specificRole" "crm"."Role",
    "activityTemplateStepId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,

    CONSTRAINT "activity_template_step_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activity_templates" (
    "id" BYTEA NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "crm"."ActivityType" NOT NULL,
    "defaultPriority" "crm"."ActivityPriority" NOT NULL,
    "defaultStatus" "crm"."ActivityStatus" NOT NULL,
    "taskScheduleType" "crm"."TaskScheduleType",
    "dateOffsetType" "crm"."DateOffsetType" NOT NULL,
    "startDate" INTEGER NOT NULL,
    "endDate" INTEGER NOT NULL,
    "startRelativeToId" BYTEA,
    "parentWaypointId" BYTEA,
    "parentActivityId" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "order" INTEGER,

    CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activities" (
    "id" BYTEA NOT NULL,
    "title" TEXT NOT NULL,
    "type" "crm"."ActivityType" NOT NULL,
    "parentActivityId" BYTEA,
    "parentWaypointId" BYTEA,
    "templateId" BYTEA,
    "taskScheduleType" "crm"."TaskScheduleType",
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "description" TEXT,
    "priority" "crm"."ActivityPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "crm"."ActivityStatus" NOT NULL,
    "assignedById" BYTEA NOT NULL,
    "phoneNumber" TEXT,
    "location" TEXT,
    "holdReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "order" INTEGER,
    "opportunityId" BYTEA,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_timeline_events" (
    "id" BYTEA NOT NULL,
    "activityId" BYTEA,
    "waypointId" BYTEA,
    "opportunityId" BYTEA,
    "noteId" BYTEA,
    "extraInfo" TEXT,
    "userId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "eventType" "crm"."ContactTimelineEventType" NOT NULL,
    "relationshipType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."audit_events" (
    "id" BYTEA NOT NULL,
    "userId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "type" "crm"."AuditEventType" NOT NULL,
    "details" TEXT,
    "referenceId" BYTEA NOT NULL,
    "reference" "crm"."Auditable" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_timeline_events_contact_join" (
    "contactEventId" BYTEA NOT NULL,
    "contactId" BYTEA NOT NULL,
    "type" "crm"."ContactTimelineEventJoinType" NOT NULL,

    CONSTRAINT "contact_timeline_events_contact_join_pkey" PRIMARY KEY ("contactEventId","contactId")
);

-- CreateTable
CREATE TABLE "crm"."notes" (
    "id" BYTEA NOT NULL,
    "content" TEXT NOT NULL,
    "waypointId" BYTEA,
    "activityId" BYTEA,
    "contactId" BYTEA,
    "opportunityId" BYTEA,
    "tenetId" BYTEA NOT NULL,
    "authorId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "noteType" "crm"."NoteType" NOT NULL DEFAULT 'NOTE',

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."attachments" (
    "id" BYTEA NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "activityId" BYTEA,
    "tenetId" BYTEA NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."activity_contact_join" (
    "activityId" BYTEA NOT NULL,
    "contactId" BYTEA NOT NULL,

    CONSTRAINT "activity_contact_join_pkey" PRIMARY KEY ("activityId","contactId")
);

-- CreateTable
CREATE TABLE "crm"."activity_user_join" (
    "activityId" BYTEA NOT NULL,
    "userId" BYTEA NOT NULL,

    CONSTRAINT "activity_user_join_pkey" PRIMARY KEY ("activityId","userId")
);

-- CreateTable
CREATE TABLE "crm"."contact_email" (
    "id" BYTEA NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "contactId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_phone" (
    "id" BYTEA NOT NULL,
    "number" TEXT NOT NULL,
    "type" "crm"."PhoneType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "contactId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."addresses" (
    "id" BYTEA NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "type" "crm"."AddressType" NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "contactId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."config" (
    "id" BYTEA NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."important_dates" (
    "id" BYTEA NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "crm"."ImportantDateType" NOT NULL,
    "contactId" BYTEA NOT NULL,
    "tenetId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "important_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."opportunities" (
    "id" BYTEA NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "expectedCloseDate" TIMESTAMP(3) NOT NULL,
    "actualCloseDate" TIMESTAMP(3),
    "status" "crm"."OpportunityStatus" NOT NULL,
    "statusHistory" "crm"."OpportunityStatus"[],
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "tenetId" BYTEA NOT NULL,
    "expectedValue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_opportunity_join" (
    "contactId" BYTEA NOT NULL,
    "opportunityId" BYTEA NOT NULL,

    CONSTRAINT "contact_opportunity_join_pkey" PRIMARY KEY ("contactId","opportunityId")
);

-- CreateTable
CREATE TABLE "crm"."user_opportunity_join" (
    "userId" BYTEA NOT NULL,
    "opportunityId" BYTEA NOT NULL,

    CONSTRAINT "user_opportunity_join_pkey" PRIMARY KEY ("userId","opportunityId")
);

-- CreateTable
CREATE TABLE "crm"."opportunity_product" (
    "id" BYTEA NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "opportunityId" BYTEA NOT NULL,
    "productTypeId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."products" (
    "id" BYTEA NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defaultCommission" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenetId" BYTEA NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."logs" (
    "id" BYTEA NOT NULL,
    "userEmail" TEXT,
    "tenetId" BYTEA,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "severity" "crm"."LogLevel" NOT NULL DEFAULT 'INFO',
    "stacktrace" TEXT,
    "source" TEXT,
    "secureDetails" TEXT,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."tokens" (
    "id" BYTEA NOT NULL,
    "userId" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refresh" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."tz_data" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provinceName" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "tz" TEXT NOT NULL,

    CONSTRAINT "tz_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests"."TestObject" (
    "id" BYTEA NOT NULL,
    "required" TEXT NOT NULL,
    "persisted" TEXT,

    CONSTRAINT "TestObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests"."WrappedObject" (
    "id" BYTEA NOT NULL,
    "persisted" TEXT,
    "testObjectId" BYTEA NOT NULL,

    CONSTRAINT "WrappedObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests"."JoinTestObject" (
    "testObjectId" BYTEA NOT NULL,
    "joinedObjectId" BYTEA NOT NULL,
    "joinProperty" TEXT NOT NULL,

    CONSTRAINT "JoinTestObject_pkey" PRIMARY KEY ("testObjectId","joinedObjectId")
);

-- CreateTable
CREATE TABLE "tests"."JoinTestObject2" (
    "id" BYTEA NOT NULL,
    "testObjectId" BYTEA NOT NULL,
    "joinedObjectId" BYTEA NOT NULL,
    "joinProperty" TEXT NOT NULL,

    CONSTRAINT "JoinTestObject2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests"."JoinedObject1" (
    "id" BYTEA NOT NULL,
    "persisted" TEXT,

    CONSTRAINT "JoinedObject1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests"."JoinedObject2" (
    "id" BYTEA NOT NULL,
    "persisted" TEXT,

    CONSTRAINT "JoinedObject2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests"."JoinSelfReference" (
    "id" BYTEA NOT NULL,
    "sourceId" BYTEA NOT NULL,
    "targetId" BYTEA NOT NULL,
    "joinProperty" TEXT NOT NULL,

    CONSTRAINT "JoinSelfReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests"."SelfReferencialJoinModel" (
    "id" BYTEA NOT NULL,

    CONSTRAINT "SelfReferencialJoinModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenets_name_key" ON "crm"."tenets"("name");

-- CreateIndex
CREATE INDEX "tenets_name_idx" ON "crm"."tenets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "crm"."users"("email");

-- CreateIndex
CREATE INDEX "users_fullName_idx" ON "crm"."users"("fullName");

-- CreateIndex
CREATE INDEX "users_tenetId_idx" ON "crm"."users"("tenetId");

-- CreateIndex
CREATE INDEX "users_deleted_idx" ON "crm"."users"("deleted");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_headOfHouseholdId_key" ON "crm"."contacts"("headOfHouseholdId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_primaryContactId_key" ON "crm"."contacts"("primaryContactId");

-- CreateIndex
CREATE INDEX "contacts_fullName_idx" ON "crm"."contacts"("fullName");

-- CreateIndex
CREATE INDEX "contacts_lastName_idx" ON "crm"."contacts"("lastName");

-- CreateIndex
CREATE INDEX "contacts_tenetId_idx" ON "crm"."contacts"("tenetId");

-- CreateIndex
CREATE INDEX "contacts_householdId_idx" ON "crm"."contacts"("householdId");

-- CreateIndex
CREATE INDEX "contacts_companyId_idx" ON "crm"."contacts"("companyId");

-- CreateIndex
CREATE INDEX "contacts_primaryContactId_idx" ON "crm"."contacts"("primaryContactId");

-- CreateIndex
CREATE INDEX "contacts_status_idx" ON "crm"."contacts"("status");

-- CreateIndex
CREATE INDEX "contacts_type_idx" ON "crm"."contacts"("type");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "crm"."contacts"("createdAt");

-- CreateIndex
CREATE INDEX "contacts_updatedAt_idx" ON "crm"."contacts"("updatedAt");

-- CreateIndex
CREATE INDEX "contacts_deleted_idx" ON "crm"."contacts"("deleted");

-- CreateIndex
CREATE UNIQUE INDEX "contact_relationships_sourceId_targetId_type_key" ON "crm"."contact_relationships"("sourceId", "targetId", "type");

-- CreateIndex
CREATE INDEX "activity_steps_activityId_idx" ON "crm"."activity_steps"("activityId");

-- CreateIndex
CREATE INDEX "activity_steps_tenetId_idx" ON "crm"."activity_steps"("tenetId");

-- CreateIndex
CREATE INDEX "activity_steps_order_idx" ON "crm"."activity_steps"("order");

-- CreateIndex
CREATE INDEX "activity_waypoints_activityId_idx" ON "crm"."activity_waypoints"("activityId");

-- CreateIndex
CREATE INDEX "activity_waypoints_templateId_idx" ON "crm"."activity_waypoints"("templateId");

-- CreateIndex
CREATE INDEX "activity_waypoints_tenetId_idx" ON "crm"."activity_waypoints"("tenetId");

-- CreateIndex
CREATE INDEX "activity_waypoints_order_idx" ON "crm"."activity_waypoints"("order");

-- CreateIndex
CREATE INDEX "template_assignments_waypointTemplateId_idx" ON "crm"."template_assignments"("waypointTemplateId");

-- CreateIndex
CREATE INDEX "template_assignments_activityTemplateId_idx" ON "crm"."template_assignments"("activityTemplateId");

-- CreateIndex
CREATE INDEX "template_assignments_specificUserId_idx" ON "crm"."template_assignments"("specificUserId");

-- CreateIndex
CREATE INDEX "template_assignments_tenetId_idx" ON "crm"."template_assignments"("tenetId");

-- CreateIndex
CREATE INDEX "activity_waypoint_templates_parentActivityId_idx" ON "crm"."activity_waypoint_templates"("parentActivityId");

-- CreateIndex
CREATE INDEX "activity_waypoint_templates_tenetId_idx" ON "crm"."activity_waypoint_templates"("tenetId");

-- CreateIndex
CREATE INDEX "activity_waypoint_templates_order_idx" ON "crm"."activity_waypoint_templates"("order");

-- CreateIndex
CREATE INDEX "activity_template_steps_activityTemplateId_idx" ON "crm"."activity_template_steps"("activityTemplateId");

-- CreateIndex
CREATE INDEX "activity_template_steps_order_idx" ON "crm"."activity_template_steps"("order");

-- CreateIndex
CREATE INDEX "activity_template_steps_tenetId_idx" ON "crm"."activity_template_steps"("tenetId");

-- CreateIndex
CREATE INDEX "activity_template_step_assignments_tenetId_idx" ON "crm"."activity_template_step_assignments"("tenetId");

-- CreateIndex
CREATE INDEX "activity_template_step_assignments_activityTemplateStepId_idx" ON "crm"."activity_template_step_assignments"("activityTemplateStepId");

-- CreateIndex
CREATE INDEX "activity_templates_title_idx" ON "crm"."activity_templates"("title");

-- CreateIndex
CREATE INDEX "activity_templates_parentWaypointId_idx" ON "crm"."activity_templates"("parentWaypointId");

-- CreateIndex
CREATE INDEX "activity_templates_parentActivityId_idx" ON "crm"."activity_templates"("parentActivityId");

-- CreateIndex
CREATE INDEX "activity_templates_order_idx" ON "crm"."activity_templates"("order");

-- CreateIndex
CREATE INDEX "activity_templates_tenetId_idx" ON "crm"."activity_templates"("tenetId");

-- CreateIndex
CREATE INDEX "activities_startDate_idx" ON "crm"."activities"("startDate");

-- CreateIndex
CREATE INDEX "activities_endDate_idx" ON "crm"."activities"("endDate");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "crm"."activities"("createdAt");

-- CreateIndex
CREATE INDEX "activities_updatedAt_idx" ON "crm"."activities"("updatedAt");

-- CreateIndex
CREATE INDEX "activities_title_idx" ON "crm"."activities"("title");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "crm"."activities"("type");

-- CreateIndex
CREATE INDEX "activities_tenetId_idx" ON "crm"."activities"("tenetId");

-- CreateIndex
CREATE INDEX "activities_status_idx" ON "crm"."activities"("status");

-- CreateIndex
CREATE INDEX "activities_taskScheduleType_idx" ON "crm"."activities"("taskScheduleType");

-- CreateIndex
CREATE INDEX "activities_parentActivityId_idx" ON "crm"."activities"("parentActivityId");

-- CreateIndex
CREATE INDEX "activities_parentWaypointId_idx" ON "crm"."activities"("parentWaypointId");

-- CreateIndex
CREATE INDEX "activities_templateId_idx" ON "crm"."activities"("templateId");

-- CreateIndex
CREATE INDEX "activities_order_idx" ON "crm"."activities"("order");

-- CreateIndex
CREATE INDEX "activities_deleted_idx" ON "crm"."activities"("deleted");

-- CreateIndex
CREATE INDEX "activities_opportunityId_idx" ON "crm"."activities"("opportunityId");

-- CreateIndex
CREATE INDEX "contact_timeline_events_activityId_idx" ON "crm"."contact_timeline_events"("activityId");

-- CreateIndex
CREATE INDEX "contact_timeline_events_noteId_idx" ON "crm"."contact_timeline_events"("noteId");

-- CreateIndex
CREATE INDEX "contact_timeline_events_userId_idx" ON "crm"."contact_timeline_events"("userId");

-- CreateIndex
CREATE INDEX "contact_timeline_events_opportunityId_idx" ON "crm"."contact_timeline_events"("opportunityId");

-- CreateIndex
CREATE INDEX "contact_timeline_events_tenetId_idx" ON "crm"."contact_timeline_events"("tenetId");

-- CreateIndex
CREATE INDEX "audit_events_reference_referenceId_idx" ON "crm"."audit_events"("reference", "referenceId");

-- CreateIndex
CREATE INDEX "audit_events_type_idx" ON "crm"."audit_events"("type");

-- CreateIndex
CREATE INDEX "audit_events_userId_idx" ON "crm"."audit_events"("userId");

-- CreateIndex
CREATE INDEX "audit_events_tenetId_idx" ON "crm"."audit_events"("tenetId");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "crm"."audit_events"("createdAt");

-- CreateIndex
CREATE INDEX "notes_authorId_idx" ON "crm"."notes"("authorId");

-- CreateIndex
CREATE INDEX "notes_tenetId_idx" ON "crm"."notes"("tenetId");

-- CreateIndex
CREATE INDEX "notes_activityId_idx" ON "crm"."notes"("activityId");

-- CreateIndex
CREATE INDEX "notes_contactId_idx" ON "crm"."notes"("contactId");

-- CreateIndex
CREATE INDEX "notes_deleted_idx" ON "crm"."notes"("deleted");

-- CreateIndex
CREATE INDEX "attachments_name_idx" ON "crm"."attachments"("name");

-- CreateIndex
CREATE INDEX "attachments_tenetId_idx" ON "crm"."attachments"("tenetId");

-- CreateIndex
CREATE INDEX "attachments_location_idx" ON "crm"."attachments"("location");

-- CreateIndex
CREATE INDEX "contact_email_email_idx" ON "crm"."contact_email"("email");

-- CreateIndex
CREATE INDEX "contact_email_tenetId_idx" ON "crm"."contact_email"("tenetId");

-- CreateIndex
CREATE INDEX "contact_email_contactId_idx" ON "crm"."contact_email"("contactId");

-- CreateIndex
CREATE INDEX "contact_email_isPrimary_idx" ON "crm"."contact_email"("isPrimary");

-- CreateIndex
CREATE INDEX "contact_phone_number_idx" ON "crm"."contact_phone"("number");

-- CreateIndex
CREATE INDEX "contact_phone_type_idx" ON "crm"."contact_phone"("type");

-- CreateIndex
CREATE INDEX "contact_phone_tenetId_idx" ON "crm"."contact_phone"("tenetId");

-- CreateIndex
CREATE INDEX "contact_phone_contactId_idx" ON "crm"."contact_phone"("contactId");

-- CreateIndex
CREATE INDEX "contact_phone_isPrimary_idx" ON "crm"."contact_phone"("isPrimary");

-- CreateIndex
CREATE INDEX "addresses_street_idx" ON "crm"."addresses"("street");

-- CreateIndex
CREATE INDEX "addresses_city_idx" ON "crm"."addresses"("city");

-- CreateIndex
CREATE INDEX "addresses_state_idx" ON "crm"."addresses"("state");

-- CreateIndex
CREATE INDEX "addresses_zip_idx" ON "crm"."addresses"("zip");

-- CreateIndex
CREATE INDEX "addresses_country_idx" ON "crm"."addresses"("country");

-- CreateIndex
CREATE INDEX "addresses_contactId_idx" ON "crm"."addresses"("contactId");

-- CreateIndex
CREATE INDEX "addresses_primary_idx" ON "crm"."addresses"("primary");

-- CreateIndex
CREATE INDEX "addresses_tenetId_idx" ON "crm"."addresses"("tenetId");

-- CreateIndex
CREATE INDEX "addresses_type_idx" ON "crm"."addresses"("type");

-- CreateIndex
CREATE UNIQUE INDEX "config_name_key" ON "crm"."config"("name");

-- CreateIndex
CREATE INDEX "important_dates_date_idx" ON "crm"."important_dates"("date");

-- CreateIndex
CREATE INDEX "important_dates_type_idx" ON "crm"."important_dates"("type");

-- CreateIndex
CREATE INDEX "important_dates_contactId_idx" ON "crm"."important_dates"("contactId");

-- CreateIndex
CREATE INDEX "important_dates_tenetId_idx" ON "crm"."important_dates"("tenetId");

-- CreateIndex
CREATE INDEX "opportunities_title_idx" ON "crm"."opportunities"("title");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "crm"."opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_expectedCloseDate_idx" ON "crm"."opportunities"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "opportunities_actualCloseDate_idx" ON "crm"."opportunities"("actualCloseDate");

-- CreateIndex
CREATE INDEX "opportunities_tenetId_idx" ON "crm"."opportunities"("tenetId");

-- CreateIndex
CREATE INDEX "opportunities_deleted_idx" ON "crm"."opportunities"("deleted");

-- CreateIndex
CREATE INDEX "opportunity_product_opportunityId_idx" ON "crm"."opportunity_product"("opportunityId");

-- CreateIndex
CREATE INDEX "opportunity_product_productTypeId_idx" ON "crm"."opportunity_product"("productTypeId");

-- CreateIndex
CREATE INDEX "opportunity_product_order_idx" ON "crm"."opportunity_product"("order");

-- CreateIndex
CREATE INDEX "products_tenetId_idx" ON "crm"."products"("tenetId");

-- CreateIndex
CREATE INDEX "products_title_idx" ON "crm"."products"("title");

-- CreateIndex
CREATE INDEX "logs_createdAt_idx" ON "crm"."logs"("createdAt");

-- CreateIndex
CREATE INDEX "logs_message_idx" ON "crm"."logs"("message");

-- CreateIndex
CREATE INDEX "logs_severity_idx" ON "crm"."logs"("severity");

-- CreateIndex
CREATE INDEX "logs_tenetId_idx" ON "crm"."logs"("tenetId");

-- CreateIndex
CREATE INDEX "tokens_userId_idx" ON "crm"."tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tz_data_name_provinceName_countryCode_key" ON "crm"."tz_data"("name", "provinceName", "countryCode");

-- AddForeignKey
ALTER TABLE "crm"."users" ADD CONSTRAINT "users_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_headOfHouseholdId_fkey" FOREIGN KEY ("headOfHouseholdId") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_relationships" ADD CONSTRAINT "contact_relationships_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_relationships" ADD CONSTRAINT "contact_relationships_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_steps" ADD CONSTRAINT "activity_steps_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_steps" ADD CONSTRAINT "activity_steps_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_step_user_joins" ADD CONSTRAINT "activity_step_user_joins_activityStepId_fkey" FOREIGN KEY ("activityStepId") REFERENCES "crm"."activity_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_step_user_joins" ADD CONSTRAINT "activity_step_user_joins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."user_waypoint_join" ADD CONSTRAINT "user_waypoint_join_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."user_waypoint_join" ADD CONSTRAINT "user_waypoint_join_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "crm"."activity_waypoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_waypoints" ADD CONSTRAINT "activity_waypoints_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_waypoints" ADD CONSTRAINT "activity_waypoints_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "crm"."activity_waypoint_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_waypoints" ADD CONSTRAINT "activity_waypoints_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."template_assignments" ADD CONSTRAINT "template_assignments_specificUserId_fkey" FOREIGN KEY ("specificUserId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."template_assignments" ADD CONSTRAINT "template_assignments_activityTemplateId_fkey" FOREIGN KEY ("activityTemplateId") REFERENCES "crm"."activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."template_assignments" ADD CONSTRAINT "template_assignments_waypointTemplateId_fkey" FOREIGN KEY ("waypointTemplateId") REFERENCES "crm"."activity_waypoint_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."template_assignments" ADD CONSTRAINT "template_assignments_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_waypoint_templates" ADD CONSTRAINT "activity_waypoint_templates_parentActivityId_fkey" FOREIGN KEY ("parentActivityId") REFERENCES "crm"."activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_waypoint_templates" ADD CONSTRAINT "activity_waypoint_templates_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_template_steps" ADD CONSTRAINT "activity_template_steps_activityTemplateId_fkey" FOREIGN KEY ("activityTemplateId") REFERENCES "crm"."activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_template_steps" ADD CONSTRAINT "activity_template_steps_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_template_step_assignments" ADD CONSTRAINT "activity_template_step_assignments_specificUserId_fkey" FOREIGN KEY ("specificUserId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_template_step_assignments" ADD CONSTRAINT "activity_template_step_assignments_activityTemplateStepId_fkey" FOREIGN KEY ("activityTemplateStepId") REFERENCES "crm"."activity_template_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_template_step_assignments" ADD CONSTRAINT "activity_template_step_assignments_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_templates" ADD CONSTRAINT "activity_templates_startRelativeToId_fkey" FOREIGN KEY ("startRelativeToId") REFERENCES "crm"."activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_templates" ADD CONSTRAINT "activity_templates_parentWaypointId_fkey" FOREIGN KEY ("parentWaypointId") REFERENCES "crm"."activity_waypoint_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_templates" ADD CONSTRAINT "activity_templates_parentActivityId_fkey" FOREIGN KEY ("parentActivityId") REFERENCES "crm"."activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_templates" ADD CONSTRAINT "activity_templates_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activities" ADD CONSTRAINT "activities_parentActivityId_fkey" FOREIGN KEY ("parentActivityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activities" ADD CONSTRAINT "activities_parentWaypointId_fkey" FOREIGN KEY ("parentWaypointId") REFERENCES "crm"."activity_waypoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activities" ADD CONSTRAINT "activities_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "crm"."activity_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activities" ADD CONSTRAINT "activities_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activities" ADD CONSTRAINT "activities_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activities" ADD CONSTRAINT "activities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events" ADD CONSTRAINT "contact_timeline_events_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events" ADD CONSTRAINT "contact_timeline_events_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "crm"."activity_waypoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events" ADD CONSTRAINT "contact_timeline_events_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events" ADD CONSTRAINT "contact_timeline_events_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "crm"."notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events" ADD CONSTRAINT "contact_timeline_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events" ADD CONSTRAINT "contact_timeline_events_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."audit_events" ADD CONSTRAINT "audit_events_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events_contact_join" ADD CONSTRAINT "contact_timeline_events_contact_join_contactEventId_fkey" FOREIGN KEY ("contactEventId") REFERENCES "crm"."contact_timeline_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_timeline_events_contact_join" ADD CONSTRAINT "contact_timeline_events_contact_join_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."notes" ADD CONSTRAINT "notes_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "crm"."activity_waypoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."notes" ADD CONSTRAINT "notes_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."notes" ADD CONSTRAINT "notes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."notes" ADD CONSTRAINT "notes_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."notes" ADD CONSTRAINT "notes_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."notes" ADD CONSTRAINT "notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."attachments" ADD CONSTRAINT "attachments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."attachments" ADD CONSTRAINT "attachments_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_contact_join" ADD CONSTRAINT "activity_contact_join_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_contact_join" ADD CONSTRAINT "activity_contact_join_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_user_join" ADD CONSTRAINT "activity_user_join_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."activity_user_join" ADD CONSTRAINT "activity_user_join_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_email" ADD CONSTRAINT "contact_email_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_email" ADD CONSTRAINT "contact_email_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_phone" ADD CONSTRAINT "contact_phone_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_phone" ADD CONSTRAINT "contact_phone_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."addresses" ADD CONSTRAINT "addresses_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."addresses" ADD CONSTRAINT "addresses_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."important_dates" ADD CONSTRAINT "important_dates_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."important_dates" ADD CONSTRAINT "important_dates_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunities" ADD CONSTRAINT "opportunities_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_opportunity_join" ADD CONSTRAINT "contact_opportunity_join_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_opportunity_join" ADD CONSTRAINT "contact_opportunity_join_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."user_opportunity_join" ADD CONSTRAINT "user_opportunity_join_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."user_opportunity_join" ADD CONSTRAINT "user_opportunity_join_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunity_product" ADD CONSTRAINT "opportunity_product_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm"."opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunity_product" ADD CONSTRAINT "opportunity_product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "crm"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."products" ADD CONSTRAINT "products_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."logs" ADD CONSTRAINT "logs_tenetId_fkey" FOREIGN KEY ("tenetId") REFERENCES "crm"."tenets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."tokens" ADD CONSTRAINT "tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "crm"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests"."WrappedObject" ADD CONSTRAINT "WrappedObject_testObjectId_fkey" FOREIGN KEY ("testObjectId") REFERENCES "tests"."TestObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests"."JoinTestObject" ADD CONSTRAINT "JoinTestObject_testObjectId_fkey" FOREIGN KEY ("testObjectId") REFERENCES "tests"."TestObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests"."JoinTestObject" ADD CONSTRAINT "JoinTestObject_joinedObjectId_fkey" FOREIGN KEY ("joinedObjectId") REFERENCES "tests"."JoinedObject1"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests"."JoinTestObject2" ADD CONSTRAINT "JoinTestObject2_testObjectId_fkey" FOREIGN KEY ("testObjectId") REFERENCES "tests"."TestObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests"."JoinTestObject2" ADD CONSTRAINT "JoinTestObject2_joinedObjectId_fkey" FOREIGN KEY ("joinedObjectId") REFERENCES "tests"."JoinedObject2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests"."JoinSelfReference" ADD CONSTRAINT "JoinSelfReference_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "tests"."SelfReferencialJoinModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests"."JoinSelfReference" ADD CONSTRAINT "JoinSelfReference_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "tests"."SelfReferencialJoinModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
