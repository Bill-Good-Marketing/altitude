// Simple timezone lookup for US states
// Complex timezones are marked as "lookup" because they need to be searched by city
import {dbClient} from "~/db/sql/SQLBase";
import {isCountrySupported, lookupFallbacks, normalizeCountry, normalizeState, timezoneStateLookup} from "~/util/time/tzutils";
//import 'server-only';

export const TZ_NONE = 'TZ_NONE';

type TZResult = {
    tz: string,
    fallback: boolean
} | 'TZ_NONE';

export async function getTimezone(city: string, state: string, country: string): Promise<TZResult | 'TZ_NONE'> {
    return (await getTimezones([{country, state, city}]))[0];
}

// Gets timezone if in quick lookup maps
export function getTimezoneSync(_state: string, _country: string): TZResult {
    if (!isCountrySupported(_country)) {
        return TZ_NONE;
    }
    const country = normalizeCountry(_country);
    const state = normalizeState(country, _state);
    const lookup = timezoneStateLookup[country][state];

    if (lookup == null) {
        return TZ_NONE;
    }
    return {
        tz: lookup,
        fallback: false
    };
}

export async function getTimezones(input: {
    country: string,
    state: string,
    city: string
}[]): Promise<TZResult[]> {
    // Key is country-state-city
    const results: { [key: string]: TZResult } = {};

    const toReadNames: string[] = [];
    const toReadCountries: string[] = [];
    const toReadProvinces: string[] = [];

    for (const {country: _country, state: _state, city} of input) {
        if (!isCountrySupported(_country)) {
            results[`${_country}-${_state}-${city}`] = TZ_NONE;
            continue;
        }
        const country = normalizeCountry(_country);
        const state = normalizeState(country, _state);

        const key = `${country}-${_state}-${city}`;
        const stateLookup = timezoneStateLookup[country][state];

        if (stateLookup == null) {
            results[key] = TZ_NONE;
            throw new TypeError(`${_state} timezone lookup failed.`);
        }

        if (stateLookup === 'lookup') {
            // Lookup by city
            toReadNames.push(city);
            toReadCountries.push(country);
            toReadProvinces.push(_state);
        } else {
            // Lookup by state b/c the state has a consistent timezone
            results[key] = {
                tz: stateLookup,
                fallback: false
            }
        }
    }

    if (toReadNames.length > 0) {
        const lookupResults = await dbClient.tZData.findMany({
            where: {
                name: {
                    in: toReadNames
                },
                countryCode: {
                    in: toReadCountries
                },
                provinceName: {
                    in: toReadProvinces
                }
            },
            select: {
                name: true,
                countryCode: true,
                provinceName: true,
                tz: true
            }
        })

        for (const lookupResult of lookupResults) {
            const key = `${lookupResult.countryCode}-${lookupResult.provinceName}-${lookupResult.name}`;

            results[key] = {
                tz: lookupResult.tz,
                fallback: false
            }
        }
    }

    // Ensures same order as inputs
    return input.map(({country, state, city}) => {
        if (!isCountrySupported(country)) {
            return TZ_NONE;
        }

        const normalizedCountry = normalizeCountry(country);
        const key = `${normalizedCountry}-${state}-${city}`;
        let res = results[key];
        if (res == null) {
            const normalizedState = normalizeState(normalizedCountry, state);
            // Check for fallback
            const fallback = lookupFallbacks[normalizedCountry][normalizedState];
            if (fallback != null) {
                res = {
                    tz: fallback,
                    fallback: true
                }
            } else {
                res = TZ_NONE;
            }
        }
        return res;
    });
}