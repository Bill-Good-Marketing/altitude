import {SpanStatusCode, trace as _trace} from "@opentelemetry/api";

export declare interface MinimalSpan {
    setAttribute(key: string, value: any): void

    end(): void
}

export async function quickTrace<Ret>(name: string, callback: (span: MinimalSpan) => Ret): Promise<Ret> {
    if (process.env.INSTRUMENTATION === 'true') {
        return _trace.getTracer('converse-crm').startActiveSpan(name, async (span) => {
            try {
                return await callback(span);
            } catch (e) {
                const error = e as Error;
                span.setAttribute('wrapper.error', true);
                span.setAttribute('wrapper.error.message', error.message);
                span.setAttribute('wrapper.error.name', error.name);
                span.setAttribute('wrapper.error.stack', error.stack ?? 'No stacktrace');
                span.setAttribute('wrapper.error.cause', (error.cause as Error | undefined)?.stack  ?? 'No cause');
                span.setStatus({code: SpanStatusCode.ERROR, message: error.message});
                if (error.cause != null) {
                    console.error(e, error.cause);
                }
                else console.error(e);
                throw e;
            } finally {
                span.end();
            }
        });
    }
    return callback({
        setAttribute: () => {
        },
        end: () => {
        }
    });
}