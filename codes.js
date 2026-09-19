
const GUEST_CODES = [
    { code: 1001, name: 'John Smith', access: 'full' },
    { code: 1002, name: 'Sarah Smith', access: 'full' },

    { code: 2001, name: 'Tom Brown', access: 'evening' },
    { code: 2002, name: 'Emma Brown', access: 'evening' }
];

export const ACCESS_CODES = Object.fromEntries(
    GUEST_CODES.map(({ code, name, access }) => [
        code,
        { name, access }
    ])
);
