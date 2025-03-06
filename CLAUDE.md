# Altitude Development Guide

## Commands
- Build: `npx prisma generate && npx prisma generate --sql && npx next build`
- Start dev server: `npm run dev` (Windows) or `npm run dev:unix` (Linux/Mac)
- Lint: `npx next lint`
- Run tests: `npx jest`
- Run single test: `npx jest -t "test name"` or `npx jest path/to/test/file.ts`
- Automatically build model based on schema: `npx tsx generateModels.ts`

## Code Style Guidelines
- Use TypeScript with strict null checks
- Path alias: Use `~/` prefix for imports from src directory 
- Models follow decorator pattern with wrapped models
- Authentication: Use `withAuthentication` HOC for page components and `API.serverAction` for server action authentication.
- Server components in page.tsx, client components in client.tsx or components/
- Follow existing patterns for error handling with transactions
- Use Jest for tests with custom matchers like toBeDirty() and toBeInstance()
- Format imports alphabetically within each group (React, libraries, internal)
- Use type aliases over interfaces when possible

## Documentation
- Key documentation for schema extensions is in [PrismaExtensions.md](PrismaExtensions.md)
- Key documentation for the wrapper system is in [WrapperSystem.md](/documentation/WrapperSystem.md)
- Key documentation for style, authentication, and specific components is also in the [documentation folder](/documentation)