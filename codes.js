const DAY_CODES = [
    1001,
    1002
];

const EVENING_CODES = [
    2001,
    2002
];

export const ACCESS_CODES = {
    ...Object.fromEntries(DAY_CODES.map((code) => [code, 'full'])),
    ...Object.fromEntries(EVENING_CODES.map((code) => [code, 'evening']))
};
