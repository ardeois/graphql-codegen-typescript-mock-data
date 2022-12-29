import { plugin, TypescriptMocksPluginConfig } from '../../src';
import testSchema from './schema';

jest.mock('@faker-js/faker', () => ({
    faker: {
        date: {
            future: () => new Date('2050-01-01'),
            past: () => new Date('2020-01-01'),
            recent: () => new Date('2022-01-01'),
        },
        lorem: {
            sentence: () => 'A sentence',
            word: () => 'Word',
        },
        datatype: {
            number: () => 1,
        },
        internet: {
            email: () => 'my@email.com',
        },
        seed: jest.fn(),
    },
}));

describe('per field generation', () => {
    const config = {
        generateLibrary: 'faker',
        scalars: {
            String: 'lorem.sentence',
            Date: 'date.future',
            ID: {
                generator: 'datatype.number',
                arguments: [{ min: 1, max: 100 }],
            },
        },
    } as TypescriptMocksPluginConfig;

    describe('with dynamic values', () => {
        beforeAll(() => {
            config.dynamicValues = true;
        });

        it('uses per field generation if field name matches', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    email: 'internet.email',
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : faker['internet']['email']()",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite a scalar value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    email: 'internet.email',
                    overriddenDate: 'date.past',
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "date: overrides && overrides.hasOwnProperty('date') ? overrides.date! : faker['date']['future']()",
            );
            expect(result).toContain(
                "overriddenDate: overrides && overrides.hasOwnProperty('overriddenDate') ? overrides.overriddenDate! : faker['date']['past']()",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    dateTime: {
                        generator: 'date.recent',
                        arguments: [10],
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : faker['date']['recent'](...[10])",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    dateTime: {
                        generator: 'date.recent',
                        arguments: [10],
                        extra: {
                            function: 'toLocaleDateString',
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : faker['date']['recent'](...[10]).toLocaleDateString()",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call with arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    dateTime: {
                        generator: 'date.recent',
                        arguments: [10],
                        extra: {
                            function: 'toLocaleDateString',
                            args: ['en-GB'],
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : faker['date']['recent'](...[10]).toLocaleDateString(...[\"en-GB\"])",
            );

            expect(result).toMatchSnapshot();
        });
    });

    describe('without dynamic values', () => {
        beforeAll(() => {
            config.dynamicValues = false;
        });

        it('uses per field generation if field name matches', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    email: 'internet.email',
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'my@email.com'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite a scalar value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    email: 'internet.email',
                    overriddenDate: 'date.past',
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                'date: overrides && overrides.hasOwnProperty(\'date\') ? overrides.date! : "2050-01-01T00:00:00.000Z"',
            );
            expect(result).toContain(
                'overriddenDate: overrides && overrides.hasOwnProperty(\'overriddenDate\') ? overrides.overriddenDate! : "2020-01-01T00:00:00.000Z"',
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    dateTime: {
                        generator: 'date.recent',
                        arguments: [10],
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                'dateTime: overrides && overrides.hasOwnProperty(\'dateTime\') ? overrides.dateTime! : "2022-01-01T00:00:00.000Z"',
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    dateTime: {
                        generator: 'date.recent',
                        arguments: [10],
                        extra: {
                            function: 'toLocaleDateString',
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : '1/1/2022'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call with arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    dateTime: {
                        generator: 'date.recent',
                        arguments: [10],
                        extra: {
                            function: 'toLocaleDateString',
                            args: ['en-GB'],
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : '01/01/2022'",
            );

            expect(result).toMatchSnapshot();
        });
    });
});
