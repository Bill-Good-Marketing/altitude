# Database Wrapper System Documentation

The Database Wrapper System is a core architectural component of the Converse CRM platform that provides a powerful Object-Relational Mapping (ORM) abstraction. It extends [Prisma](https://www.prisma.io/) with additional features like dirty tracking, validation, relationships, hooks, and encryption.

## Table of Contents

1. [Model Creation](#model-creation)
2. [Property Types](#property-types)
3. [Using Models](#using-models)
   - [Reading Data](#reading-data)
   - [Creating Data](#creating-data)
   - [Updating Data](#updating-data)
   - [Deleting Data](#deleting-data)
4. [Hooks System](#hooks-system)
5. [Special Methods](#special-methods)
6. [Change Tracking](#change-tracking)
7. [Validation](#validation)
8. [Transactions](#transactions)
9. [Best Practices](#best-practices)

## Model Creation

Models are automatically generated based on the Prisma schema. The generator uses annotations in the schema to create TypeScript classes with appropriate decorators. For detailed information on schema annotations, see the [Prisma extension documentation](/PrismaExtensions.md).

### Basic Model Definition Process

1. Define your model in the Prisma schema (`prisma/schema.prisma`)
2. Add annotations using `///` comments to define special behaviors
3. Run the model generator: `npx tsx generateModels.ts`
4. The generator creates TypeScript model classes in `src/db/sql/models/`

### Model Class Structure

Each generated model extends the base `Model<T>` class:

```typescript
export class Contact extends Model<Contact> {
    // Properties with decorators
    @ai.property('string', null, false, true)
    @persisted declare public firstName?: string | null;
    
    @ai.property('string', null, false, false)
    @required declare public lastName?: string;
    
    // Wrapped properties, relationships, etc.
}
```

Models can be further customized by adding methods, hooks, or computed properties.

## Property Types

The wrapper system supports several property types:

### 1. Regular Properties

Regular properties are simple scalar values (string, number, boolean, etc.) directly stored in the database.

```typescript
@persisted declare public firstName?: string | null;
@required declare public lastName?: string;
```

Decorators for regular properties:
- `@persisted`: Marks a property that is persisted to the database
- `@required`: Marks a property as required (cannot be null)
- `@Default(value)`: Sets a default value

### 2. Wrapped Properties

Wrapped properties represent relationships between models. There are two main types:

#### a. Single Wrapped Object (One-to-One or Many-to-One)

```typescript
// Child to parent relationship
@wrap('tenet', 'contacts', 'tenetId', true, false) declare public tenet?: Tenet;
@required declare public tenetId?: Buffer;
```

The `@wrap` decorator has the following parameters:
- Target model name
- Property in target model that contains this model
- Foreign key property name
- Whether it's the root of a relationship (i.e. the model also stores an ID/foreign key)
- Whether it's an array of models

#### b. Array of Wrapped Objects (One-to-Many)

```typescript
// Parent to children relationship
@wrap('note', 'contact', 'contactId', false, true) declare public notes?: Note[];
```

### 3. Join Table Relationships (Many-to-Many)

Join tables handle many-to-many relationships between models.

```typescript
@jointable('activity', 'activityRelation', 'contactId', 'activityId', 'activityId_contactId')
declare public activities?: Activity[];
```

#### Join ids

If a join table has a specific ID field (must be named `id`), you can specify it with the `@joinid` decorator
in the schema.

This will add another property to the model that is the ID of the intermediate model and is accessible like
any other joined property. (See next section for more info)

The `@jointable` decorator parameters:
- Target model
- Join object property
- This model's id field in intermediate model
- Target model's id field in intermediate model
- Composite key fields

### 4. Joined Properties

Joined properties allow accessing fields from an intermediate join table:

```typescript
@join('property', 'activityRelation', 'activity')
declare public activityProperty?: string;
```

The `@join` decorator parameters:
- Source property in join model
- Join field reference
- Associated model

Specifying a joined property on a model directly will commit that property to the intermediate model when committed AS LONG AS THAT MODEL IS WITHIN A JOIN TABLE FIELD.

For example:

```typescript

const timelineEvent = new ContactTimelineEvent(undefined, {
    eventType: ContactTimelineEventType.MEMBER_ADDED,
    userId: user.guid,
    tenetId: user.tenetId,
    relationshipType: type,
});

const contact = new Contact(undefined, {
    firstName: 'John',
    lastName: 'Doe',
    tenetId: tenetId,
});

contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.MEMBER_CONTACT;
await contact.commit(); // This will error because prisma doesn't know what to do with `contactTimelineRelationshipType`

// This will NOT error
timelineEvent.contacts = [contact]; // `contact` is now in the `contacts` join table so the joined property can be committed.
await timelineEvent.commit();
```

This also applies to reading data:

```typescript
const contacts = await Contact.read({
    where: {
        tenetId: tenetId
    },
    select: {
        firstName: true,
        lastName: true,
       // INVALID: The actual Contact model doesn't have a `contactTimelineRelationshipType` field
        contactTimelineRelationshipType: true
    },
    limit: 10,
    offset: 0
});


// This will NOT error
const timelineEvents = await ContactTimelineEvent.read({
    where: {
        tenetId: tenetId
    },
    select: {
        contacts: {
            select: {
                // `contactTimelineRelationshipType` is in the intermediate table, 
                // so when reading from the join, you can also pull the joined property
                contactTimelineRelationshipType: true
            }
        }
    },
    limit: 10,
    offset: 0
}); // `contactTimelineRelationshipType` will be accessible under `timelineEvents.contacts[index].contactTimelineRelationshipType`
```

#### Special note on self-referencing jointables
When a model references itself through a jointable, joined properties should be applied to both "joins" and have
the **same** name so that the properties can properly be de-duplicated.

Something like this:

```prisma
model SelfReferencing {
   id Bytes @id
   
   /// @jointable(SelfReferencing, target)
   /// @join(persisted, joinProperty)
   /// @joinid(joinId)
   joinsAsSource JoinSelfReferencing[] @relation(name: "source")
   
   /// @jointable(SelfReferencing, source)
   /// @join(persisted, joinProperty)
   /// @joinid(joinId)
   joinsAsTarget JoinSelfReferencing[] @relation(name: "target")
}

model JoinSelfReferencing {
   /// @wrapper-ignore - no need to include intermediate models
   id Bytes @id
   
   sourceId Bytes
   source SelfReferencing @relation(name: "source", fields: [sourceId], references: [id])
   
   targetId Bytes
   target SelfReferencing @relation(name: "target", fields: [targetId], references: [id])
}
```

### 5. Computed Properties

Computed properties are calculated based on other properties and then stored in the database:

```typescript
@computed(['firstName', 'lastName'], (obj, firstName, lastName) => {
    if (firstName === '' || firstName == null) {
        return lastName;
    }
    return `${firstName} ${lastName}`
}, (obj, fullName: string) => {
    // Setter implementation
})
declare public fullName?: string;
```

### 6. Calculated Properties

Similar to computed properties, but are not stored in the database:

```typescript
@calculated(['type'], (obj, type) => {
    return type === AccessGroup.ADMIN;
}, {})
declare public isAdmin?: boolean;
```

## Using Models

### Reading Data

There are several methods for reading data:

#### Read a Single Model by ID

```typescript
const contact = await Contact.readUnique({
    where: {
        id: contactId
    },
    select: {
        firstName: true,
        lastName: true,
        emails: true
    }
});
```

OR

```typescript
const contact = await Contact.getById(contactId, { fullName: true });
```

#### Read Multiple Models

```typescript
const contacts = await Contact.read({
    where: {
        tenetId: tenetId
    },
    select: {
        firstName: true,
        lastName: true
    },
    limit: 10,
    offset: 0
});
```

#### Read with Complex Conditions

```typescript
const contacts = await Contact.read({
    where: {
        OR: [
            { firstName: { contains: searchTerm } },
            { lastName: { contains: searchTerm } }
        ]
    },
    orderBy: {
        lastName: 'asc'
    },
    take: 10
});
```

### Creating Data

#### Creating a New Model

You simply create a new model instance and when you're done setting properties, call `commit()` which
will automatically determine that the model is new and create it in the database.

```typescript
const contact = new Contact(undefined, {
    firstName: 'John',
    lastName: 'Doe',
    tenetId: tenetId,
    emails: [
        new ContactEmail(undefined, {
            email: 'john.doe@example.com',
            isPrimary: true
        })
    ]
});

await contact.commit();
```

#### Creating with Nested Relationships

Relationships are automatically handled by the wrapper system.

```typescript
const tenet = new Tenet(undefined, {
    name: 'Acme Corp',
    contacts: [
        new Contact(undefined, {
            firstName: 'John',
            lastName: 'Doe'
        })
    ]
});

await tenet.commit();
```

### Updating Data

Updating data is similar to creating data because you can simply update properties and call `commit()`.

#### Simple Property Update

```typescript
contact.firstName = 'Jane';
await contact.commit();
```

#### Adding to a Related Collection

```typescript
contact.emails.push(new ContactEmail(undefined, {
    email: 'jane.work@example.com',
    isPrimary: false
}));

await contact.commit();
```

#### Updating Nested Models

```typescript
contact.emails[0].isPrimary = false;
contact.emails[1].isPrimary = true;
await contact.commit();
```

### Deleting Data

#### Deleting a Model

```typescript
await contact.delete();
```

For soft-deletable models (marked with `@soft-delete`), this performs a soft delete. To force a hard delete:

```typescript
await contact.delete(true); // Force hard delete
```

#### Deleting Related Models

When deleting a model, related models can be automatically deleted depending on the relationship configuration. For example, deleting a parent can cascade delete all its children.

## Hooks System

Hooks provide a way to execute code at specific points in a model's lifecycle.

### Available Hook Types

- `create`: Before/after creating a new model
- `update`: Before/after updating an existing model
- `delete`: Before/after deleting a model
- `read`: Before/after reading a model

### Defining Hooks

```typescript
@on('update', 'before')
public async updatePassword(property: string, value: string, old: string, isBatch: boolean) {
    if (property === 'password') {
        this.password = hashPassword(value);
        this._dirty['password'] = encryptData(this.password);
    }
    return true;
}

@on('create', 'before')
public async createHashedPassword() {
    if (this.password) {
        this.password = hashPassword(this.password);
        this._dirty['password'] = encryptData(this.password);
    }
}
```

Hooks can:
- Modify data before it's saved
- Validate changes
- Perform additional operations
- Cancel the operation by returning `false`

## Special Methods

### `prepareDirty()`

This method is called before saving changes to prepare the model's dirty data. It's useful for performing final adjustments before committing and runs before update/create hooks:

```typescript
protected prepareDirty() {
    if (this.isNew()) {
        // Setup relationships or defaults for new objects
        this.relationAsSource ??= [];
        
        switch (this.type) {
            case ContactType.INDIVIDUAL:
                // Setup relationships for individuals
                break;
        }
    }
}
```

I've used this when handling relationship data.

### `validate()`

The `validate()` method is called before saving to verify that the model is valid:

```typescript
public async validate() {
    if (this.isDirty('email') && this.email != null) {
        if (isEmptyString(this.email)) {
            return {
                result: false,
                msg: 'Invalid {0}, contact email is required'
            }
        } else if (!validateEmail(this.email)) {
            return {
                result: false,
                msg: 'Invalid {0}, contact email is invalid'
            }
        }
    }
    return super.validate();
}
```

### Status Check Methods

- `isNew()`: Returns `true` if the model hasn't been saved to the database
- `isDeleted()`: Returns `true` if the model has been deleted
- `isDirty(property?)`: Checks if the model or a specific property has changes

## Change Tracking

The wrapper system automatically tracks changes to models using the `_dirty` property and `isDirty()` method.

### How Change Tracking Works

1. Initial model state is recorded
2. Property changes are tracked in the `_dirty` object
3. Related model changes are tracked in the `_dirtySubModels` set
4. Change propagation happens through mutation listeners

### Checking for Changes

```typescript
if (contact.isDirty()) {
    console.log('Contact has changes');
}

if (contact.isDirty('firstName')) {
    console.log('First name has changed');
}
```

### Dirty Property Reset

When `commit()` is called, the dirty tracking is reset after saving changes.

## Validation

Validation happens automatically before saving changes. You can also manually validate:

```typescript
const validationResult = await contact.validate();
if (!validationResult.result) {
    console.error(validationResult.msg);
}
```

## Transactions

For operations that need to be atomic, use transactions:

```typescript
import {PerformInTransaction} from "~/db/sql/transaction";

const result = await PerformInTransaction(async (trx) => {
    const contact = new Contact(undefined, { /* ... */});
    await contact.commit(false, trx);

    const activity = new Activity(undefined, { /* ... */});
    await activity.commit(false, trx);

    return {contact, activity};
});
```

The transaction will automatically roll back if any operation fails.

## Best Practices

1. **Leverage the Type System**
   The wrapper system is fully typed, making it safe to use with TypeScript.

2. **Avoid Direct Database Queries**
   When possible, use the wrapper system rather than direct Prisma queries unless you're aggregating data or quickly manipulating join tables.

4. **Use Batch Operations for Performance**
   When updating many related models, use batch operations rather than individual commits. This extends to hooks which can return a Prisma promise which will automatically run as a batched transaction.

5. **Test with Transactions**
   Use the `transactionedTest` helper for tests to ensure database state is always clean.

6. **Understand Change Propagation**
   Changes to related models propagate upwards. Understand this flow when designing complex relationships.

For additional information, see the [Prisma extension documentation](/PrismaExtensions.md) and examine existing model implementations in the codebase.