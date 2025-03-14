import { NextResponse } from "next/server";
import { User } from "~/db/sql/models/User";
import { generateGuid } from "~/util/db/guid";
import { hashPassword } from "~/util/db/datamanagement";
import { ValidationError } from "~/common/errors";
import { AccessGroup } from "~/common/enum/enumerations";
import { dbClient } from "~/db/sql/SQLBase";
import { Buffer } from "buffer";

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, password, first name and last name are required." },
        { status: 400 }
      );
    }

    // Optionally add additional validations (email format, password strength, etc.)

    // Check if a user with this email already exists.
    const existing = await User.readUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 409 }
      );
    }

    // Ensure there is a valid tenet to reference.
    // Here we try to find a default tenet (for example, one named "Default Tenet").

    // TODO: In the future, we'll want to create a tenet if they're paying, otherwise assign them to the demo tenet (read only) or some sort of free trial (also creates a tenet)
    // Until they upgrade to paid at which point we create a tenet.

    // TODO: Separate flow for adding another seat to a tenet. Will require user to set password when clicking a magic link.
    
    let defaultTenet = await dbClient.tenet.findUnique({
      where: { name: "Test Tenet" },
    });
    // if (!defaultTenet) {
    //   // Create the default tenet if it doesn't exist.
    //   defaultTenet = await dbClient.tenet.create({
    //     data: {
    //       id: Buffer.from(generateGuid()) as Buffer,
    //       name: "Default Tenet",
    //     },
    //   });
    // }

    // Create new user record.
    const newUser = new User(undefined, {
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      password,
      enabled: true,
      type: AccessGroup.CLIENT,
      tenetId: defaultTenet.id as Buffer,
    });
    await newUser.commit();

    return NextResponse.json(
      { message: "Registration successful" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
