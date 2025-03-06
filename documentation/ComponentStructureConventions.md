# Component Structure Conventions

This document describes conventions for organizing and building pages in Altitude CRM.

## Delineating Client and Server Components

Next.js forces you to have the server-rendered page in a `page.tsx` file and the client components in a file with the 
`use client` directive at the top.

I prefer to either have all the client components in a folder named `client` or `components` or in a file named `client.tsx`. 
I really don't care as long as I can quickly determine what stuff is a server component and what is a client component. I try to keep
all the server components in the `page.tsx` file, but you don't have to keep to this if the file gets really big.

All and all, conventions for components are more loose. What you MUST do is make sure that the main page component is authenticated

```tsx
import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import {User} from "~/db/sql/models/User";

async function _Home({requester}: { requester: User }) {
    return <div>Hello {requester.fullName}</div>
}

// THIS IS THE IMPORTANT PART
export default withAuthentication(_Home);
```