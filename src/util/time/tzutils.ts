'use no memo';
import {countryAlpha3ToAlpha2, countryToAlpha2} from "~/util/lists/Country";
import {countryStateToAlpha2} from "~/util/lists/States";

export const timezoneStateLookup: Record<string, Record<string, 'Pacific/Honolulu' | 'America/Los_Angeles' | 'America/Denver' | 'America/Chicago' | 'America/New_York' | 'America/Moncton' | 'Canada/Newfoundland' | 'US/Samoa' | 'Pacific/Guam' | 'America/Puerto_Rico' | 'lookup'>> = {
    US: {
        AL: "America/Chicago",
        AK: "lookup",
        AZ: "lookup",
        AR: "America/Chicago",
        CA: "America/Los_Angeles",
        CO: "America/Denver",
        CT: "America/New_York",
        DE: "America/New_York",
        FL: "lookup",
        GA: "America/New_York",
        HI: "Pacific/Honolulu",
        ID: "lookup",
        IL: "America/Chicago",
        IN: "lookup",
        IA: "America/Chicago",
        KS: "lookup",
        KY: "lookup",
        LA: "America/Chicago",
        ME: "America/New_York",
        MD: "America/New_York",
        MA: "America/New_York",
        MI: "lookup",
        MN: "America/Chicago",
        MS: "America/Chicago",
        MO: "America/Chicago",
        MT: "America/Denver",
        NC: "America/New_York",
        ND: "lookup",
        NE: "lookup",
        NH: "America/New_York",
        NJ: "America/New_York",
        NV: "America/Los_Angeles",
        NM: "America/Denver",
        NY: "America/New_York",
        OH: "America/New_York",
        OK: "America/Chicago",
        OR: "lookup",
        PA: "America/New_York",
        RI: "America/New_York",
        SC: "America/New_York",
        SD: "lookup",
        TN: "lookup",
        TX: "lookup",
        UT: "America/Denver",
        VT: "America/New_York",
        VA: "America/New_York",
        WA: "America/Los_Angeles",
        WV: "America/New_York",
        WI: "America/Chicago",
        WY: "America/Denver",

        DC: "America/New_York",
        AS: "US/Samoa",
        GU: "Pacific/Guam",
        PR: "America/Puerto_Rico",
        VI: "America/Puerto_Rico",
    },

    // Canada
    CA: {
        AB: "America/Denver",
        BC: "lookup",
        MB: "America/Chicago",
        NB: "America/Moncton",
        NL: "Canada/Newfoundland",
        NS: "America/Moncton",
        NT: "America/Denver",
        NU: "America/New_York",
        ON: "lookup",
        PE: "America/Moncton",
        QC: "lookup",
        SK: "lookup",
        YT: "America/Los_Angeles"
    }
}

// Fallbacks for lookups in case the city doesn't exist
export const lookupFallbacks: Record<string, Record<string, string>> = {
    US: {
        AK: "America/Anchorage",
        AZ: "America/Phoenix",
        FL: "America/New_York",
        ID: "America/Denver",
        IN: 'America/New_York',
        KS: "America/Chicago",
        KY: "America/New_York",
        MI: "America/New_York",
        NE: "America/Chicago",
        ND: "America/Chicago",
        OR: "America/Los_Angeles",
        SD: "America/Chicago",
        TN: "America/Chicago",
        TX: "America/Chicago",
    },
    CA: {
        BC: "America/Los_Angeles",
        ON: "America/New_York",
        QC: "America/New_York",
        SK: "America/Denver",
    }
}

export function isCountrySupported(_country: string) {
    let country = _country.toLowerCase();
    if (country.length === 3) {
        country = countryAlpha3ToAlpha2[country];
    } else if (country.length !== 2) {
        country = countryToAlpha2[country];
    }

    return country != null && country !== 'OT';
}

// Used for map lookups, not db lookups however as DB is 3 letter country codes
export function normalizeCountry(_country: string) {
    let country = _country.toLowerCase();
    if (country.length === 3) {
        country = countryAlpha3ToAlpha2[country];
    } else if (country.length !== 2) {
        country = countryToAlpha2[country];
    }

    if (country == null) {
        throw new TypeError(`Could not properly lookup country ${_country}`);
    } else if (country === 'OT') {
        throw new TypeError(`Country "Other" is not supported`);
    }

    return country;
}

export function normalizeState(normalizedCountry: string, _state: string) {
    let state = _state;
    if (state.length !== 2) {
        state = countryStateToAlpha2[normalizedCountry][state.toLowerCase()];
    }

    if (state == null) {
        throw new TypeError(`Could not properly lookup state ${_state}`);
    }

    return state;
}