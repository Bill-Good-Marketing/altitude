//import 'server-only';
import {englishList, splitCamelCase} from "~/util/strings";
import {LogLevel, LogLevelMappings} from "~/common/enum/serverenums";

export class ValidationError extends Error {
    private _marker: string = 'ValidationError';

    constructor(formatStr: string, ...args: any[]) {
        super(ValidationError.formatMessage(formatStr, ...args));
    }

    public static formatMessage(formatStr: string, ...args: any[]) {
        const msg = formatStr.replace(/{(\d+)}/g, (match, number) => {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        })

        return msg.substring(0, 1).toUpperCase() + msg.substring(1);
    }

    static is(err: unknown): err is ValidationError {
        return (err as ValidationError).hasOwnProperty('_marker') && (err as ValidationError)['_marker'] === 'ValidationError';
    }
}

export class RelationshipNotFoundError extends ValidationError {
    constructor(relationship: string, model: string) {
        super('Relationship {0} not found on model {1}', relationship, model);
    }
}

export class RequiredPropertyError extends ValidationError {
    constructor(property: string) {
        super('Required property {0} not set', property);
    }
}

export class UncommitedObjectError extends Error {
    constructor(errMessage: string) {
        super(errMessage);
    }
}

export class DeletedObjectError extends Error {
    constructor(errMessage: string) {
        super(errMessage);
    }
}

export class UnsupportedOperationError extends Error {
    constructor(errMessage: string) {
        super(errMessage);
    }
}

export class InvalidOperationError extends Error {
    constructor(errMessage: string) {
        super(errMessage);
    }
}

export class ProgrammingError extends Error {
    constructor(errMessage: string) {
        super(errMessage);
    }
}

export class NotFoundError extends Error {
    constructor(errMessage: string) {
        super(errMessage);
    }
}

export class UniqueConstraintViolationError extends Error {
    private _marker: string = 'UniqueConstraintViolationError';
    private readonly _model: string;
    private readonly _fields: string[];

    constructor(model: string, field: string[], cause?: any) {
        super(`Unique constraint violation on model ${model} field ${field}`, {
            cause
        });

        this._model = model;
        this._fields = field;
    }

    get model(): string {
        return this._model;
    }

    get fields(): string[] {
        return this._fields;
    }

    static is(err: any): err is UniqueConstraintViolationError {
        return err.hasOwnProperty('_marker') && err['_marker'] === 'UniqueConstraintViolationError';
    }

    // Formats the message to be sent to the client
    getClientMessage() {
        return `That ${englishList(this._fields.map(splitCamelCase)).toLowerCase()} ${this._fields.length > 1 ? 'are' : 'is'} already in use.`
    }
}

// This error is specially handled to send a 500 status code to the client but also give a message to the client
// This error SHOULD be logged outside of the API route wrapper to give more detail to the developer.
// (Normally, the route wrapper will catch this error and send a generic 500 error to the client, and log the error)
export class NonGenericServerError extends Error {
    private _marker: string = 'NonGenericServerError';
    private readonly _cause: any;
    private readonly _className: string;
    private readonly _errMessage: string;
    private readonly _securitySeverity: LogLevel;

    constructor(className: string, errMessage: string, securitySeverity: LogLevel, cause?: any) {
        super(errMessage, {
            cause
        });

        this._className = className;
        this._errMessage = errMessage;
        this._cause = cause;
        this._securitySeverity = securitySeverity;
    }

    get className(): string {
        return this._className;
    }

    get errMessage(): string {
        return this._errMessage;
    }

    get cause(): any {
        return this._cause;
    }

    get securitySeverity(): LogLevel {
        return this._securitySeverity;
    }

    static is(err: any): err is NonGenericServerError {
        return err.hasOwnProperty('_marker') && err['_marker'] === 'NonGenericServerError';
    }

    // Formats the message to be sent to the client
    getClientMessage() {
        if (this._securitySeverity === LogLevel.INFO) {
            return `Server Error: ${this._errMessage}. Please contact support.`
        } else {
            return `Internal Server Error.`
        }
    }

    // Formats the message to be logged to the server
    getLogMessage() {
        return `[${LogLevelMappings[this.securitySeverity].toUpperCase()} SEVERITY] Error in ${this._className}: ${this._errMessage}`
    }
}

export class ReadOnlyError extends Error {
    private _marker: string = 'ReadOnlyError';

    constructor(errMessage: string) {
        super(errMessage);
    }

    static is(err: any): err is ReadOnlyError {
        return err.hasOwnProperty('_marker') && err['_marker'] === 'ReadOnlyError';
    }

    // Formats the message to be sent to the client
    getClientMessage() {
        return `This object is read only.`
    }
}

// For errors that we don't want to show to the user in case it exposes sensitive information like the fact that a user exists
export class HiddenError extends Error {
    private _marker: string = 'HiddenError';

    constructor(private _source: string, errMessage: string, private _clientMessage: string, private _severity: LogLevel = LogLevel.HIGH, cause?: any) {
        super(errMessage, cause);
    }

    static is(err: any): err is HiddenError {
        return err.hasOwnProperty('_marker') && err['_marker'] === 'HiddenError';
    }

    // Formats the message to be sent to the client
    getClientMessage() {
        return this._clientMessage
    }

    // Formats the message to be logged to the server
    getLogMessage() {
        return `[${LogLevelMappings[this._severity].toUpperCase()} SEVERITY] Error in ${this._source}: ${this.message}`
    }
}