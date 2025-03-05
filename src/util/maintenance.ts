export function isMaintenance(): boolean {
    return process.env.MAINTENANCE === 'true';
}

export function getMaintenanceMessage(): string {
    return process.env.MAINTENANCE_MESSAGE || 'We are currently undergoing scheduled maintenance. Please check back later!';
}