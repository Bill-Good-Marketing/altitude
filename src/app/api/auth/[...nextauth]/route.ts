import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth, { NextAuthOptions, RequestInternal, Session } from "next-auth";
import { encode, JWTEncodeParams } from "next-auth/jwt";
import { comparePassword } from "~/util/db/datamanagement";
import { AccessGroup, AccessGroupNameMapping } from "~/common/enum/enumerations";
import { AccessGroupHierarchy, LogLevel } from "~/common/enum/serverenums";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "~/util/auth/Permissions";
import { validateGUID } from "~/util/db/validation";
import {
  NonGenericServerError,
  UniqueConstraintViolationError,
  ValidationError,
} from "~/common/errors";
import { User } from "~/db/sql/models/User";
import { Log } from "~/db/sql/models/Log";
import { Token } from "~/db/sql/models/Token";
import { generateGuid } from "~/util/db/guid";
import { dbClient } from "~/db/sql/SQLBase";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { getIP, isTokenValid } from "~/util/auth/AuthUtils";
import { revalidateCache } from "~/util/api/caching";

// Use the TOKEN_VERSION env var or fallback to "1"
export const TOKEN_VERSION = process.env.TOKEN_VERSION ?? "1";

// This is the custom user data shape we use in our JWT token.
type UserData = {
  guid: string;
  fullName: string;
  email: string;
  type: AccessGroup;
  enabled: boolean;
  tenetId?: string;
};

// Our custom JWT token type that includes additional properties.
export type JWTToken = {
  rememberMe: boolean;
  user: UserData;
  version: string;
  view?: AccessGroup | string;
  viewData?: UserData;
  invalidated?: boolean;
  tokenId: string;
};

// Our custom auth user type used when authorizing credentials.
interface AuthUser {
  id: string;
  name: string;
  email: string;
  type: AccessGroup;
  enabled: boolean;
  rememberMe: boolean;
  tenetId?: string;
}

// Custom error for login failures.
class LoginError extends Error {
  private _marker: string = "LoginError";
  constructor(message: string) {
    super(message);
  }
  static is(error: unknown): error is LoginError {
    return (error as LoginError)._marker === "LoginError";
  }
}

const JWT_MAX_AGE = 60 * 60 * 4; // 4 hours
const JWT_MAX_AGE_REMEMBER_ME = 15 * 60 * 60 * 24 * 365; // 15 years

// This function verifies the credentials. It decrypts and compares passwords.
export async function standardAuthorize(
  credentials?: Record<"email" | "password" | "rememberMe", string>,
  req?: Pick<RequestInternal, "body" | "query" | "headers" | "method">,
  ip?: string
): Promise<AuthUser | null> {
  if (!credentials) return null;
  const { email, password, rememberMe } = credentials;
  try {
    if (!email || !password) return null;
    const rememberMeBool = rememberMe === "true";

    // Look up the user using the supplied email.
    const user = await User.readUnique({
      where: { email },
      select: {
        email: true,
        fullName: true,
        type: true,
        enabled: true,
        tenetId: true,
        password: true,
      },
    });
    if (!user) return null;

    // Use your comparePassword function (which should handle decryption + bcrypt compare).
    if (comparePassword(password, user.password)) {
      if (!user.enabled) {
        if (isAdmin(user.type)) {
          await Log.log(
            `The ${AccessGroupNameMapping[user.type!]} account ${user.email} was disabled and an attempt was made to log in.`,
            LogLevel.CRITICAL,
            undefined,
            user.email,
            `Login attempt from IP ${ip}.`,
            "standardAuthorize",
            user.tenetId
          );
        }
        throw new LoginError("Your account has been disabled. Please contact the site administrator.");
      }
      if (isAdmin(user.type)) {
        await Log.log(
          `The ${AccessGroupNameMapping[user.type!]} account ${user.email} logged in.`,
          LogLevel.INFO,
          undefined,
          user.email,
          `User ${user.email} logged in from IP ${ip}.`,
          "standardAuthorize",
          user.tenetId
        );
      }
      return {
        id: user.guid.toString("hex"),
        name: user.fullName || "",
        email: user.email,
        type: user.type || AccessGroup.CLIENT,
        enabled: user.enabled,
        rememberMe: rememberMeBool,
        tenetId: user.tenetId?.toString("hex"),
      };
    } else {
      if (isAdmin(user.type)) {
        await Log.log(
          `The ${AccessGroupNameMapping[user.type!]} account ${user.email} failed to log in.`,
          LogLevel.HIGH,
          undefined,
          user.email,
          `Invalid password attempt from IP ${ip}.`,
          "standardAuthorize",
          user.tenetId
        );
      }
      return null;
    }
  } catch (e) {
    if (ValidationError.is(e)) {
      await Log.log(
        `Login validation error`,
        LogLevel.HIGH,
        (e as Error).stack,
        undefined,
        `Login error from IP ${ip}: ${(e as Error).message}`,
        "standardAuthorize"
      );
      throw new Error("Validation Error, please contact the site administrator.");
    } else if (UniqueConstraintViolationError.is(e)) {
      await Log.log(
        `Login unique constraint error`,
        LogLevel.WARNING,
        (e as Error).stack,
        undefined,
        `Unique constraint error from IP ${ip}: ${(e as Error).message}`,
        "standardAuthorize"
      );
      throw new Error("Validation Error, please contact the site administrator.");
    } else if (NonGenericServerError.is(e)) {
      await Log.log(
        `Login server error`,
        LogLevel.CRITICAL,
        (e as Error).stack,
        undefined,
        `Server error from IP ${ip}: ${(e as any).getLogMessage()}\n${(e as any).cause?.message ?? ""}`,
        "standardAuthorize"
      );
      throw new Error("An internal server error occurred. Please contact the site administrator.");
    } else if (LoginError.is(e)) {
      throw e;
    } else {
      await Log.log(
        `Login unknown error`,
        LogLevel.CRITICAL,
        (e as Error).stack,
        undefined,
        `Unknown error from IP ${ip}: ${(e as Error).message}`,
        "standardAuthorize"
      );
    }
    if (process.env.NODE_ENV === "production") {
      console.error(e);
      throw new Error("Internal Server Error");
    }
    throw e;
  }
}

const ViewEmailMapping: { [key: string]: string } = {
  client: "client@billgood.local",
};

type ViewableOfficeRoles = "advisor" | "office-admin" | "staff";
const ArrayOfViewableOfficeRoles: ViewableOfficeRoles[] = ["advisor", "office-admin", "staff"];

// Extend the session type to include our custom refresh flag.
type ExtendedSession = Session & { refresh: boolean };

function AuthOptionsProvider(ip = "unknown"): NextAuthOptions {
  return {
    providers: [
      CredentialsProvider({
        id: "standard",
        name: "Standard Login",
        credentials: {
          email: { label: "email", type: "text" },
          password: { label: "password", type: "password" },
          rememberMe: { label: "rememberMe", type: "checkbox" },
        },
        authorize: (credentials, req) => standardAuthorize(credentials, req, ip),
      }),
    ],
    session: {
      strategy: "jwt",
      maxAge: JWT_MAX_AGE_REMEMBER_ME,
    },
    jwt: {
      maxAge: JWT_MAX_AGE,
      async encode(params: JWTEncodeParams) {
        const { token } = params;
        if (token && token.rememberMe) {
          params.maxAge = JWT_MAX_AGE_REMEMBER_ME;
        }
        return encode(params);
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
      newUser: "/signup",
    },
    callbacks: {
      async jwt({ token, user, trigger, session }): Promise<JWTToken> {
        // Cast token to our custom JWTToken type.
        let jwtToken = token as JWTToken;

        // Helper to get viewData based on session.view.
        async function getViewData(
          view: AccessGroup | ViewableOfficeRoles | string,
          allowed: Set<AccessGroup | ViewableOfficeRoles | "guid">
        ): Promise<JWTToken["viewData"]> {
          if (validateGUID(view) && allowed.has("guid")) {
            const usr = await User.getById(view, {
              email: true,
              fullName: true,
              type: true,
              enabled: true,
              tenetId: true,
            });
            if (!usr) return undefined;
            const hierarchyIndex = AccessGroupHierarchy.indexOf(jwtToken.user.type);
            const targetIndex = AccessGroupHierarchy.indexOf(usr.type!);
            if (hierarchyIndex <= targetIndex) return undefined;
            return {
              guid: usr.guid.toString("hex"),
              fullName: usr.fullName!,
              email: usr.email!,
              type: usr.type!,
              enabled: usr.enabled!,
              tenetId: usr.tenetId?.toString("hex"),
            };
          } else if (allowed.has(view as AccessGroup | ViewableOfficeRoles)) {
            switch (view) {
              case "client":
              case "admin": {
                const usr = await User.getByEmail(ViewEmailMapping[session.view!]);
                if (!usr) return undefined;
                return {
                  guid: usr.guid.toString("hex"),
                  fullName: usr.fullName!,
                  email: usr.email!,
                  type: usr.type!,
                  enabled: usr.enabled!,
                  tenetId: usr.tenetId?.toString("hex"),
                };
              }
            }
          } else if (
            (!allowed.has(view as AccessGroup | ViewableOfficeRoles)) ||
            (validateGUID(view) && !allowed.has("guid"))
          ) {
            await Log.log(
              `Unauthorized attempt to change session view to ${view}`,
              LogLevel.CRITICAL,
              undefined,
              jwtToken.user.email!,
              `Session view: ${session.view} is not allowed to be changed to ${view}.\n\nIP Address: ${ip}`,
              "nextauth#jwt/sessionUpdate",
              jwtToken.user.tenetId ? Buffer.from(jwtToken.user.tenetId, "hex") : null
            );
          }
        }

        if (user) {
          jwtToken.user = {
            guid: (user as AuthUser).id,
            fullName: (user as AuthUser).name,
            email: (user as AuthUser).email,
            type: (user as AuthUser).type,
            enabled: (user as AuthUser).enabled,
            tenetId: (user as AuthUser).tenetId,
          };
          jwtToken.tokenId = generateGuid().toString("hex");
          jwtToken.rememberMe = (user as any).rememberMe;
          jwtToken.version = TOKEN_VERSION;
          const tokenObj = new Token(jwtToken.tokenId);
          tokenObj.new = true;
          tokenObj.userId = Buffer.from(jwtToken.user.guid, "hex");
          await tokenObj.commit();
        }

        if (trigger === "update" && session) {
          if (session.view && isAdmin(jwtToken.user.type)) {
            switch (jwtToken.user.type) {
              case AccessGroup.ADMIN: {
                if (session.view === "admin" || session.view === "sysadmin") {
                  jwtToken.view = undefined;
                  jwtToken.viewData = undefined;
                } else {
                  jwtToken.view = session.view;
                  jwtToken.viewData = await getViewData(
                    session.view,
                    new Set(["guid", ...ArrayOfViewableOfficeRoles, AccessGroup.CLIENT])
                  );
                  if (!jwtToken.viewData) {
                    jwtToken.view = undefined;
                    jwtToken.viewData = undefined;
                  }
                }
                break;
              }
            }
          }
          if (session.refresh) {
            try {
              const [usr] = await Promise.all([
                User.getById(jwtToken.user.guid, {
                  email: true,
                  fullName: true,
                  type: true,
                  enabled: true,
                  tenetId: true,
                }),
                dbClient.token.update({
                  where: { id: Buffer.from(jwtToken.tokenId, "hex") },
                  data: { refresh: false },
                }),
              ]);
              if (!usr) {
                await revalidateCache(`valid-${jwtToken.tokenId}` as any);
                jwtToken.invalidated = true;
                return jwtToken;
              }
              await revalidateCache([
                `valid-${jwtToken.tokenId}` as any,
                `valid-${usr.guid.toString("hex")}` as any,
              ]);
              jwtToken.user = {
                guid: usr.guid.toString("hex"),
                fullName: usr.fullName!,
                email: usr.email!,
                type: usr.type!,
                enabled: usr.enabled!,
                tenetId: usr.tenetId?.toString("hex"),
              };
            } catch (e) {
              if (
                e instanceof PrismaClientKnownRequestError &&
                e.message.includes("Record to update not found.")
              ) {
                jwtToken.invalidated = true;
                return jwtToken;
              }
              throw e;
            }
          }
        }
        return jwtToken;
      },

      async session({ session, token, newSession, trigger }): Promise<ExtendedSession> {
        const jwtToken = token as JWTToken;
        const s = { ...session, refresh: false } as ExtendedSession;
        if (jwtToken && jwtToken.invalidated) {
          const tokenObj = new Token(jwtToken.tokenId);
          await tokenObj.delete();
          return { expires: new Date().toISOString(), refresh: false } as ExtendedSession;
        } else if (jwtToken) {
          s.user = { name: jwtToken.user.fullName };
          s.refresh = (await isTokenValid(jwtToken)) === "refresh";
        }
        return s;
      },
    },
  };
}

const authHandler = async function (req: NextRequest, res: NextResponse) {
  const reqIp = (await getIP()) || "unknown";
  const _AuthOptions: NextAuthOptions = AuthOptionsProvider(reqIp);
  const handler = NextAuth(_AuthOptions);
  return handler(req, res);
};

export { authHandler as GET, authHandler as POST };
