// Sanity tests for wrapped models/arrays
// This includes updating, deleting, and creating those wrapped models as part of the main object

import {describe, expect, test} from "@jest/globals";
import {TestObject} from "~/db/sql/models/TestObject";
import {WrappedObject} from "~/db/sql/models/WrappedObject";

describe('Wrapper Sanity Tests', () => {
    test('Creating objects with wrapped models', async () => {
        const obj = new TestObject(undefined, {
            required: 'Required',
            wrapped: [
                new WrappedObject(undefined, {})
            ]
        })

        await obj.commit()

        const obj2 = await TestObject.readUnique({
            where: {
                id: obj.guid
            },
            select: {
                wrapped: true,
            }
        })

        expect(obj2).toBeInstance(obj)
        expect(obj2?.wrapped).toHaveLength(1)
        expect(obj2?.wrapped[0]).toBeInstance(obj.wrapped![0])

        const wrapped = new WrappedObject(undefined, {
            testObject: new TestObject(undefined, {
                required: 'Required'
            })
        })

        await wrapped.commit()

        const wrapped2 = await WrappedObject.readUnique({
            where: {
                id: wrapped.guid
            },
            select: {
                testObject: true
            }
        })

        expect(wrapped2).toBeInstance(wrapped)
        expect(wrapped2?.testObject).toBeInstance(wrapped.testObject!)
    })

    test('Updating objects with wrapped models', async () => {
        const _wrapped = new WrappedObject(undefined, {})

        const obj = new TestObject(undefined, {
            required: 'Required',
            wrapped: [_wrapped]
        })

        await obj.commit()
        expect(_wrapped.isNew()).toBe(false)
        obj.wrapped![0].persisted = 'Persisted'
        expect(_wrapped.persisted).toBe('Persisted')
        await obj.commit()

        const obj2 = await TestObject.readUnique({
            where: {
                id: obj.guid
            },
            select: {
                wrapped: true,
            }
        })

        expect(obj2).toBeInstance(obj)
        expect(obj2?.wrapped).toHaveLength(1)
        expect(obj2?.wrapped[0]).toBeInstance(_wrapped)
        expect(obj2?.wrapped[0].persisted).toBe('Persisted')

        const testObj = new TestObject(undefined, {
            required: 'Required'
        })

        await testObj.commit()

        const wrapped = new WrappedObject(undefined, {
            testObject: testObj
        })

        testObj.persisted = 'Persisted'

        // Cannot update a wrapped object when CREATING the parent object
        await wrapped.commit()

        // So testObj.persisted shouldn't be updated
        expect(testObj).toBeDirty()
        expect(testObj.isDirty('persisted')).toBe(true)

        // Now that wrapped is committed, however, we can commit again and testObj.persisted should be updated
        await wrapped.commit()

        expect(testObj).not.toBeDirty()
        expect(testObj.isDirty('persisted')).toBe(false)

        const read = await WrappedObject.readUnique({
            where: {
                id: wrapped.guid
            },
            select: {
                testObject: true
            }
        })

        expect(read).toBeInstance(wrapped)
        expect(read?.testObject).toBeInstance(wrapped.testObject!)
        expect(read?.testObject?.persisted).toBe('Persisted')

        // Finally, we'll update the wrapped object and testObj at the same time
        wrapped.persisted = 'Persisted 1'
        testObj.persisted = 'Persisted 2'

        await wrapped.commit()

        const read2 = await WrappedObject.readUnique({
            where: {
                id: wrapped.guid
            },
            select: {
                persisted: true,
                testObject: true
            }
        })

        expect(read2).toBeInstance(wrapped)
        expect(read2?.persisted).toBe('Persisted 1')
        expect(read2?.testObject?.persisted).toBe('Persisted 2')
    })

    test('Adding and removing wrapped models', async () => {
        const testObj = new TestObject(undefined, {
            required: 'Required',
            wrapped: [
                new WrappedObject(undefined, {persisted: '1'})
            ]
        })

        await testObj.commit()

        const wrapped = testObj.wrapped![0]

        testObj.wrapped!.pop()
        testObj.wrapped!.push(new WrappedObject(undefined, {persisted: '2'}))

        const newWrapped = testObj.wrapped![0]

        await testObj.commit()

        expect(wrapped.isDeleted()).toBe(true)
        expect(newWrapped.isDeleted()).toBe(false)
        expect(newWrapped.isNew()). toBe(false)

        const read = await TestObject.readUnique({
            where: {
                id: testObj.guid
            },
            select: {
                wrapped: true
            }
        })

        expect(read).toBeInstance(testObj)
        expect(read?.wrapped).toHaveLength(1)
        expect(read?.wrapped[0]).toBeInstance(newWrapped)
        expect(read?.wrapped[0].persisted).toBe('2')
    })

    test('Multiple wrapped objects in array', async () => {
        const testObj = new TestObject(undefined, {
            required: 'Required',
            wrapped: [
                new WrappedObject(undefined, {persisted: 'first'}),
                new WrappedObject(undefined, {persisted: 'second'}),
                new WrappedObject(undefined, {persisted: 'third'})
            ]
        })

        await testObj.commit()

        // Verify all objects are created
        expect(testObj.wrapped).toHaveLength(3)
        testObj.wrapped!.forEach(wrapped => {
            expect(wrapped.isNew()).toBe(false)
        })

        const read = await TestObject.readUnique({
            where: {
                id: testObj.guid
            },
            select: {
                wrapped: true
            }
        })

        expect(read?.wrapped).toHaveLength(3)
        expect(read?.wrapped![0].persisted).toBe('first')
        expect(read?.wrapped![1].persisted).toBe('second')
        expect(read?.wrapped![2].persisted).toBe('third')

        // Update middle element
        testObj.wrapped![1].persisted = 'updated second'
        await testObj.commit()

        const readAfterUpdate = await TestObject.readUnique({
            where: {
                id: testObj.guid
            },
            select: {
                wrapped: true
            }
        })

        expect(readAfterUpdate?.wrapped).toHaveLength(3)
        expect(readAfterUpdate?.wrapped!.find(w => w.guid.equals(testObj.wrapped![1].guid))?.persisted).toBe('updated second')
    })

    test('Handling complex nested relationships', async () => {
        // Create a parent object with wrapped objects
        const testObj = new TestObject(undefined, {
            required: 'Parent',
            wrapped: [
                new WrappedObject(undefined, {persisted: 'Child 1'}),
                new WrappedObject(undefined, {persisted: 'Child 2'})
            ]
        })

        await testObj.commit()

        // Create another wrapped object that references the parent object
        const circularWrapped = new WrappedObject(undefined, {
            persisted: 'Circular Reference',
            testObject: testObj
        })

        await circularWrapped.commit()

        // Add the circular reference to the parent's wrapped array
        testObj.wrapped!.push(circularWrapped)
        await testObj.commit()

        // Fetch and verify the circular relationship
        const fetchedParent = await TestObject.readUnique({
            where: {
                id: testObj.guid
            },
            select: {
                wrapped: true
            }
        })

        expect(fetchedParent?.wrapped).toHaveLength(3)

        // Get the third wrapped object which should be our circular reference
        const circular = fetchedParent?.wrapped![2]
        expect(circular?.persisted).toBe('Circular Reference')

        // Now fetch the circular reference and verify it points back to parent
        const fetchedCircular = await WrappedObject.readUnique({
            where: {
                id: circular!.guid
            },
            select: {
                testObject: true
            }
        })

        expect(fetchedCircular?.testObject).toBeInstance(testObj)
    })

    test('Deleting wrapped objects cascade', async () => {
        // Create a parent with multiple wrapped objects
        const testObj = new TestObject(undefined, {
            required: 'Parent for deletion test',
            wrapped: [
                new WrappedObject(undefined, {persisted: 'To be deleted 1'}),
                new WrappedObject(undefined, {persisted: 'To be deleted 2'})
            ]
        })

        await testObj.commit()

        // Get IDs before deletion
        const wrappedIds = testObj.wrapped!.map(w => w.guid)

        // Delete parent
        await testObj.delete()

        // Verify parent is deleted
        const fetchedParent = await TestObject.readUnique({
            where: {
                id: testObj.guid
            }
        })

        expect(fetchedParent).toBeNull()

        // Verify wrapped objects are also deleted (or marked deleted)
        for (const id of wrappedIds) {
            const fetchedWrapped = await WrappedObject.readUnique({
                where: {
                    id
                }
            })

            expect(fetchedWrapped).toBeNull()
        }
    })

    test('Batch updating wrapped objects', async () => {
        // Create parent with multiple wrapped objects
        const testObj = new TestObject(undefined, {
            required: 'Batch update parent',
            wrapped: [
                new WrappedObject(undefined, {persisted: 'Batch 1'}),
                new WrappedObject(undefined, {persisted: 'Batch 2'}),
                new WrappedObject(undefined, {persisted: 'Batch 3'})
            ]
        })

        await testObj.commit()

        // Update all wrapped objects with a common prefix
        const prefix = 'Updated-'
        testObj.wrapped!.forEach((wrapped, index) => {
            wrapped.persisted = `${prefix}${index}`
        })

        await testObj.commit()

        // Verify all updates were applied
        const fetchedObj = await TestObject.readUnique({
            where: {
                id: testObj.guid
            },
            select: {
                wrapped: true
            }
        })

        expect(fetchedObj?.wrapped).toHaveLength(3)
        fetchedObj?.wrapped!.forEach((wrapped, index) => {
            expect(wrapped.persisted).toBe(`${prefix}${index}`)
        })
    })
})