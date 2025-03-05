//import 'server-only'
import {AccessGroup} from "~/common/enum/enumerations";

export enum Settings {
    /** The API key used to authenticate requests to the server from WordPress */
    API_KEY = 'API_KEY',
    DOWNLOAD_LIMIT = 'DOWNLOAD_LIMIT',
    /** The API key used to authenticate requests sent to WordPress */
    WP_API_KEY = 'WP_API_KEY',
    VERSION = 'VERSION',
    IMPORT = 'IMPORT', // Database setting for if initial data import was completed
    USER_LIMIT = 'USER_LIMIT', // Default user limit for offices, ie the max number of users an advisor can add to his office
    DOWNLOAD_LICENSE_LIMIT = 'DOWNLOAD_LICENSE_LIMIT',
    ADVISOR_LICENSE_LIMIT = 'ADVISOR_LICENSE_LIMIT',

    // JSON Schema for the navbar
    NAVBAR_DEFINITION = 'NAVBAR_DEFINITION',
    // HTML for the navbar banner
    NAVBAR_BANNER = 'NAVBAR_BANNER'
}

export const ViewableRoles = [AccessGroup.CLIENT, AccessGroup.ADMIN];
export const AccessGroupHierarchy = [AccessGroup.CLIENT, AccessGroup.ADMIN, AccessGroup.SYSADMIN];

/* BEGIN GENERATED ENUM LogLevel DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum LogLevel {
    	DEBUG = 'DEBUG',
		INFO = 'INFO',
		WARNING = 'WARNING',
		HIGH = 'HIGH',
		CRITICAL = 'CRITICAL'
}
/* END GENERATED ENUM LogLevel DO NOT MODIFY OR REMOVE THIS COMMENT */


export const LogLevelMappings = {
    [LogLevel.DEBUG]: 'Debug',
    [LogLevel.INFO]: 'Info',
    [LogLevel.WARNING]: 'Warning',
    [LogLevel.HIGH]: 'High',
    [LogLevel.CRITICAL]: 'Critical'
}

/* BEGIN GENERATED ENUM Auditable DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum Auditable {
    	CONTACT = 'CONTACT',
		NOTE = 'NOTE',
		ACTIVITY = 'ACTIVITY',
		OPPORTUNITY = 'OPPORTUNITY',
		USER = 'USER',
		ADDRESS = 'ADDRESS',
		CONTACT_EMAIL = 'CONTACT_EMAIL',
		CONTACT_PHONE = 'CONTACT_PHONE',
		IMPORTANT_DATE = 'IMPORTANT_DATE',
		ATTACHMENT = 'ATTACHMENT'
}
/* END GENERATED ENUM Auditable DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED ENUM AuditEventType DO NOT MODIFY OR REMOVE THIS COMMENT */
export enum AuditEventType {
    	READ = 'READ',
		CREATE = 'CREATE',
		UPDATE = 'UPDATE',
		DELETE = 'DELETE'
}
/* END GENERATED ENUM AuditEventType DO NOT MODIFY OR REMOVE THIS COMMENT */