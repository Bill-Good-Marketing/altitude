# Authentication APIs in Altitude CRM

This document describes the authentication APIs in Altitude CRM.

## Authentication Backend

Under the hood, Altitude CRM uses [NextAuth.js](https://next-auth.js.org/) to handle authentication. 
I have built a custom abstraction layer on top of it to automatically match a JWT token to a user object, 
without querying the database.

Tokens are automatically validated and checked against database sessions in case data needs to be updated or a 
session has become invalid.

## Authentication API

The most fundamental function is [`getAuthSession`](../src/util/api/ApiResponse.ts), which returns the user object if the token is valid, `refresh` if data needs 
to be updated, and `null` if the token is invalid.

It uses the session cookies to get the JWT token, decrypts it, and then validates it against the database 
(assuming the cache has expired).

```tsx
import {User} from '~/db/sql/models/User'
import {getAuthSession} from '~/util/auth/AuthUtils'
import {redirect} from 'next/navigation'

export default async function MyPage() {
    const user: User | null | 'refresh' = await getAuthSession()
    if (user == null) {
        return 'Please authenticate'
    } else if (user === 'refresh') {
        return redirect('/token-refresh')
    }
    return <div>Hello {user.fullName}</div>
}
```

On top of this function, there are these essential functions:

### [`withAuthentication(Component, requiredRoles?: AccessGroup[], hidden?: boolean)`](../src/util/auth/AuthComponentUtils.tsx)
This wraps a page component and automatically authenticates and redirects as necessary.

It also passes the user object to the wrapped component as a prop. The `params` and `searchParams` props are also passed.
Since auth is handled by the `withAuthentication`, the passed `requester` prop is always the user object.

```tsx
import {withAuthentication} from '~/util/auth/AuthComponentUtils'

function MyAuthenticatedPage({requester}: {requester: User}) {
    return <div>Hello {requester.fullName}</div>
}

export default withAuthentication(MyAuthenticatedPage)
```

`withAuthentication` also has a few other parameters:

* `requiredRoles`: If specified, the user must have at least one of the specified roles to access the page.
* `hidden`: If true, the page will return a 404 if the user does not have the required roles. 
It will also log the user attempting to access the page.

`withAdminAuthentication` is a special version of `withAuthentication` that requires the user to have the `ADMIN` 
or `SYSADMIN` roles and makes a page `hidden`.

### [`apiRouteWrapper(callback, requiredRoles?: AccessGroup[], hidden?: boolean)`](../src/util/auth/AuthUtils.ts)
This is a wrapper for API routes. It automatically authenticates the user, handles logging errors, and returns a 
NextResponse object (as a promise).

It passes the user object as the first argument to the callback function, and then the NextRequest and NextResponse
objects as the second and third arguments, respectively.

I rarely use this function by itself, but rather use the `route` method from the [`API`](../src/util/api/ApiResponse.ts) class
in `~/util/api/ApiResponse.ts`

I do this because it's more convenient and the [`API`](../src/util/api/ApiResponse.ts) class has some extra methods for returning quick responses and errors.

```ts
import {API} from '~/util/api/ApiResponse'
import {User} from '~/db/sql/models/User'

const _POST = async (user: User) => {
    if (user.firstName === 'Joe') {
        return API.error('You are Joe', 403)
    } else {
        return API.success('You are not Joe!')
    }
}

export const POST = API.route(_POST)
```

The purpose/functionality of the `requiredRoles` and `hidden` parameters is the same as the `withAuthentication` function.

There is also the `API.admin` function which is a special version of `API.route` that requires the user to have 
the `ADMIN` or `SYSADMIN` roles.

### [`serverActionWrapper(callback, requiredRoles?: AccessGroup[], hidden?: boolean, ignoreArgs?: boolean)`](../src/util/auth/AuthUtils.ts)
This is a wrapper for server actions. It automatically authenticates the user, handles logging errors, and returns a 
promise of any type that a normal server action returns.

It passes the user object as the first argument to the callback function, and then any arguments passed to the server
action as the rest of the arguments.

I rarely use this function by itself, but rather use the `adminAction` or `serverAction` methods from the [`API`](../src/util/api/ApiResponse.ts) class
in `~/util/api/ApiResponse.ts` for the same reasons as above.

```ts
'use server';

import {API} from '~/util/api/ApiResponse'
import {User} from '~/db/sql/models/User'

const _getUser = async (user: User, message: string) => {
    if (user.firstName === 'Joe') {
        return API.toast('You are Joe', 'error', 403)
    } else {
        return API.success(`You are not Joe! The message is ${message}`, 'success', 200)
    }
}
```

The purpose/functionality of the `requiredRoles` and `hidden` parameters is the same as the `withAuthentication` function.

The `ignoreArgs` parameter is used to prevent from logging arguments passed to the server action in case there is an error.
I have used this when the server action uses very large objects as arguments, and I don't want to log the entire object.

There is also the `API.adminAction` function which is a special version of `API.serverAction` that requires the user to have 
the `ADMIN` or `SYSADMIN` roles.

### Other aspects of the [`API`](../src/util/api/ApiResponse.ts) class

* `API.error(message, status)`: Returns a NextResponse object with the specified message and error status.
* `API.success(message, status)`: Returns a NextResponse object with the specified message and success status.
* `API.response(data, message?, status?)`: Returns a NextResponse object with the specified data, message, and status.
* `API.toast(message, type, status)`: Returns a ToastResponse object for a server action with the specified message, type, and status.
THe status is technically useless, but I like to include it for consistency and to keep track of what type of response it is.
* `API.isToast(response)`: Returns true if the response is a ToastResponse object.
* `API.readOnly()`: Returns a NextResponse object with a message saying the user is in a read-only state 
(i.e. when an admin is viewing as another user).
* `API.readOnlyToast()`: Server action equivalent of `API.readOnly()`.
* `API.isAuthenticated()`: Returns a boolean indicating whether the user is authenticated.

Toasts are handled by the [`handleServerAction`](../src/util/api/client/APIClient.ts) function in `~/util/api/client/APIClient.ts` and automatically displays
toast messages in the UI when the response is a ToastResponse object. Otherwise, it returns the data in the `result` property.