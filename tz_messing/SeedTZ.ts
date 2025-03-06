import data from "./tz.json" assert {type: "json"};
import {PrismaClient} from "@prisma/client";

const tzMap = new Map<string, string>();

// Parse each line into an object
const tzObjects = data.map(entry => {
    const name = entry.name;
    const tz = entry.timezone;
    const countryCode = entry['country code'];
    const provinceName = entry['province_name'];

    const key = `${countryCode}-${provinceName}-${name}`;

    if (tzMap.has(key)) {
        if (tzMap.get(key) === tz) {
            return;
        }

        switch (key) {
            case 'US-Kentucky-Providence':
                tzMap.set(key, 'America/Chicago');
                return;
            case 'US-Kentucky-Westwood':
            case 'US-Kentucky-Worthington':
                tzMap.set(key, 'America/New_York');
                return;
            case 'US-Indiana-Dale':
                tzMap.set(key, 'America/Chicago');
                return;
            case 'US-Indiana-Georgetown':
                tzMap.set(key, 'America/Kentucky/Louisville');
                return;
            case 'US-Indiana-Mount Vernon':
                tzMap.set(key, 'America/Chicago');
                return;
            case 'US-Arizona-Cottonwood':
                tzMap.set(key, 'America/Phoenix');
                return;
            case 'US-Texas-Agua Dulce':
            case 'US-Texas-Sparks':
                tzMap.set(key, 'America/Chicago');
                return;
            case 'US-Florida-Midway':
                tzMap.set(key, 'America/New_York');
                return;
            case 'US-Florida-Spring Hill':
            case 'US-Florida-Whitfield':
                tzMap.set(key, 'America/New_York');
                return;
            case 'US-Indiana-Greenville':
                tzMap.set(key, 'America/Kentucky/Louisville');
                return;
            case 'US-Kentucky-Arlington':
            case 'US-Kentucky-Columbus':
                tzMap.set(key, 'America/Chicago');
                return;
            case 'US-Kentucky-Concord':
            case 'US-Kentucky-Fairview':
                tzMap.set(key, 'America/New_York');
                return;
            case 'US-Kentucky-Morehead':
                tzMap.set(key, 'America/New_York');
                return;
            default:
                console.warn(`Unhandled timezone key: ${key}`);
                return;
        }

        console.warn(`Duplicate keys ${key} with different timezones, (tz: ${tz}, tz2: ${tzMap.get(key)})`);
        return;
    }

    tzMap.set(key, tz);

    return {
        name,
        countryCode,
        provinceName
    }
});

const prisma = new PrismaClient();

await prisma.tZData.createMany({
    data: tzObjects.filter(Boolean).map((data) => ({
        ...data!,
        tz: tzMap.get(data!.countryCode + '-' + data!.provinceName + '-' + data!.name)!
    }))
});