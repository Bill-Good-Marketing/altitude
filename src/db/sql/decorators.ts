import {EncryptionDType} from "~/util/db/datamanagement";
import {ProgrammingError, UnsupportedOperationError} from "~/common/errors";
import {Model} from "~/db/sql/SQLBase";
import {ModelKeys} from "~/db/sql/keys";
import {IModel} from "~/db/sql/types/model";
import {HookFunction, HookType, HookWhen} from "~/db/sql/types/hooks";

export const _persistedProperties: { [key: string]: Set<string> } = {}
export const hooks: {
    [key: string]: {
        // If this is false, the updates will be rolled back
        // Encryption is done before this hook is called
        update: {
            before: HookFunction<'update', 'before'>[],
            after: HookFunction<'update', 'after'>[]
        },
        // If this is true, the object will be committed to the database after the create hooks are run
        create: {
            before: HookFunction<'create', 'before'>[],
            after: HookFunction<'create', 'after'>[]
        },
        delete: {
            before: HookFunction<'delete', 'before'>[],
            after: HookFunction<'delete', 'after'>[]
        },
        read: {
            /**
             * Runs before the object is read from the database
             * and the where clause is encrypted.
             */
            before: HookFunction<'read', 'before'>[],

            /**
             * Runs after the object is read from the database,
             * gives the properties read and the object.
             *
             * Also called after an object has been loaded using the load method.
             */
            after: HookFunction<'read', 'after'>[]
        },
    }
} = {}
export const _onload: { [key: string]: { [key: string]: ((value?: Model<any> | Model<any>[]) => Promise<void>) } } = {};
export const _requiredProperties: { [key: string]: Set<string> } = {};
export const _wrappers: {
    [key: string]: {
        [key: string]: {
            model: IModel<any> | ModelKeys,
            idProperty: string,
            reverseProperty: string,
            isRelationRoot: boolean,
            isArray: boolean
        }
    }
} = {};
export const _idsToWrapped: { [key: string]: { [idProperty: string]: string } } = {}; // Class: {idProperty: wrappedProperty}

export const _jointables: {
    [key: string]: {
        [key: string]: {
            model: ModelKeys,
            joinField: string,
            intermediateOtherIdProperty: string,
            intermediateThisIdProperty: string,
            intermediateId: true | string
        }
    }
} = {};
export const _jointablesReverse: {
    [model: string]: { [reverseField: string]: string } // Class: {joinField: originalJoinField}
} = {};
export const _joinedFields: {
    [model: string]: {
        [joinProperty: string]: {
            // On the intermediate model
            targetedProperty: string,
            // Reverse join field
            joinField: string[] | string,
            model: ModelKeys
        }
    }
} = {}; // Class: {joinField: properties}
export const _reverseJoinedFields: {
    [model: string]: {
        // Fields may have same name, so we need to ensure that the target model is also included
        [targetModel: string]: {
            // Reverse join field
            [joinField: string]: {
                // Property on intermediate model
                [targetProperty: string]: string // Property on target/wrapped model
            }
        }
    }
} = {}

export const _relationships: { [key: string]: { [key: string]: [ModelKeys, string] } } = {}; // Class: {property: [type, relationshipName]}
export const _graphProperties: { [key: string]: Set<string> } = {}; // Class: {properties}
export const _reverseGraphProps: { [key: string]: { [key: string]: string } } = {}; // Class: {relationshipName: property}

// Mapping of dependency name to list of properties that depend on it, used to invalidate cache
export const _calculatedPropertyDependencies: { [key: string]: { [dependency: string]: string[] } } = {}

export const _calculatedAttributes: {
    [key: string]: {
        [key: string]: {
            dependencies: string[],
            func: (...args: any[]) => any,
            options: {
                update?: (object: Model<any>, arg: any) => void,
                cache?: boolean
            }
        }
    }
} = {}

export const _encryptedProperties: { [key: string]: { [key: string]: EncryptionDType } } = {};
export const _uniqueEncryptedProperties: { [key: string]: { [key: string]: EncryptionDType } } = {};
// Fields that are persisted, but computed from other fields.
// Updating a dependent field will update the computed field.
export const _computedAttributes: {
    [key: string]: {
        [key: string]: {
            dependencies: string[],
            func: (...args: any[]) => any,
            update?: (object: Model<any>, arg: any) => void,
        }
    }
} = {}
// Mapping of dependency name to list of properties that depend on it, used to update computed fields
export const _computedPropertyDependencies: { [key: string]: { [dependency: string]: string[] } } = {}

export const _defaults: { [key: string]: { [key: string]: any } } = {};

export function Default(value: any) {
    return function (target: any, propertyKey: string) {
        const _target: Model<any> = target;

        if (_defaults[_target.className()] === undefined) {
            _defaults[_target.className()] = {};
        }
        _defaults[_target.className()][propertyKey] = value;
    }
}

// Computed properties cannot be "set" directly as they depend on other properties.
// Setting a computed property will update the other properties (via the update function).
export function computed(dependencies: string[], func: (object: Model<any>, ...args: any[]) => any, update?: (object: Model<any>, arg: any) => void) {
    return function (target: object, propertyKey: string) {
        const _target: Model<any> = target as Model<any>;

        _updateGetSetFunctionality(_target, propertyKey);

        if (_computedAttributes[_target.className()] === undefined) {
            _computedAttributes[_target.className()] = {};
        }

        if (_computedPropertyDependencies[_target.className()] === undefined) {
            _computedPropertyDependencies[_target.className()] = {};
        }

        _computedAttributes[_target.className()][propertyKey] = {
            dependencies,
            func,
            update
        };

        for (const dependency of dependencies) {
            if (!(dependency in _computedPropertyDependencies[_target.className()])) {
                _computedPropertyDependencies[_target.className()][dependency] = [];
            }
            _computedPropertyDependencies[_target.className()][dependency].push(propertyKey);
        }
    }
}

function _updateGetSetFunctionality(target: Model<any>, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
        set: function (val: any) {
            const _obj: Model<any> = this;
            _obj.set(propertyKey, val);
        },
        get: function () {
            const _obj: Model<any> = this;
            return _obj.get(propertyKey);
        }
    });
}

/**
 * Property decorator to indicate that a property should be persisted to the database.
 */
export function persisted(target: any, propertyKey: string) {
    const _target: Model<any> = target;

    if (_persistedProperties[_target.className()] === undefined) {
        _persistedProperties[_target.className()] = new Set();
    }
    _persistedProperties[_target.className()].add(propertyKey);
    _updateGetSetFunctionality(target, propertyKey);
}

/**
 * Property decorator to indicate that a property is required to be set before the object can be persisted.
 */

export function required(target: any, propertyKey: string) {
    const _target: Model<any> = target;

    if (_requiredProperties[_target.className()] === undefined) {
        _requiredProperties[_target.className()] = new Set();
    }
    if (_persistedProperties[_target.className()] === undefined) {
        _persistedProperties[_target.className()] = new Set();
    }
    _persistedProperties[_target.className()].add(propertyKey);
    _requiredProperties[_target.className()].add(propertyKey);

    _updateGetSetFunctionality(target, propertyKey);
}

/**
 * Specifies that when a property is loaded, it should be wrapped in a wrapper class.
 * @param constructor The constructor for the wrapper class.
 * @param reverseProperty The property on the opposite side of the relationship. This is used to conform with prisma creation rules for relationships.
 * @param idProperty The property that should be set to the id of the wrapped object. If this is not the relation root, then it is the reverse property's `idProperty`.
 * @param isRelationRoot Whether the column is the root of the relationship, i.e. is this the wrapped column that is directly related to the foreign key column.
 *
 * Specifically, it's the column with the full `@relation` decorator. Such as `@relation(fields: [a, b], references: [c])` and such.
 */
export function wrap(constructor: ModelKeys, reverseProperty: string, idProperty: string, isRelationRoot: boolean, isArray: boolean) {
    return function (target: object, propertyKey: string) {
        const _target: Model<any> = target as Model<any>;
        if (_wrappers[_target.className()] === undefined) {
            _wrappers[_target.className()] = {};
        }
        _wrappers[_target.className()][propertyKey] = {
            model: constructor,
            idProperty: idProperty,
            reverseProperty: reverseProperty,
            isRelationRoot: isRelationRoot,
            isArray: isArray
        };

        if (isRelationRoot) {
            _idsToWrapped[_target.className()] ??= {};
            _idsToWrapped[_target.className()][idProperty] = propertyKey;
        }

        Object.defineProperty(target, propertyKey, {
            get: function () {
                const _obj: Model<any> = this;
                return _obj.get(propertyKey);
            },
            set: function (val: any) {
                const _obj: Model<any> = this;
                _obj.set(propertyKey, val);
            }
        })
    }
}

/**
 * Property decorator to indicate that a property should be a jointable.
 * This means that queries will be performed on the target model rather than the intermediate model.
 *
 * @example
 * ```prisma
 * model A {
 *     id Bytes
 *
 *     /// @jointable(B, bRelation)
 *     b ABJoin[]
 * }
 *
 * model B {
 *     id Bytes
 *     name String
 *
 *     /// @jointable(A, aRelation)
 *     a ABJoin[]
 * }
 *
 * model ABJoin {
 *     aId Bytes
 *     bId Bytes
 *     aRelation AB
 *     bRelation B
 *
 *     @@id([aId, bId])
 * }
 * ```
 *
 * When running
 * ```typescript
 * A.read({ attributes: ['b'], where: { b: {
 *     some: {
 *         name: { contains: 'foo' }
 *     }
 * }}})
 *```
 *
 * ```typescript
 * prisma.a.findMany({ include: {
 *     b: {
 *         select: {
 *             bRelation: true
 *         }
 *     },
 *     where: {
 *         b: {
 *             some: {
 *                 bRelation: {
 *                     name: {
 *                         contains: 'foo'
 *                     }
 *                 }
 *             }
 *         }
 *     }
 * }})
 * ```
 * will be run.
 *
 * During result processing, the sub-relation (bRelation) of the intermediate model (ABJoin) is used to populate the field of the target model.
 *
 * So,
 * ```typescript
 * A.read({ attributes: ['b'], where: { b: {
 *     some: {
 *         name: { contains: 'foo' }
 *     }
 * }}})
 * ```
 * results in:
 *
 * ```typescript
 * A {
 *     b: [
 *         B {
 *             name: 'foo'
 *         }
 *     ]
 * }
 * ```
 *
 * @param targetModel The target model of the jointable
 * @param joinField The field of the intermediate model that should be used to populate the field of the target model
 * @param thisForeignKey The id key on the intermediate model that points to the id of the current model
 * @param otherForeignKey The id key on the intermediate model that points to the id on the target model
 * @param id If true, the intermediate model has an explicit id field. Otherwise, this is the name of the composite key.
 * @param reverseJoinField The field on the opposite side of the jointable that points to this model. This is used for joined fields using the `@join` decorator and for preventing circular data/infinite recursion.
 */
export function jointable(targetModel: ModelKeys, joinField: string, thisForeignKey: string, otherForeignKey: string, id: true | string, reverseJoinField: string) {
    return function (target: object, propertyKey: string) {
        const _target: Model<any> = target as Model<any>;
        _jointables[_target.className()] ??= {};

        _jointables[_target.className()][propertyKey] = {
            model: targetModel,
            joinField,
            intermediateOtherIdProperty: otherForeignKey,
            intermediateThisIdProperty: thisForeignKey,
            intermediateId: id
        };

        _jointablesReverse[_target.className()] ??= {};
        _jointablesReverse[_target.className()][reverseJoinField] = propertyKey;

        Object.defineProperty(target, propertyKey, {
            get: function () {
                const _obj: Model<any> = this;
                return _obj.get(propertyKey);
            },
            set: function (val: any) {
                const _obj: Model<any> = this;
                _obj.set(propertyKey, val);
            }
        })
    }
}

/**
 * @param joinedProperty The name of the property in the intermediate model
 * @param reverseJoinField The field in the OTHER model that points to this model (through the intermediate model)
 * @param model The actual class name of the other model
 *
 * Property decorator to incorporate data from an intermediate model into the wrapped model. This is essentially a way to extend the data on one model when querying a many-to-many relationship.
 *
 * @example
 * Let's say you have a contact model and an activity model. If you have a join field in contact, you must specify the reverse join field (i.e. the field that points to the contact model from the activity model).
 * ```ts
 * class Contact {
 *      @join('contact', 'contactRelation', 'activity')
 *      joinedProperty: string
 * }
 * ```
 *
 * @example
 * Full example:
 *
 * ```prisma
 * model A {
 *     id Bytes @id
 *
 *     // Specify the reverse relationship in the jointable decorator
 *     /// @jointable(B, bRelation, aRelation)
 *     /// @join(myProperty, propertyFromABJoin)
 *     b ABJoin[]
 * }
 *
 * model B {
 *     id Bytes @id
 *
 *     /// @jointable(A, aRelation)
 *     a ABJoin[]
 * }
 *
 * model ABJoin {
 *     /// @@wrapper-ignore
 *     aId       Bytes
 *     bId       Bytes
 *     aRelation AB
 *     bRelation B
 *
 *     myProperty String
 *
 *     /// @@id([aId, bId])
 *     @@id([aId, bId])
 * }
 * ```
 *
 * This produces the following:
 *
 * ```ts
 * // A.ts
 * export class A extends Model<A> {
 *     @jointable('b', 'bRelation', 'aRelation')
 *     b: B[];
 *     @join('myProperty', 'aRelation', 'b')
 *     propertyFromABJoin: string;
 * }
 *
 * // B.ts
 * // ...
 * ```
 *
 * This means that you can do the following:
 * ```ts
 * B.read({
 *      select: {
 *          a: {
 *              select: {
 *                  propertyFromABJoin: true
 *              }
 *          }
 *      }
 * })
 * ```
 *
 * This results in instances of `B`, where each `A` instance in `B.a` has the `propertyFromABJoin` set to the value of `myProperty` in the intermediate `ABJoin` instance.
 *
 * This is not valid however:
 *
 * ```ts
 * A.read({
 *      select: {
 *          b: {
 *              select: {
 *                  propertyFromABJoin: true
 *              }
 *          }
 *       }
 * })
 * ```
 *
 * Since the `B` model doesn't bind `ABJoin.myhProperty` you cannot read it. If it were joined, however, you would get a list of `A` instances, where each `A` instance in `A.b` has the `propertyFromABJoin` set to the value of `myProperty` in the intermediate `ABJoin` instance.
 *
 * Additionally, this is not valid:
 * ```ts
 * A.read({
 *      select: {
 *          propertyFromABJoin: true
 *      }
 * })
 * ```
 *
 * Because the `A` model doesn't have a `propertyFromABJoin` property, you cannot read it.
 *
 * @summary
 * Essentially, `@join` allows you to load data from an intermediate model into the main wrapped model when reading it AS A MANY-TO-MANY relationship not by itself.
 *
 * @see jointable
 */
export function join(joinedProperty: string, reverseJoinField: string | string[], model: ModelKeys) {
    return function (target: object, propertyKey: string) {
        const _target: Model<any> = target as Model<any>;
        if (_joinedFields[_target.className()] === undefined) {
            _joinedFields[_target.className()] = {};
        }
        _joinedFields[_target.className()][propertyKey] = {
            targetedProperty: joinedProperty,
            joinField: reverseJoinField,
            model
        };

        _reverseJoinedFields[_target.className()] ??= {};
        _reverseJoinedFields[_target.className()][model] ??= {};
        if (Array.isArray(reverseJoinField)) {
            for (const field of reverseJoinField) {
                _reverseJoinedFields[_target.className()][model][field] ??= {};
                _reverseJoinedFields[_target.className()][model][field][joinedProperty] = propertyKey;
            }
        } else {
            _reverseJoinedFields[_target.className()][model][reverseJoinField] ??= {};
            _reverseJoinedFields[_target.className()][model][reverseJoinField][joinedProperty] = propertyKey;
        }

        Object.defineProperty(target, propertyKey, {
            get: function () {
                const _obj: Model<any> = this;
                return _obj.get(propertyKey);
            },
            set: function (val: any) {
                const _obj: Model<any> = this;
                _obj.set(propertyKey, val);
            }
        })
    }
}

// export function graphProp(target: object, propertyKey: string) {
//     const _target: Model<any> = target as Model<any>;
//     if (_graphProperties[_target.className()] === undefined) {
//         _graphProperties[_target.className()] = new Set();
//     }
//     _graphProperties[_target.className()].add(propertyKey);
// }

/**
 * Handles graph relationships between objects. Since the majority of data is stored in a SQL database,
 * ids must be used to reference objects in the Neo4J database. This decorator allows for the creation of
 * relationships between objects in the Neo4J database. (And the associated graph version of the SQL database, found in ~/db/neo4j/ongdb.ts)
 * @param type The target type of the relationship, used for type checking.
 * @param name The name of the relationship, used for querying the graph database.
 */
// export function relationship(type: ModelKeys, name: string) {
//     return function (target: object, propertyKey: string) {
//         const _target: Model<any> = target as Model<any>;
//         Object.defineProperty(target, propertyKey, {
//             get: function () {
//                 const _obj: Model<any> = this;
//                 if (_obj.isLoaded(propertyKey)) {
//                     return _obj.get(propertyKey);
//                 }
//                 throw new UnsupportedOperationError(`Attempted to access graph relationship ${propertyKey} without previously loading, please use asyncGet or get the relationship instead`);
//             },
//             set: function (val: any) {
//                 const _obj: Model<any> = this;
//                 Reflect.set(_obj, `~${propertyKey}`, val);
//
//                 // @ts-expect-error - Accessing protected property when I shouldn't, but I kinda have to :/
//                 _obj._loadedProperties.add(propertyKey);
//             }
//         })
//
//         if (_relationships[_target.className()] === undefined) {
//             _relationships[_target.className()] = {};
//         }
//         _relationships[_target.className()][propertyKey] = [type, name];
//
//         if (_reverseGraphProps[_target.className()] === undefined) {
//             _reverseGraphProps[_target.className()] = {};
//         }
//         _reverseGraphProps[_target.className()][name] = propertyKey;
//     }
// }

/**
 * Property decorator to indicate that a property should be calculated from other properties.
 * @param dependencies The properties that this property depends on.
 * @param func The function to calculate the property.
 * @param options Options for the calculated property. Update is called when the property is set, and cache indicates whether the property should be cached.
 */
export function calculated(dependencies: string[], func: (object: Model<any>, ...args: any[]) => any, options: {
    update?: (object: Model<any>, arg: any) => void,
    cache?: boolean
}) {
    return function (target: object, propertyKey: string) {
        const _target: Model<any> = target as Model<any>;
        // Update parameter get functions
        Object.defineProperty(target, propertyKey, {
            get: function () {
                const _obj: Model<any> = this;

                if (options.cache && propertyKey in _obj._cache) {
                    return _obj._cache[propertyKey];
                }

                const unloadedDependency: string[] = [];
                const args = dependencies.map((dependency) => {
                    if (!_obj.isLoaded(dependency)) {
                        unloadedDependency.push(dependency)
                    }
                    return _obj.get(dependency);
                });

                if (unloadedDependency.length > 0) {
                    throw new UnsupportedOperationError(`Attempted to access calculated property ${propertyKey} with unloaded dependencies (${unloadedDependency}), please use asyncGet instead`);
                }

                const val = func(_obj, ...args);
                if (options.cache) {
                    _obj._cache[propertyKey] = val;
                }
                return val;
            },

            // Update parameter set functions
            set: function (val: any) {
                if (options.update) {
                    options.update(this, val);
                }
                if (options.cache) {
                    this._cache[propertyKey] = val;
                }
            }
        });

        if (_calculatedPropertyDependencies[_target.className()] === undefined) {
            _calculatedPropertyDependencies[_target.className()] = {};
        }

        if (_calculatedAttributes[_target.className()] === undefined) {
            _calculatedAttributes[_target.className()] = {};
        }

        _calculatedAttributes[_target.className()][propertyKey] = {
            dependencies: dependencies,
            func: func,
            options: options
        };

        for (const dependency of dependencies) {
            if (!(dependency in _calculatedPropertyDependencies[_target.className()])) {
                _calculatedPropertyDependencies[_target.className()][dependency] = [];
            }
            _calculatedPropertyDependencies[_target.className()][dependency].push(propertyKey);
        }
    }
}

/**
 * Method decorator to indicate that a method should be called when an event is fired (before/after).
 *
 * @param event The event to hook into.
 * @param when When the method should be called (before/after).
 *
 * @update This event is fired when the object is updated. It is passed with the property changed, the old value, and the new value.
 * @create This event is fired when the object is created.
 * @delete This event is fired when the object is deleted.
 * @read This event is fired when the object is read from the database. It is passed with the property(ies) read.
 * If it is after, it is also passed with the new object. If it is before, the where clause is passed.
 */
export function on<T extends HookType, W extends HookWhen, Func extends HookFunction<T, W>>(event: T, when: W) {
    return function (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<Func>) {
        const _target: Model<any> = target as Model<any>;

        if (hooks[_target.className()] === undefined) {
            hooks[_target.className()] = {
                update: {
                    before: [],
                    after: []
                },
                create: {
                    before: [],
                    after: []
                },
                delete: {
                    before: [],
                    after: []
                },
                read: {
                    before: [],
                    after: []
                },
            };
        }
        if (descriptor.value == null) {
            throw new ProgrammingError(`Hook ${event} ${when} is null for ${_target.className()} is null`);
        }
        (hooks[_target.className()][event][when] as HookFunction<T, W>[]).push(descriptor.value);
        return descriptor;
    }
}

/**
 * Method decorator to indicate that a method should be called when the object is loaded.
 * @param properties The properties that should trigger the method to be called.
 */
export function onload(...properties: string[]) {
    return function (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
        const _target: Model<any> = target as Model<any>;

        if (_onload[_target.className()] === undefined) {
            _onload[_target.className()] = {};
        }
        for (const property of properties) {
            _onload[_target.className()][property] = descriptor.value;
        }
        return descriptor;
    }
}

export function propOverride(target: object, propertyKey: string) {
    const _target: Model<any> = target as Model<any>;
    _updateGetSetFunctionality(_target, propertyKey);
}

/**
 * Property decorator to indicate that a property should be encrypted when stored in the database.
 * @param dtype The type of the data to encrypt.
 */
export function encrypted(dtype: EncryptionDType = 'string') {
    return function (target: any, propertyKey: string) {
        const _target: Model<any> = target;

        if (_encryptedProperties[_target.className()] === undefined) {
            _encryptedProperties[_target.className()] = {};
        }
        _encryptedProperties[_target.className()][propertyKey] = dtype;
    }
}

/**
 * Property decorator to indicate that a property should be encrypted uniquely when stored in the database.
 * This is accomplished by appending the object's guid to the property before encrypting. (Separated by a null byte)
 * @param dtype The type of the data to encrypt.
 */
export function uniqueEncrypted(dtype: EncryptionDType = 'string') {
    return function (target: any, propertyKey: string) {
        const _target: Model<any> = target;

        if (_uniqueEncryptedProperties[_target.className()] === undefined) {
            _uniqueEncryptedProperties[_target.className()] = {};
        }
        _uniqueEncryptedProperties[_target.className()][propertyKey] = dtype;
    }
}