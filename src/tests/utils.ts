import {expect} from "@jest/globals";
import {Model} from "~/db/sql/SQLBase";
import ModelSet from "~/util/db/ModelSet";
import {generateGuid} from "~/util/db/guid";

declare module 'expect' {
    interface Matchers<R> {
        toBeDirty(): R; // Checks if the object is dirty.
        // toBeSetAndUncommittedIn<T extends Model<T>>(expected: Model<T>): R; // Checks if the received key is set and uncommitted.
        // toBeRequiredIn<T extends Model<T>>(expected: Model<T>): R; // Checks if the received key is required.
        // toBeValidlyCreated(): R; // Checks if the object is validly created.
        toContainObject(expected: Model<any>): R; // Checks if the array contains the model instance (by guid).
        // toHaveSuccessfullyReadInstance(expected: Model<any>): R; // Checks if the array contains the model instance (by guid).
        toBeInstance(expected: Model<any>): R; // Checks if the received object is an instance of the expected object.
        // toHaveStatus(expected: number): R; // Checks if the response has the expected status.
        // toHaveMessage(expected: string): Promise<R>; // Checks if the response has the expected message.
    }
}

expect.extend({
    toBeDirty(received: Model<any>) {
        return {
            pass: received.dirty,
            message: () => this.isNot ? `Expected ${received.instanceString()} to be clean` : `Expected ${received.instanceString()} to be dirty`
        }
    },
    toContainObject(received: Array<Model<any>> | ModelSet<Model<any>>, expected: Model<any>) {
        return {
            pass: received.some((model: any) => model.guid.equals(expected.guid)),
            message: () => this.utils.matcherHint('toBeInstance', undefined, undefined, {
                    isNot: this.isNot,
                    promise: this.promise
                }) + '\n\n' +
                `Expected: ${this.utils.printExpected(expected.instanceString())} in array\nReceived: ${this.utils.printReceived(received.map((model) => model.instanceString()).join(', '))}`
        }
    },
    // toHaveSuccessfullyReadInstance(received: Array<Model<any>> | ModelSet<Model<any>>, expected: Model<any>) {
    //     let pass = false;
    //     if (Array.isArray(received)) {
    //         pass = received.length === 1 && received[0].guid.equals(expected.guid);
    //     } else if (ModelSet.isModelSet(received)) {
    //         pass = received.has(expected);
    //     } else {
    //         throw new Error('Received object is not an array or ModelSet');
    //     }
    //     return {
    //         pass: pass,
    //         message: () => this.utils.matcherHint('toBeInstance', undefined, undefined, {
    //                 isNot: this.isNot,
    //                 promise: this.promise
    //             }) + '\n\n' +
    //             `Expected: ${this.utils.printExpected(expected.instanceString())} in array\nReceived: ${this.utils.printReceived(received.map((model) => model.instanceString()).join(', '))}`
    //     }
    // },
    toBeInstance(received: Model<any>, expected: Model<any>) {
        if (received === undefined) {
            return {
                pass: false,
                message: () => this.utils.matcherHint('toBeInstance', undefined, undefined, {
                        isNot: this.isNot,
                        promise: this.promise
                    }) + '\n\n' +
                    `Expected: ${this.utils.printExpected(expected.instanceString())}\nReceived: ${this.utils.printReceived(undefined)}`
            }
        }
        return {
            pass: received.guid.equals(expected.guid),
            message: () => this.utils.matcherHint('toBeInstance', undefined, undefined, {
                    isNot: this.isNot,
                    promise: this.promise
                }) + '\n\n' +
                `Expected: ${this.utils.printExpected(expected.instanceString())}\nReceived: ${this.utils.printReceived(received.instanceString())}`
        }
    },
    // toHaveStatus(received: NextResponse<any>, expected: number) {
    //     const options = {
    //         isNot: this.isNot,
    //         promise: this.promise,
    //     };
    //
    //     return {
    //         pass: received.status === expected,
    //         message: () => this.utils.matcherHint('toHaveStatus', undefined, expected.toString(), options) + '\n\n' +
    //             `Expected: ${this.utils.printExpected(expected)}\nReceived: ${this.utils.printReceived(received.status)}`
    //     }
    // },
    // async toHaveMessage(received: NextResponse<any>, expected: string) {
    //     const options = {
    //         isNot: this.isNot,
    //         promise: this.promise,
    //     };
    //
    //     let data = await received.json();
    //     return {
    //         pass: data.message === expected,
    //         message: () => this.utils.matcherHint('toHaveMessage', undefined, expected, options) + '\n\n' +
    //             `Expected: ${this.utils.printExpected(expected)}\nReceived: ${this.utils.printReceived(data.message)}`
    //     }
    // }
})

export function randomName(prefix: string) {
    return prefix + generateGuid().toString('hex');
}

export function relativeDate(offset: number, hours = 0, minutes = 0) {
    const newDate = new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    newDate.setDate(newDate.getDate() + offset);
    return newDate;
}