// Stored as alpha-3 in db
export const countryListAlpha3: { [key: string]: string } = {
    "USA": "United States of America",
    "CAN": "Canada",
    "OTH": "Other"
};

// Uses alpha-2 for tz lookup
export const countryAlpha3ToAlpha2: { [key: string]: string } = {
    "usa": "US",
    "can": "CA",
    "oth": "OT"
}

export const countryToAlpha2: { [key: string]: string } = {
    "united states of america": "US",
    "us of a": "US",
    "united states": "US",
    "canada": "CA",
    "canadian commonwealth": "CA",
    "commonwealth of canada": "CA",
    "other": "OT"
}