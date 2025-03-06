// Basic CRUD tests, create, read, update, delete
// No complex hook usage, join tables/fields, etc.

import {describe, expect, test} from "@jest/globals";
import {TestObject} from "~/db/sql/models/TestObject";

describe('CRUD Sanity Tests', () => {
    test('Creating new objects and reading them', async () => {
        const obj = new TestObject(undefined, {})

        await expect(obj.commit()).rejects.toThrowError('Invalid test object, required property required is not set');

        obj.required = 'Required'

        await obj.commit()

        const obj2 = await TestObject.readUnique({
            where: {
                id: obj.guid
            }
        })

        expect(obj2).toBeInstance(obj)
    })

    test('Updating objects', async () => {
        const obj = new TestObject(undefined, {
            required: 'Required'
        })

        await obj.commit()

        obj.required = 'Updated'

        await obj.commit()

        const obj2 = await TestObject.readUnique({
            where: {
                id: obj.guid
            },
            select: {
                required: true
            }
        })

        expect(obj2).toBeInstance(obj)
        expect(obj2?.required).toBe('Updated')
    })

    test('Deleting objects', async () => {
        const obj = new TestObject(undefined, {
            required: 'Required'
        })

        await obj.commit()

        const obj2 = await TestObject.readUnique({
            where: {
                id: obj.guid
            }
        })

        expect(obj2).toBeInstance(obj)

        await obj.delete()

        const obj3 = await TestObject.readUnique({
            where: {
                id: obj.guid
            }
        })

        expect(obj3).toBeNull()
    })
});
