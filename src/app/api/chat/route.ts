import {openai} from '@ai-sdk/openai';
import {Message, streamText} from 'ai';
import ai from '~/ai/AI';
import {getAuthSession} from "~/util/auth/AuthUtils";
import {API} from "~/util/api/ApiResponse";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const model = openai('gpt-4o-mini');

export async function POST(req: Request) {
    const user = await getAuthSession();

    if (user == null) {
        return API.error('You must be logged in to use this route', 401);
    } else if (user === 'refresh') {
        return API.error('Token refresh required', 401);
    }

    const { messages, tzOffset, contact } = await req.json() as { messages: Message[], tzOffset: number, contact: { id: string, fullName: string } | null };

    await ai.initialize();

    const tools = ai.tools({tenetId: user.tenetId ?? null, user, tzOffset});

    const systemPrompt = ai.constructSystemPrompt({userId: user.guid, userName: user.fullName!, tzOffset, contact}, `You are a human-to-CRM interface for financial advisors. Don't refer to databases, refer to the CRM instead.`);

    const result = streamText({
        model,
        system: systemPrompt,
        messages,
        tools,
        experimental_toolCallStreaming: true,
        maxSteps: 5,
        maxTokens: 1024,
        // temperature: 0.1,
    });

    return result.toDataStreamResponse();
}