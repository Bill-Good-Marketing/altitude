## Documents React Compiler Errors, their causes, and how to fix them

Note about errors themselves. I only recently figured out that the parentheses after the error message are important.

They indicate the starting and ending line numbers of the error. So `error error error (1:1)` means that the error is on line 1 of the file.

The compiler will also give you the file name.

### 1. Invalid hook call.

Looks something like this:
`Error: Invalid hook call. Hooks can only be called inside of the body of a function component.`

It then provides a few possible reasons for this error, but the React Compiler also causes such errors quite frequently.

Take this code in `MyComponent.tsx`:

```tsx
const MyComponent = () => {
    const [myValue, setMyValue] = React.useState(0);

    return (
        <div>
            <h1>My Component</h1>
            <p>My value is {myValue}</p>
            <button onClick={() => {
                setMyValue(prev => prev + 1);
            }}>Increment
            </button>
            <p>My helper function is {myHelperFunction('3')}</p>
        </div>
    );
}
```

And this code in `helper.ts`

```ts
export function myHelperFunction() {
    return parseInt(a);
}
```

This compiles to:

```js
function myHelperFunction() {
    const $ = _c(1);
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = parseInt(a);
        $[0] = t0;
    } else {
        t0 = $[0];
    }
    return t0;
}
```

It's rather curious why this compilation happens for something so simple and that probably doesn't need to be memoized.
From what I can tell, returning solely the value of `parseInt`, something like `isNan`, or another function call yields
some memoization. Maybe it's because the React Compiler can't determine a proper type so it's just memorizing to be safe
or something.

Anyways, this code is completely valid, but now take this code in `MyComponent.tsx`:

```tsx
const MyComponent = () => {
    const [myValue, setMyValue] = React.useState(0);

    return (
        <div>
            <h1>My Component</h1>
            <p>My value is {myValue}</p>
            <button onClick={() => {
                setMyValue(myHelperFunction());
            }}>Increment
            </button>
            <p>My helper function is {myHelperFunction()}</p>
        </div>
    );
}
```

This code is no longer valid (during runtime there will be this `Invalid Hook Call` error). Three reasons combine to
make this error:

1. The `myHelperFunction` is compiled using the React Compiler. I'm pretty sure it's because it's imported/defined in
   the component.
2. The React Compiler uses special _hooks_ to compile the code
3. React Hooks cannot be run inside a function call that ISN'T a function component or another hook.

So, the `onClick` handler of the button is not a hook or component, so you get an error.

#### Solution

The fix is quite quick. Just tell the React Compiler to ignore the function.

```ts
export function myHelperFunction() {
    'use no memo'; // Use no memo is a special directive to the React Compiler to ignore the function/file.
    return parseInt(a);
}
```

The new `use no memo` directive tells the React Compiler to ignore the function.

The [docs](https://react.dev/learn/react-compiler#something-is-not-working-after-compilation) warn that this should be a
_temporary_ escape hatch to opt-out components and hooks from compilation. But for these functions, it may be the only
solution since it seems the compiler is **very** eager to compile everything.

### 2. `InvalidReact: Ref values (the `current` property) may not be accessed during render.`

This one's an interesting one because the way I learned to use refs (especially those that refer to state) is **wrong**!

I learned that you define a ref like this:

```tsx
const [someState, setSomeState] = React.useState(0);

const someRef = React.useRef(null);
someRef.current = someState;
```

Since you're accessing (assigning) the current value of the ref inside the actual component render, you get this error.
You can also get the error by reading the ref value.

Building on the above code, this code is invalid:

```tsx
return (
    <div>
        <h1>My Component</h1>
        <p>{someRef.current}</p>
    </div>
)
```

I never used refs this way because I'd just use the state value directly. But this code also causes errors.

#### Solution

You essentially have to update the ref in a `useEffect` hook. I made a quick hook to wrap this up nicely:

```ts
import {useEffect, useRef} from "react";

export function useStateRef<T>(state: T) {
    const ref = useRef(state);

    useEffect(() => {
        ref.current = state;
    }, [state]);

    return ref;
}
```

Now you don't have to worry about setting the ref value with the new state value.

For example, this code is valid:

```tsx
const [someState, setSomeState] = React.useState(0);

const someRef = useStateRef(someState);

return (
    <div>
        <h1>My Component</h1>
        <p>{someRefState}</p>
    </div>
)
```

### 3. `ReactCompilerError: Todo: (BuildHIR::lowerExpression) Handle Import expressions`

From what I understand, this error is caused by dynamically importing a component. The React Compiler hasn't implemented
this yet so you really just have to use a `use no memo` directive

Invalid:

```tsx
const myImported = import('some-component');
```

Valid:

```tsx
const myImported = (() => {
    'use no memo';
    return import('some-component');
})()
```

You have to do some wrapping shenanigans to get it to work. Or you can stick the directive at the top of a _new_ file.

MyComponentsThatIgnoreTheCompiler.tsx:

```tsx
'use no memo';

export const SomeComponent = import('some-component');
```

If you happen to be using Next.js and you have to import a component and make it a dynamic import without SSR, you have
to do the following:

```tsx
import dynamic from 'next/dynamic';

export const SomeComponent = dynamic(() => {
    'use no memo';
    return import('some-component');
}, {ssr: false});
```

You may be like why in the world would you do this? If the component uses the `window` object where it being undefined
would break things, then this is what you have to do. You can't import the component directly because Next.js will throw
an error so you have to use import().

For whatever reason putting `use no memo` at the top of the file doesn't work (at least for the component I was using,
specifically the `react-force-graph-2d` component).

### 4. `Todo: (BuildHIR::node.lowerReorderableExpression) Expression type ` _`NewExpression`_ ` cannot be safely reordered`

You can't use a `new` expression for default props. This is particularly true for `Date` objects.

```tsx
const SomeDateThing = ({date = new Date()}: { date?: Date }) => {
    return <div>{date.toString()}</div>
}
```

This will throw that error. I'm not sure if the React Compiler will support this, but it's possible since it's marked as
a "Todo".

To fix this, you can do something like this:

```tsx
const SomeDateThing = ({date: initialDate}: { date?: Date }) => {
    const date = initialDate ?? new Date();

    return <div>{dateToUse.toString()}</div>
}
```

### 5. `ReactCompilerError: InvalidReact: This mutates a variable that React considers immutable`

I experienced this because I made dumb programming decisions. Basically, I have some code like this:

```tsx
const SomeComponentFunction = someCondition ? SomeFancyComponentWrapper(aValue) : SomeOtherComponent;

// ...

const SomeFancyComponentWrapper = (value: string) => {
    cosnt Component = ({children}: { children: React.ReactNode }) => {
        return <ThisOtherComponent value={value}>{children}</ThisOtherComponent>
    }
    
    Component.displayName = 'SomeFancyComponentWrapper'
    return Component
}
```

This code is invalid because the compiler expects `displayName` to never change. Thus removing that line setting the name
to `SomeFancyComponentWrapper` will fix the error.

Let's ignore the fact that this is a dumb decision and I should have just changed the props like this:

```tsx
const props: SomeComponentProps | SomeOtherComponentProps = {
    // ... base props
}

if (someCondition) {
    props.value = aValue
}

const SomeComponentFunction = someCondition ? ThisOtherComponent : SomeOtherComponent;

// ...
```

This is a much better solution and doesn't use dumb wrapper component-generating functions.

### 6. `ReactCompilerError: Todo: (BuildHIR::lowerExpression) Handle UpdateExpression to variables captured within lambdas.`

Using the ++ or -- operators in lambda functions are not supported yet. Use += or -= instead.

```tsx
const SomeComponentFunction = () => {
    let someVar = 0;
    
    const someFunction = () => {
        someVar++;
        return someVar;
    }
}
```

`someVar++` is errors. This also includes for loops...

### 7. `ReactCompilerError: Invariant: [hoisting] Expected value for identifier to be initialized. $14`

This is a funky one. When you have a variable outside of a function and then return an assignment of that variable in that function you get this error.

```tsx
let myVar = 0;

const someFunction = () => {
    if (myVar < 10) {
        return myVar = myVar + 1
    }
    return 10;
}
```

This only seems to happen when you return an assignment. If you change the variable with something like `myVar++` you get error `#8`.

Same fix as `#8`. Just use state instead

### 8. `ReactCompilerError: InvalidReact: Unexpected reassignment of a variable which was defined outside of the component. Components and hooks should be pure and side-effect free, but variable reassignment is a form of side-effect. If this variable is used in rendering, use useState instead.`

Straightforward. We all learned that you shouldn't reassign data outside a component because it makes components impure (i.e. Using the same inputs leads to different outputs).

Use state instead of mutating variables outside the scope of the component.

### 9. `ReactCompilerError: Todo: (BuildHIR::lowerExpression) Handle ??= operators in AssignmentExpression (236:236)`

Apparently, the React Compiler doesn't support the `??=` operator.