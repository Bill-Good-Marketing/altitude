import { NextResponse } from "next/server";
import { User } from "~/db/sql/models/User";
import { generateGuid } from "~/util/db/guid";
import { hashPassword } from "~/util/db/datamanagement";
import { ValidationError } from "~/common/errors";
import { AccessGroup } from "~/common/enum/enumerations";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Optionally, add additional validation here

    // Check if a user with this email already exists
    const existing = await User.readUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 409 }
      );
    }

    // Create new user record
    const newUser = new User(undefined, {
      email,
      firstName: "", // Optionally update with provided values
      lastName: "",
      fullName: email, // Fallback fullName, or capture separately
      password: hashPassword(password),
      enabled: true,
      type: AccessGroup.CLIENT,
      tenetId: Buffer.from(generateGuid()), // Assign the appropriate tenetId
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
