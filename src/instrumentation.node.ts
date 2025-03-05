import {registerOTel} from "@vercel/otel";
import {PrismaInstrumentation} from "@prisma/instrumentation";
import crypto from "crypto";

class IdGenerator {
    /** Returns a trace ID composed of 32 lowercase hex characters. */
    generateTraceId() {
        return crypto.randomBytes(16).toString('hex');
    };

    /** Returns a span ID composed of 16 lowercase hex characters. */
    generateSpanId() {
        return crypto.randomBytes(8).toString('hex');
    };
}

registerOTel({
    serviceName: 'converse-crm',
    instrumentations: [new PrismaInstrumentation()],
    idGenerator: new IdGenerator(),
})