export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.INSTRUMENTATION === 'true') {
        return await import('./instrumentation.node')
    }
}