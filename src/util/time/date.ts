export function dateGreater(date: Date, other: Date, unit: 'day' | 'minute') {
    'use no memo';
    if (unit === 'day') {
        if (date.getFullYear() > other.getFullYear()) {
            return true
        } else if (date.getFullYear() === other.getFullYear() && date.getMonth() > other.getMonth()) {
            return true
        } else if (date.getFullYear() === other.getFullYear() && date.getMonth() === other.getMonth() && date.getDate() > other.getDate()) {
            return true
        }
        return false
    } else {
        if (date.getFullYear() > other.getFullYear()) {
            return true
        } else if (date.getFullYear() === other.getFullYear() && date.getMonth() > other.getMonth()) {
            return true
        } else if (date.getFullYear() === other.getFullYear() && date.getMonth() === other.getMonth() && date.getDate() > other.getDate()) {
            return true
        } else if (date.getFullYear() === other.getFullYear() && date.getMonth() === other.getMonth() && date.getDate() === other.getDate() && date.getHours() > other.getHours()) {
            return true
        } else if (date.getFullYear() === other.getFullYear() && date.getMonth() === other.getMonth() && date.getDate() === other.getDate() && date.getHours() === other.getHours() && date.getMinutes() > other.getMinutes()) {
            return true
        }
        return false
    }
}

export function areDatesEqual(a: Date, b: Date, utc = false) {
    'use no memo';
    if (utc) {
        return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
    }
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getDateFromString(dateString?: string | null) {
    if (dateString == null) {
        return null;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
}