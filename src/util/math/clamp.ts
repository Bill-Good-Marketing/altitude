export function clamp(val: number, min: number, max: number) {
    'use no memo';
    return Math.min(Math.max(val, min), max);
}