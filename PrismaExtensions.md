# Prisma Schema Extensions

I wrote out a parser for Prisma schema file that integrates it with my wrapper system. This documents the extra syntax
you can use to automatically apply functionality to properties in wrapped models.

All of these are optional, and you can use any combination of them, with a few exceptions (mainly `@uniqueEncrypted` and
`@encrypted`).

## Model-level properties

These are indicated by a `/// @@` and apply to a whole model or enum.

### `@@ai-enabled`

This is a boolean property that indicates whether the model should be exposed to the AI. **Applies to models only.**

### `@@ai-disabled`

This is a boolean property that indicates whether the enum should not be exposed to the AI. **Applies to enums only.**

All enums are provided to the AI by default.

### `@@ai-enum-description(description)`

This is a string property that describes the enum= for the AI.

### `@@wrapper-ignore`

This is a boolean property that indicates whether the model should be ignored by the wrapper system. Useful for join
tables.

### `@@server`

This is a boolean property that indicates whether an enum should be server-side only. They are not exposed to the AI.

### `@@soft-delete`

This is a boolean property that indicates that the model should be soft-deletable.
Data will not be deleted from the database, but will only be hidden from the client.

These models require a `deleted` non-null boolean column (defaulting to false) and a `deletedAt` nullable datetime column.

## Column-level properties

These are indicated by a `/// @` and apply to a single column.

### `@ai-field(description?)`

This is a string or boolean property that exposes the property to the AI and optionally describes it.

### `@wrapper-ignore`

This is a boolean property that indicates that the property should be ignored by the wrapper system.

### `@encrypted`

This is a boolean property that indicates that the property should be encrypted.

### `@uniqueEncrypted`

This is a boolean property that indicates that the property should be uniquely encrypted. This changes the encryption IV
for the property using the GUID of the object.
This makes it so that people cannot guess what the value of the property is by seeing patterns in the encrypted data.

### `@jointable(targetModel, joinField)`

This is high-level syntax for joining two models together through an intermediate model. The join field is the field in
the intermediate model that links the two models together.

Example:

```prisma
model A {
  id Bytes @id

  /// @jointable(B, bRelation)
  b ABJoin[]
}

model B {
  id Bytes @id

  /// @jointable(A, aRelation)
  a ABJoin[]
}

model ABJoin {
  aId       Bytes
  bId       Bytes
  aRelation AB
  bRelation B

  @@id([aId, bId])
}
```

### `@join(joinObjectProperty, targetProperty)`

This is high-level syntax for including a property from an intermediate model in the wrapped model.

If the targeted field is also an AI field (EVEN IF IT IS IGNORED IN THE WRAPPER USING `@wrapper-ignore` or `@@wraper-ignore`), then the resulting joined field
will be exposed to the AI.

Example:

```prisma
model A {
  /// @@ai-enabled
  id Bytes @id

  /// @jointable(B, bRelation)
  /// @join(property, myABProperty)
  b ABJoin[]
}

model B {
  id Bytes @id

  /// @jointable(A, aRelation)
  a ABJoin[]
}

model ABJoin {
  /// @@wrapper-ignore
  aId       Bytes
  bId       Bytes
  aRelation AB
  bRelation B

  /// @ai-field(This is a description)
  property String

  @@id([aId, bId])
}
```

This outputs the following:

```ts
// A.ts
export class A extends Model<A> {
    @jointable('b', 'bRelation')
    b: B[];

    @join('property', 'bRelation', 'b')
    @ai.property('string', 'This is a description', false, false)
    myABProperty: string;
}
```

**Important:** If the field that this decorator is applied to is NOT a jointable, the this will error. `@join` applies to the jointable that it is applied to.

```prisma
model A {
  id Bytes @id

  /// @jointable(B, bRelation)
  b ABJoin[]

  /// @join(property, myProperty)
  myProperty: string /////////// INVALID 

  /// @join(property, myOtherProperty)
  /// @jointable(C, cRelation)
  c: ACJoin[] ////////// INVALID ACJoin does not have a property called `property`
}

model B {
  id Bytes @id

  /// @jointable(A, aRelation)
  a ABJoin[]
}

model C {
  id Bytes @id

  /// @jointable(A, aRelation)
  a ACJoin[]
}

model ABJoin {
  /// @@wrapper-ignore
  aId       Bytes
  bId       Bytes
  aRelation AB
  bRelation B

  property String

  @@id([aId, bId])
}

model ACJoin {
  /// @@wrapper-ignore
  aId       Bytes
  cId       Bytes
  aRelation AC
  cRelation C

  @@id([aId, cId])
}
```

Might seem a bit obvious, but I'm just being extra explicit here.

### `@joinid(targetProperty)`

This is high-level syntax for indicating that a join table has a unique ID that the
wrapper system should automatically generate.

The `targetProperty` is the name of the property in the target model that is the ID of the intermediate model.

`@joinid` is technically just an abstraction over `@join` and merely indicates that and ID must be generated as well.

This property assumes that the id is named `id`. If for whatever reason, you don't name the id as `id`, then change it to `id`.