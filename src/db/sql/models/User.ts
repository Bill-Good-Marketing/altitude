/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models, dbClient} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult, ModelQueryable} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, computed, persisted, Default, wrap, jointable, calculated, on} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {AccessGroup} from '~/common/enum/enumerations';
import {Token} from '~/db/sql/models/Token';
import {Tenet} from '~/db/sql/models/Tenet';
import {Activity} from '~/db/sql/models/Activity';
import {Note} from '~/db/sql/models/Note';
import {ActivityWaypoint} from '~/db/sql/models/ActivityWaypoint';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {AuditEvent} from '~/db/sql/models/AuditEvent';
import {TemplateAssignment} from '~/db/sql/models/TemplateAssignment';
import {Opportunity} from '~/db/sql/models/Opportunity';
import {ActivityStep} from '~/db/sql/models/ActivityStep';
import {ActivityTemplateStepAssignment} from '~/db/sql/models/ActivityTemplateStepAssignment';
import {AccessGroupHierarchy, LogLevel} from '~/common/enum/serverenums';
import {Log} from '~/db/sql/models/Log';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {revalidateCache} from "~/util/api/caching";
import {validateEmail} from "~/util/db/validation";
import {decryptData, encryptData, hashPassword} from "~/util/db/datamanagement";
import {InvalidOperationError} from "~/common/errors";
import {quickTrace} from "~/util/tracing";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type UserDefaultData = {
	email?: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	password?: string;
	enabled?: boolean;
	type?: AccessGroup;
	tokens?: Token[];
	tenet?: Tenet | null;
	tenetId?: Buffer | null;
	system?: boolean;
	activities?: Activity[];
	notes?: Note[];
	waypoints?: ActivityWaypoint[];
	events?: ContactTimelineEvent[];
	auditEvents?: AuditEvent[];
	deleted?: boolean;
	deletedAt?: Date | null;
	templateAssignments?: TemplateAssignment[];
	assignedActivities?: Activity[];
	opportunities?: Opportunity[];
	activitySteps?: ActivityStep[];
	templateStepAssignments?: ActivityTemplateStepAssignment[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type UserData = UserDefaultData & {}

/* End automatically generated type for `data` field in constructor */

export class User extends Model<User> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public email?: string;
	
	@ai.property('string', null, false, false)
	@required declare public firstName?: string;
	
	@ai.property('string', null, false, false)
	@required declare public lastName?: string;
	
	@computed(['firstName', 'lastName'], (obj, firstName: string, lastName: string) => {
        if (firstName === '' || firstName == null) {
            return lastName;
        }
        return `${firstName} ${lastName}`
    }, (obj, fullName: string) => {
        if (fullName == null) {
            return;
        }
        const user = obj as User;
        const initialOverride = user.overrideSetFunctionality;
        user.overrideSetFunctionality = true;
        const nameParts = fullName.split(' ');
        const len = nameParts.length;

        if (len == 1) {
            user.firstName = nameParts[0];
            user.lastName = '';
        } else {
            user.firstName = nameParts.slice(0, len - 1).join(' '); // All words up to the last
            user.lastName = nameParts[len - 1];
        }

        user._loadedProperties.add('firstName');
        user._loadedProperties.add('lastName');

        user._dirty['firstName'] = user.firstName;
        user._dirty['lastName'] = user.lastName;
        user.overrideSetFunctionality = initialOverride;
    })
	@ai.property('string', null, false, false)
	declare public fullName?: string;
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@required declare public password?: string;
	@persisted @Default(true) declare public enabled?: boolean;
	@persisted @Default(AccessGroup.CLIENT) declare public type?: AccessGroup;
	@wrap('token', 'user', 'userId', false, true) declare public tokens?: Token[];
	@wrap('tenet', 'users', 'tenetId', true, false) declare public tenet?: Tenet | null;
	@persisted declare public tenetId?: Buffer | null;
	@persisted @Default(false) declare public system?: boolean;
	
	@ai.property('activity', null, false, false)
	@jointable('activity', 'activityRelation', 'userId', 'activityId', 'activityId_userId', 'users')
	declare public activities?: Activity[];
	
	@ai.property('note', "notes this user authored", true, false)
	@wrap('note', 'author', 'authorId', false, true) declare public notes?: Note[];
	
	@ai.property('activityWaypoint', "Waypoints assigned to this user", false, false)
	@jointable('activityWaypoint', 'waypointRelation', 'userId', 'waypointId', 'userId_waypointId', 'users')
	declare public waypoints?: ActivityWaypoint[];
	
	@ai.property('contactTimelineEvent', "Events that this user triggered", true, false)
	@wrap('contactTimelineEvent', 'user', 'userId', false, true) declare public events?: ContactTimelineEvent[];
	
	@wrap('auditEvent', 'user', 'userId', false, true) declare public auditEvents?: AuditEvent[];
	@persisted @Default(false) declare public deleted?: boolean;
	@persisted declare public deletedAt?: Date | null;
	@wrap('templateAssignment', 'specificUser', 'specificUserId', false, true) declare public templateAssignments?: TemplateAssignment[];
	@wrap('activity', 'assignedBy', 'assignedById', false, true) declare public assignedActivities?: Activity[];
	
	@ai.property('opportunity', "Opportunities this user is involved in", false, false)
	@jointable('opportunity', 'opportunityRelation', 'userId', 'opportunityId', 'userId_opportunityId', 'teamMembers')
	declare public opportunities?: Opportunity[];
	
	@jointable('activityStep', 'stepRelation', 'userId', 'activityStepId', 'activityStepId_userId', 'assignedTo')
	declare public activitySteps?: ActivityStep[];
	
	@wrap('activityTemplateStepAssignment', 'specificUser', 'specificUserId', false, true) declare public templateStepAssignments?: ActivityTemplateStepAssignment[];
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    public trueAccess?: AccessGroup; // For viewing as functionality

    @calculated(['type'], (obj, type: AccessGroup) => {
        return type === AccessGroup.ADMIN;
    }, {})
    declare public isAdmin?: boolean;

    constructor(id?: Buffer | string | Uint8Array, data?: UserData) {
        super(id, data, (data != null && 'firstName' in data && 'lastName' in data) ? ['fullName'] : []);
    }

    static async read<Attrs extends ReadAttributes<User>>(options: ReadOptions<User, Attrs>): Promise<ModelSet<ReadResult<User, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<User>>(options: ReadUniqueOptions<User, Attrs>): Promise<ReadResult<User, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<User>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<User>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<User>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<User, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<User>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<User, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<User> = {
                OR: [
                    {
                        fullName: {
                            contains: searchString, mode: 'insensitive'
                        }
                    },
                    {
                        email: {
                            contains: searchString, mode: 'insensitive'
                        }
                    },
                ],
                tenetId
            }

            // Search by user name, email, and office name
            return Promise.all([User.read({
                where,
                orderBy: {
                    firstName: 'asc',
                    lastName: 'asc'
                },
                select,
                limit: count,
                offset
            }), User.count(where)])
        })
    }

    static className = (): ModelKeys => 'user';

    public async refreshSession(): Promise<void> {
        await dbClient.token.updateMany({
            where: {
                userId: this.guid
            },
            data: {
                refresh: true
            }
        })
        // @ts-expect-error - The type for revalidateCache cannot except dynamic inputs such as this, but it is a valid cache key.
        await revalidateCache(`valid-${this.guid.toString('hex')}`)
    }

    set new(newVal: boolean) {
        if (!newVal && this._new) {
            this._dirty = {};
        }

        this._new = newVal;
    }

    public async validate(): Promise<{ msg: string; result: boolean }> {
        if (this.isDirty('fullName')) {
            if (this.fullName === '.pathfinder.') {
                await this.safeLoad('system')
                if (!this.system) {
                    return {
                        result: false,
                        msg: 'Invalid {0}, you can\'t be Pathfinder! You\'re a person, not an AI!'
                    }
                }
            } else if (this.fullName === '.blueprint.') {
                await this.safeLoad('system')
                if (!this.system) {
                    return {
                        result: false,
                        msg: 'Invalid {0}, you can\'t be Blueprint! You\'re a person, not an automated workflow!'
                    }
                }
            }
        }

        // Validate email
        if (this.isDirty('email')) {
            const email = this.email;
            if (email) {
                if (!validateEmail(email)) {
                    return {
                        result: false,
                        msg: `Invalid {0}, ${email} is not a valid email address`
                    }
                }
            }
        }

        if (this.isDirty('type')) {
            if (!AccessGroupHierarchy.includes(this.type!)) {
                return {
                    result: false,
                    msg: `Invalid {0}, expected a valid access group, instead found ${this.type}`
                }
            }
        }

        if (this.isDirty('type')) {
            if (this.type === AccessGroup.CLIENT) {
                await this.safeLoad('tenetId');
                if (!this.tenetId) {
                    return {
                        result: false,
                        msg: 'Invalid {0}, client user must have a tenet'
                    }
                }
            }
        }

        return super.validate();
    }

    @on('delete', 'after')
    public async deleteSession(): Promise<void> {
        // @ts-expect-error - The type for revalidateCache cannot except dynamic inputs such as this, but it is a valid cache key.
        await revalidateCache(`valid-${this.guid.toString('hex')}`)
    }

    @on('update', 'after')
    public async updateSessionRefresh(property: string) {
        switch (property) {
            case 'officeAccountAdmin':
            case 'type':
            case 'enabled':
            case 'customized':
            case 'permissions':
                await this.refreshSession();
                break;
        }
    }

    public static async getByEmail(email: string): Promise<ReadResult<User, {
        email: true,
        fullName: true,
        type: true,
        enabled: true
    }> | null> {
        return await User.readUnique({
            where: {
                email: email
            },
            select: {
                email: true,
                fullName: true,
                type: true,
                enabled: true
            }
        });
    }

    @on('update', 'before')
    public async enabledUser(property: string, value: boolean, old: boolean, isBatch: boolean) {
        if (isBatch) {
            throw new InvalidOperationError('Cannot enable/disable user in batch operation');
        }

        if (property === 'enabled') {
            await this.safeLoad(['email'])
            await Log.log(`User ${this.guid.toString('hex')} ${value ? 'enabled' : 'disabled'}`, LogLevel.INFO, undefined, this.email);
        }
        return true;
    }

    // Password hashed then encrypted
    @on('update', 'before')
    public async updatePassword(property: string, value: string, old: string, isBatch: boolean) {
        if (isBatch) {
            throw new InvalidOperationError('Cannot update password in batch operation');
        }

        if (property === 'password') {
            this.password = hashPassword(value);
            this._dirty['password'] = encryptData(this.password);
        }
        return true;
    }

    // Password hashed then encrypted
    @on('create', 'before')
    public async createHashedPassword() {
        if (this.password) {
            this.password = hashPassword(this.password);
            this._dirty['password'] = encryptData(this.password);
        }
    }

    @on('read', 'after')
    public async decryptPassword(properties: ModelQueryable<User>[], user: User) {
        if (properties.includes('password') && user.password) {
            user.password = decryptData(user.password);
        }
    }

    @on('read', 'after')
    public async ensureValidType(properties: ModelQueryable<User>[], user: User) {
        if (properties.includes('type')) {
            if (!AccessGroupHierarchy.includes(user.type!)) {
                // This is a security issue, we should not allow invalid types
                await user.load('email')
                await Log.log(`User ${user.guid.toString('hex')} had an invalid access group ${user.type}, defaulting to ${AccessGroup.CLIENT}`, LogLevel.CRITICAL, undefined, user.email, undefined, undefined, user.tenetId);

                user.type = AccessGroup.CLIENT;
                await user.commit();
            }
        }
    }
}

models.user = User;
        