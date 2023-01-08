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

describe('per type field generation', () => {
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
                    A: { email: 'internet.email' },
                },
            });
            expect(result).toBeDefined();

            // Custom generation in type A
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : faker['internet']['email']()",
            );
            // Original generation in type B (unchanged)
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : faker['lorem']['sentence'](),",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite a scalar value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: { email: 'internet.email', overriddenDate: 'date.past' },
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

        it('can apply generator override to all fields of a specific name', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _all: { email: 'internet.email' },
                },
            });
            expect(result).toBeDefined();

            // Check both `email` fields are updated
            expect(
                String(result).match(
                    /email: overrides && overrides.hasOwnProperty\('email'\) \? overrides.email! : faker\['internet']\['email']\(\)/g,
                ).length,
            ).toEqual(2);
            expect(result).toMatchSnapshot();
        });

        it('can accept arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'date.recent',
                            arguments: [10],
                        },
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
                    A: {
                        dateTime: {
                            generator: 'date.recent',
                            arguments: [10],
                            extra: {
                                function: 'toLocaleDateString',
                            },
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
                    A: {
                        dateTime: {
                            generator: 'date.recent',
                            arguments: [10],
                            extra: {
                                function: 'toLocaleDateString',
                                args: ['en-GB'],
                            },
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
                    A: { email: 'internet.email' },
                },
            });
            expect(result).toBeDefined();

            // Custom generation in type A
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'my@email.com'",
            );
            // Original generation in type B (unchanged)
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'A sentence",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite a scalar value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: { email: 'internet.email', overriddenDate: 'date.past' },
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

        it('can apply generator override to all fields of a specific name', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _all: { email: 'internet.email' },
                },
            });
            expect(result).toBeDefined();

            // Check both `email` fields are updated
            expect(
                String(result).match(
                    /email: overrides && overrides.hasOwnProperty\('email'\) \? overrides.email! : 'my@email.com'/g,
                ).length,
            ).toEqual(2);
            expect(result).toMatchSnapshot();
        });

        it('can accept arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'date.recent',
                            arguments: [10],
                        },
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
                    A: {
                        dateTime: {
                            generator: 'date.recent',
                            arguments: [10],
                            extra: {
                                function: 'toLocaleDateString',
                            },
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

        it('can accept an extra function call with arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'date.recent',
                            arguments: [10],
                            extra: {
                                function: 'toLocaleDateString',
                                args: ['en-GB'],
                            },
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
