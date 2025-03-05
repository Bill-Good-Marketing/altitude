import {API} from "~/util/api/ApiResponse";
import {Token} from "~/db/sql/models/Token";
import {NextRequest} from "next/server";
import {getToken} from "next-auth/jwt";
import {JWTToken} from "~/app/api/auth/[...nextauth]/route";
import {revalidateCache} from "~/util/api/caching";

export async function POST(req: NextRequest) {
    const jwt = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET!,
    }) as JWTToken | null;

    if (!jwt) {
        return API.error('Invalid request', 400);
    }

    const token = new Token(jwt.tokenId);
    await token.delete();
    // @ts-expect-error - Is valid cache key
    await revalidateCache(`valid-${jwt.tokenId}`);

    return API.success('Token invalidated', 200);
}

// export const POST = API.route(_POST);