export function sum(data: number[]): number {
    let sum = 0;
    for (let idx = 0; idx < data.length; idx++) {
        sum += data[idx];
    }
    return sum;
}

export function mean(data: number[]): number {
    return sum(data) / data.length;
}

export function rollingAverage(data: number[], window: number): number[] {
    const result: number[] = [];

    for (let idx = 0; idx <= data.length; idx++) {
        const windowStart = Math.max(0, idx - window);
        result.push(mean(data.slice(windowStart, idx)));
    }

    return result.slice(1); // First element is always NaN
}