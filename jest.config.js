module.exports = {
    roots: ['<rootDir>/tests'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    globalSetup: './tests/globalSetup.ts',
};
