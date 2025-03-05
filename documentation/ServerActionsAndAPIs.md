# Server Actions and API Routes

This document describes conventions for server actions and API routes in Altitude CRM.

## Server Actions

Server actions are functions that are called by the client and are used to perform actions on the server such as a database query or
a call to an external API with a protected API key.

I prefer to keep server actions in a dedicated file named `Actions.ts` in the folder of the page that they are used on
(or the folder of the client components that call them). This makes it easier to find and understand the server actions.

When defining a server action, I use the following conventions:

* The actual function definition is `_functionName` and is defined as `const _functionName = async (user: User, ...args: any[]) => {}`
* Then, I export the function as `export const functionName = API.serverAction(_functionName)`

The `user` argument is the user object, and the rest of the arguments are the arguments passed to the server action by the client.

This method makes it easy to track callback names when debugging as assigning to a variable rather than just a function name has
different minification behavior, so you can track the actual action name.

At the top of the file, I put the 'use server' directive.

An example of a server action file:
```ts
'use server';

import {API} from "~/util/api/ApiResponse";
import {User} from "~/db/sql/models/User";

const _getUser = async (user: User, guid: string) => {
    let userObj = await User.readUnique({
        where: {
            id: Buffer.from(guid, 'hex')
        },
        select: {
            firstName: true,
            lastName: true,
            email: true
        }
    });

    if (!userObj) {
        return API.error('User not found', 404);
    }

    return userObj.firstName + ' ' + userObj.lastName;
}

export const getUser = API.serverAction(_getUser);
```

## API Routes

API routes are function called with an HTTP request made in a client component. In most cases, a server action can be used instead,
but in the case of streaming data, webhooks, a REST API, or more complex route handlers (such as NextAuth's route handlers).

If it can be done as a server action it _SHOULD_ be done as a server action. Server actions are _typesafe_ and _easier to maintain_.

API routes are defined in the `route.ts` file in the folder that they are the route of.

When defining an API route, I use the following conventions:

* The actual function definition is _HTTP_METHODNAME, where HTTP_METHODNAME is the HTTP method used (e.g. GET, POST, PUT, DELETE, etc.)
* Then, I export the function as `export const HTTP_METHODNAME = API.route(_HTTP_METHODNAME)`

In general, I prefer to use POST requests rather than GET requests for API routes to reduce risk from CSRF attacks.

Example of an API route file:
```ts
import {API} from "~/util/api/ApiResponse";
import {User} from "~/db/sql/models/User";

const _POST = async (user: User) => {
    if (user.firstName === 'Joe') {
        return API.error('You are Joe', 403)
    } else {
        return API.success('You are not Joe!')
    }
}

export const POST = API.route(_POST)
```