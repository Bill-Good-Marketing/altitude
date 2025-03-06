// Tests for jointable properties, join properties, and various join table configurations
// This includes compound keys, explicit IDs, and self-referential joins

import {describe, expect} from "@jest/globals";
import {TestObject} from "~/db/sql/models/TestObject";
import {JoinedObject1} from "~/db/sql/models/JoinedObject1";
import {JoinedObject2} from "~/db/sql/models/JoinedObject2";
import {SelfReferencialJoinModel} from "~/db/sql/models/SelfReferencialJoinModel";

describe('JoinTable Tests', () => {
    // TEST GROUP 1: Many-to-many with compound key (TestObject and JoinedObject1)
    describe('Many-to-many with compound key', () => {
        test('Creating and retrieving a join with compound key', async () => {
            // Create a test object and joined object
            const testObj = new TestObject(undefined, {
                required: 'Required'
            });
            
            const joinObj = new JoinedObject1(undefined, {
                persisted: 'Join Object 1'
            });
            
            // Commit them separately first
            await testObj.commit();
            await joinObj.commit();
            
            // Now establish the relationship
            testObj.join1 = [joinObj];
            joinObj.joinProperty = 'Join Property Value';
            
            await testObj.commit();
            
            // Retrieve the test object with joins
            const retrievedTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join1: true,
                }
            });
            
            // Verify the relationship
            expect(retrievedTest).toBeInstance(testObj);
            expect(retrievedTest?.join1).toHaveLength(1);
            expect(retrievedTest?.join1?.[0]).toBeInstance(joinObj);
            expect(retrievedTest?.join1?.[0].joinProperty).toBe('Join Property Value');
            
            // Verify from the other side
            const retrievedJoin = await JoinedObject1.readUnique({
                where: {
                    id: joinObj.guid
                },
                select: {
                    testObjects: true,
                }
            });
            
            expect(retrievedJoin).toBeInstance(joinObj);
            expect(retrievedJoin?.testObjects).toHaveLength(1);
            expect(retrievedJoin?.testObjects?.[0]).toBeInstance(testObj);
            expect(retrievedJoin?.testObjects?.[0].joinProperty1).toBe('Join Property Value');
        });
        
        test('Creating multiple joins with compound key', async () => {
            // Create test object
            const testObj = new TestObject(undefined, {
                required: 'Required for multiple joins'
            });
            
            // Create multiple join objects
            const joinObjs = [
                new JoinedObject1(undefined, { persisted: 'Join 1' }),
                new JoinedObject1(undefined, { persisted: 'Join 2' }),
                new JoinedObject1(undefined, { persisted: 'Join 3' })
            ];
            
            // Commit all objects
            await testObj.commit();
            for (const join of joinObjs) {
                await join.commit();
            }
            
            // Add all joins with the same join property
            testObj.join1 = joinObjs;
            joinObjs.forEach(obj => obj.joinProperty = 'Shared Property');
            
            await testObj.commit();
            
            // Verify all joins are established
            const retrievedTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join1: true
                }
            });
            
            expect(retrievedTest?.join1).toHaveLength(3);
            for (const join of joinObjs) {
                expect(retrievedTest?.join1).toContainObject(join);
            }
            
            // Check that all join objects have the property set
            for (const join of retrievedTest?.join1 || []) {
                expect(join.joinProperty).toBe('Shared Property');
            }
            
            // Verify from the join objects side
            for (const join of joinObjs) {
                const retrieved = await JoinedObject1.readUnique({
                    where: {
                        id: join.guid
                    },
                    select: {
                        testObjects: true
                    }
                });
                
                expect(retrieved?.testObjects).toHaveLength(1);
                expect(retrieved?.testObjects?.[0]).toBeInstance(testObj);
                
                // Check the join property on the TestObject in the join array
                for (const testObject of retrieved?.testObjects || []) {
                    expect(testObject.joinProperty1).toBe('Shared Property');
                }
            }
        });
        
        test('Updating join properties with compound key', async () => {
            // Create and establish the relationship
            const testObj = new TestObject(undefined, {
                required: 'Required for update test'
            });
            
            const joinObj = new JoinedObject1(undefined, {
                persisted: 'Join for update test'
            });
            
            await testObj.commit();
            await joinObj.commit();
            
            testObj.join1 = [joinObj];
            joinObj.joinProperty = 'Initial Value';
            
            await testObj.commit();
            
            // Update the join property
            joinObj.joinProperty = 'Updated Value';
            
            await testObj.commit();
            
            // Verify the update from both sides
            const retrievedTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join1: true
                }
            });
            
            expect(retrievedTest?.join1?.[0].joinProperty).toBe('Updated Value');
            
            const retrievedJoin = await JoinedObject1.readUnique({
                where: {
                    id: joinObj.guid
                },
                select: {
                    testObjects: true
                }
            });
            
            expect(retrievedJoin?.testObjects?.[0].joinProperty1).toBe('Updated Value');
        });
        
        test('Removing joins with compound key', async () => {
            // Create objects
            const testObj = new TestObject(undefined, {
                required: 'Required for removal test'
            });
            
            const joinObjs = [
                new JoinedObject1(undefined, { persisted: 'Join to keep', joinProperty: 'Join Property' }),
                new JoinedObject1(undefined, { persisted: 'Join to remove', joinProperty: 'Join Property' })
            ];
            
            // Add both joins
            testObj.join1 = joinObjs;

            await testObj.commit();
            
            // Remove one join
            testObj.join1 = [joinObjs[0]];
            
            await testObj.commit();
            
            // Verify only one join remains
            const retrievedTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join1: true
                }
            });
            
            expect(retrievedTest?.join1).toHaveLength(1);
            expect(retrievedTest?.join1?.[0]).toBeInstance(joinObjs[0]);
            
            // Verify the removed join no longer has the relationship
            const removedJoin = await JoinedObject1.readUnique({
                where: {
                    id: joinObjs[1].guid
                },
                select: {
                    testObjects: true
                }
            });
            
            expect(removedJoin?.testObjects).toHaveLength(0);
        });
    });
    
    // TEST GROUP 2: Many-to-many with explicit ID (TestObject and JoinedObject2)
    describe('Many-to-many with explicit ID', () => {
        test('Creating and retrieving a join with explicit ID', async () => {
            // Create a test object and joined object
            const testObj = new TestObject(undefined, {
                required: 'Required for explicit ID test'
            });
            
            const joinObj = new JoinedObject2(undefined, {
                persisted: 'Join Object with explicit ID'
            });
            
            // Commit them separately first
            await testObj.commit();
            await joinObj.commit();
            
            // Now establish the relationship
            testObj.join2 = [joinObj];
            joinObj.joinProperty = 'Join Property Value';
            
            await testObj.commit();
            
            // Retrieve the test object with joins
            const retrievedTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join2: true
                }
            });
            
            // Verify the relationship and ID property
            expect(retrievedTest).toBeInstance(testObj);
            expect(retrievedTest?.join2).toHaveLength(1);
            expect(retrievedTest?.join2?.[0]).toBeInstance(joinObj);
            expect(retrievedTest?.join2?.[0].joinProperty).toBe('Join Property Value');
            expect(retrievedTest?.join2?.[0].joinId).not.toBeUndefined(); // The ID should be assigned automatically
            
            // Verify from the other side
            const retrievedJoin = await JoinedObject2.readUnique({
                where: {
                    id: joinObj.guid
                },
                select: {
                    testObjects: true
                }
            });
            
            expect(retrievedJoin).toBeInstance(joinObj);
            expect(retrievedJoin?.testObjects).toHaveLength(1);
            expect(retrievedJoin?.testObjects?.[0]).toBeInstance(testObj);
            expect(retrievedJoin?.testObjects?.[0].joinProperty2).toBe('Join Property Value');
            expect(retrievedJoin?.testObjects?.[0].joinId).not.toBeUndefined(); // ID should be present
        });
        
        test('Creating multiple joins with explicit ID', async () => {
            // Create test object
            const testObj = new TestObject(undefined, {
                required: 'Required for multiple explicit ID joins'
            });
            
            // Create multiple join objects
            const joinObjs = [
                new JoinedObject2(undefined, { persisted: 'Join 1 with ID' }),
                new JoinedObject2(undefined, { persisted: 'Join 2 with ID' }),
                new JoinedObject2(undefined, { persisted: 'Join 3 with ID' })
            ];
            
            // Commit all objects
            await testObj.commit();
            for (const join of joinObjs) {
                await join.commit();
            }
            
            // Add all joins with the same join property
            testObj.join2 = joinObjs;
            joinObjs.forEach(obj => obj.joinProperty = 'Shared Property with ID');
            
            await testObj.commit();
            
            // Verify all joins are established
            const retrievedTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join2: true
                }
            });
            
            expect(retrievedTest?.join2).toHaveLength(3);
            for (const join of joinObjs) {
                expect(retrievedTest?.join2).toContainObject(join);
            }
            
            // Check all join objects have the property set
            for (const join of retrievedTest?.join2 || []) {
                expect(join.joinProperty).toBe('Shared Property with ID');
                expect(join.joinId).not.toBeUndefined();
            }
            
            // Verify IDs are assigned and different for each join
            const joinIds = new Set();
            for (const join of joinObjs) {
                const retrieved = await JoinedObject2.readUnique({
                    where: {
                        id: join.guid
                    },
                    select: {
                        testObjects: true
                    }
                });
                
                expect(retrieved?.testObjects?.[0].joinId).not.toBeUndefined();
                joinIds.add(retrieved?.testObjects?.[0].joinId?.toString());
                
                // Check each joint property
                expect(retrieved?.testObjects?.[0].joinProperty2).toBe('Shared Property with ID');
            }
            
            // Each join should have a unique ID
            expect(joinIds.size).toBe(joinObjs.length);
        });
        
        test('Updating join properties and preserving IDs', async () => {
            // Create and establish the relationship
            const testObj = new TestObject(undefined, {
                required: 'Required for ID preservation test'
            });
            
            const joinObj = new JoinedObject2(undefined, {
                persisted: 'Join for ID preservation test'
            });
            
            testObj.join2 = [joinObj];
            joinObj.joinProperty = 'Initial Value with ID';
            
            await testObj.commit();
            
            // Capture the assigned ID
            const initialTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join2: true
                }
            });
            
            const originalId = initialTest?.join2?.[0].joinId;
            expect(originalId).not.toBeUndefined();
            
            // Update the join property
            joinObj.joinProperty = 'Updated Value with ID';
            
            await testObj.commit();
            
            // Verify the update and check ID hasn't changed
            const retrievedTest = await TestObject.readUnique({
                where: {
                    id: testObj.guid
                },
                select: {
                    join2: true
                }
            });
            
            expect(retrievedTest?.join2?.[0].joinProperty).toBe('Updated Value with ID');
            expect(retrievedTest?.join2?.[0].joinId).toEqual(originalId); // ID should remain the same
            
            const retrievedJoin = await JoinedObject2.readUnique({
                where: {
                    id: joinObj.guid
                },
                select: {
                    testObjects: true
                }
            });
            
            expect(retrievedJoin?.testObjects?.[0].joinProperty2).toBe('Updated Value with ID');
            expect(retrievedJoin?.testObjects?.[0].joinId).toEqual(originalId);
        });
    });
    
    // TEST GROUP 3: Self-referential joins with explicit ID
    describe('Self-referential joins', () => {
        test('Creating and retrieving self-referential joins', async () => {
            // Create source and target objects
            const source = new SelfReferencialJoinModel();
            const target = new SelfReferencialJoinModel();
            
            await source.commit();
            await target.commit();

            // Establish relationship
            source.joinsAsSource = [target];
            source.joinsAsSource[0].joinProperty = 'Self-referential join property';
            
            await source.commit();
            
            // Verify relationship from source side
            const retrievedSource = await SelfReferencialJoinModel.readUnique({
                where: {
                    id: source.guid
                },
                select: {
                    joinsAsSource: true
                }
            });
            
            expect(retrievedSource?.joinsAsSource).toHaveLength(1);
            expect(retrievedSource?.joinsAsSource?.[0]).toBeInstance(target);
            expect(retrievedSource?.joinsAsSource?.[0].joinProperty).toBe('Self-referential join property');
            expect(retrievedSource?.joinsAsSource?.[0].joinId).not.toBeUndefined();
            
            // Verify relationship from target side
            const retrievedTarget = await SelfReferencialJoinModel.readUnique({
                where: {
                    id: target.guid
                },
                select: {
                    joinsAsTarget: true
                }
            });
            
            expect(retrievedTarget?.joinsAsTarget).toHaveLength(1);
            expect(retrievedTarget?.joinsAsTarget?.[0]).toBeInstance(source);
            expect(retrievedTarget?.joinsAsTarget?.[0].joinProperty).toBe('Self-referential join property');
            expect(retrievedTarget?.joinsAsTarget?.[0].joinId).not.toBeUndefined();
        });
        
        test('Creating bidirectional self-referential joins', async () => {
            // Create two objects that will reference each other
            const object1 = new SelfReferencialJoinModel();
            const object2 = new SelfReferencialJoinModel();
            
            // Establish bidirectional relationship
            object1.joinsAsSource = [object2];
            object1.joinsAsSource[0].joinProperty = 'Object1 to Object2';
            
            await object1.commit();

            object2.joinsAsSource = [object1];
            object2.joinsAsSource[0].joinProperty = 'Object2 to Object1';

            await object2.commit();

            // Verify both directions
            const retrieved1 = await SelfReferencialJoinModel.readUnique({
                where: {
                    id: object1.guid
                },
                select: {
                    joinsAsSource: true,
                    joinsAsTarget: true
                }
            });
            
            expect(retrieved1?.joinsAsSource).toHaveLength(1);
            expect(retrieved1?.joinsAsSource?.[0]).toBeInstance(object2);
            expect(retrieved1?.joinsAsSource?.[0].joinProperty).toBe('Object1 to Object2');
            expect(retrieved1?.joinsAsTarget).toHaveLength(1);
            expect(retrieved1?.joinsAsTarget?.[0]).toBeInstance(object2);
            expect(retrieved1?.joinsAsTarget?.[0].joinProperty).toBe('Object2 to Object1');
            
            const retrieved2 = await SelfReferencialJoinModel.readUnique({
                where: {
                    id: object2.guid
                },
                select: {
                    joinsAsSource: true,
                    joinsAsTarget: true
                }
            });
            
            expect(retrieved2?.joinsAsSource).toHaveLength(1);
            expect(retrieved2?.joinsAsSource?.[0]).toBeInstance(object1);
            expect(retrieved2?.joinsAsSource?.[0].joinProperty).toBe('Object2 to Object1');
            expect(retrieved2?.joinsAsTarget).toHaveLength(1);
            expect(retrieved2?.joinsAsTarget?.[0]).toBeInstance(object1);
            expect(retrieved2?.joinsAsTarget?.[0].joinProperty).toBe('Object1 to Object2');
        });
        
        test('Creating complex self-referential network', async () => {
            // Create multiple objects for a network
            const objects = [
                new SelfReferencialJoinModel(),
                new SelfReferencialJoinModel(),
                new SelfReferencialJoinModel(),
                new SelfReferencialJoinModel()
            ];
            
            // Commit all objects
            for (const obj of objects) {
                await obj.commit();
            }

            // Create a network: 0 -> 1 -> 2 -> 3 -> 0 (cycle)
            for (let i = 0; i < objects.length; i++) {
                const source = objects[i];
                const target = objects[(i + 1) % objects.length];
                
                source.joinsAsSource = [target];
                source.joinsAsSource[0].joinProperty = `Connection ${i} to ${(i + 1) % objects.length}`;
                
                await source.commit();
            }
            
            // Verify each connection
            for (let i = 0; i < objects.length; i++) {
                const source = objects[i];
                const target = objects[(i + 1) % objects.length];
                
                const retrieved = await SelfReferencialJoinModel.readUnique({
                    where: {
                        id: source.guid
                    },
                    select: {
                        joinsAsSource: true,
                        joinsAsTarget: true
                    }
                });
                
                // Should have one outgoing connection
                expect(retrieved?.joinsAsSource).toHaveLength(1);
                expect(retrieved?.joinsAsSource?.[0]).toBeInstance(target);
                expect(retrieved?.joinsAsSource?.[0].joinProperty).toBe(`Connection ${i} to ${(i + 1) % objects.length}`);
                
                // Should have one incoming connection
                expect(retrieved?.joinsAsTarget).toHaveLength(1);
                expect(retrieved?.joinsAsTarget?.[0]).toBeInstance(objects[(i - 1 + objects.length) % objects.length]);
                
                // Verify incoming connection property
                const prevIndex = (i - 1 + objects.length) % objects.length;
                expect(retrieved?.joinsAsTarget?.[0].joinProperty).toBe(`Connection ${prevIndex} to ${i}`);
            }
        });
    });
});