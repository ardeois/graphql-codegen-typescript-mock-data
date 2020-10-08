module.exports = {
    roots: ['<rootDir>/tests'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    globalSetup: './tests/circular-mocks/create-mocks.ts',
};
