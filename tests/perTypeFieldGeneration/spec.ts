import casual from 'casual';
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
            float: () => 0.51,
        },
        internet: {
            email: () => 'my@email.com',
        },
        helpers: {
            arrayElement: (arr: unknown[]) => arr[0],
        },
        seed: jest.fn(),
    },
}));

describe('per type field generation with faker', () => {
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

        it('can overwrite a nested value with null', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    D: { nested: 'null' },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain("overrides && overrides.hasOwnProperty('nested') ? overrides.nested! : null");

            expect(result).toMatchSnapshot();
        });

        it('can overwrite a nested value with null when terminateCircularRelationships is true', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                terminateCircularRelationships: true,
                fieldGeneration: {
                    D: { nested: 'null' },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain("overrides && overrides.hasOwnProperty('nested') ? overrides.nested! : null");

            expect(result).toMatchSnapshot();
        });

        it('can overwrite an enum value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: { generator: 'helpers.arrayElement', arguments: [['active', 'disabled']] } },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                `enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : faker['helpers']['arrayElement'](...[["active","disabled"]]),`,
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite an enum value when enumsAsTypes is true', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: { generator: 'helpers.arrayElement', arguments: [['active', 'disabled']] } },
                },
                enumsAsTypes: true,
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                `enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : faker['helpers']['arrayElement'](...[["active","disabled"]]),`,
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
                                arguments: ['en-GB'],
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

        it('can accept an extra function call with arguments shorthand', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'date.recent',
                            arguments: [10],
                            extra: {
                                function: 'toLocaleDateString',
                                arguments: 'en-GB',
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

        it('can overwrite an enum value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: 'internet.email' },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : 'my@email.com'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite an enum value when enumsAsTypes is true', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: 'internet.email' },
                },
                enumsAsTypes: true,
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : 'my@email.com'",
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
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : '1/1/2022'",
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
                                arguments: ['en-GB'],
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

describe('per-type random generator using faker', () => {
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
        fieldGeneration: {
            A: { str: ['lorem.sentence', 'lorem.word'] },
            B: {
                str: [
                    {
                        generator: 'lorem.word',
                        arguments: [3],
                    },
                    {
                        generator: 'lorem.sentence',
                        arguments: [3],
                        weight: 99,
                    },
                ],
            },
        },
    } as TypescriptMocksPluginConfig;

    describe('with dynamic values', () => {
        beforeAll(() => {
            config.dynamicValues = true;
        });

        it('should generate random fields using faker', async () => {
            const result = await plugin(testSchema, [], config);

            expect(result).toBeDefined();

            // A
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : [() => faker['lorem']['sentence'](), () => faker['lorem']['word']()][weightedChoice([1,1], () => faker.datatype.float({ max: 1.0 }))]()",
            );

            // B
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : [() => faker['lorem']['word'](...[3]), () => faker['lorem']['sentence'](...[3])][weightedChoice([1,99], () => faker.datatype.float({ max: 1.0 }))]()",
            );

            expect(result).toMatchSnapshot();
        });
    });

    describe('without dynamic values', () => {
        beforeAll(() => {
            config.dynamicValues = false;
        });

        it('should generate random fields using faker', async () => {
            const result = await plugin(testSchema, [], config);

            expect(result).toBeDefined();

            // A
            expect(result).toContain("str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'Word'");

            // B
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'A sentence'",
            );

            expect(result).toMatchSnapshot();
        });
    });
});

describe('per type field generation with casual', () => {
    const config = {
        generateLibrary: 'casual',
        scalars: {
            String: 'word',
            Date: 'date',
            ID: {
                generator: 'datatype.integer',
                arguments: [1, 100],
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
                    A: { email: 'email' },
                },
            });
            expect(result).toBeDefined();

            // Custom generation in type A
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : casual['email']",
            );
            // Original generation in type B (unchanged)
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : casual['word'],",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite a scalar value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: { email: 'email', overriddenDate: 'date' },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "date: overrides && overrides.hasOwnProperty('date') ? overrides.date! : casual['date']",
            );
            expect(result).toContain(
                "overriddenDate: overrides && overrides.hasOwnProperty('overriddenDate') ? overrides.overriddenDate! : casual['date']()",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite an enum value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: 'email' },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : casual['email'],",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite an enum value when enumsAsTypes is true', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: 'email' },
                },
                enumsAsTypes: true,
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : casual['email'],",
            );

            expect(result).toMatchSnapshot();
        });

        it('can apply generator override to all fields of a specific name', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _all: { email: 'email' },
                },
            });
            expect(result).toBeDefined();

            // Check both `email` fields are updated
            expect(
                String(result).match(
                    /email: overrides && overrides.hasOwnProperty\('email'\) \? overrides.email! : casual\['email']/g,
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
                            generator: 'integer',
                            arguments: [1, 100],
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : casual['integer'](...[1,100])",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'integer',
                            arguments: [1, 100],
                            extra: {
                                function: 'toFixed',
                            },
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : casual['integer'](...[1,100]).toFixed()",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call with arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'integer',
                            arguments: [1, 100],
                            extra: {
                                function: 'toFixed',
                                arguments: [3],
                            },
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : casual['integer'](...[1,100]).toFixed(...[3])",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call with arguments shorthand', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'integer',
                            arguments: [1, 100],
                            extra: {
                                function: 'toFixed',
                                arguments: 3,
                            },
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : casual['integer'](...[1,100]).toFixed(...[3])",
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
                    A: { email: 'email' },
                },
            });
            expect(result).toBeDefined();

            // Custom generation in type A
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'Schuppe.Demario@yahoo.com'",
            );
            // Original generation in type B (unchanged)
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'quibusdam'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite a scalar value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: { email: 'email', overriddenDate: 'date' },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "date: overrides && overrides.hasOwnProperty('date') ? overrides.date! : '2004-01-01'",
            );
            expect(result).toContain(
                "overriddenDate: overrides && overrides.hasOwnProperty('overriddenDate') ? overrides.overriddenDate! : '1995-09-05'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite an enum value', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: 'email' },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : 'Roosevelt.Oberbrunner@gmail.com'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can overwrite an enum value when enumsAsTypes is true', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    C: { enum: 'email' },
                },
                enumsAsTypes: true,
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "enum: overrides && overrides.hasOwnProperty('enum') ? overrides.enum! : 'Roosevelt.Oberbrunner@gmail.com'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can apply generator override to all fields of a specific name', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _all: { email: 'email' },
                },
            });
            expect(result).toBeDefined();

            // Check both `email` fields are updated
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'Schuppe.Demario@yahoo.com'",
            );
            expect(result).toContain(
                "email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'Molly.Wuckert@gmail.com'",
            );
            expect(result).toMatchSnapshot();
        });

        it('can accept arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'integer',
                            arguments: [1, 100],
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : 39",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'integer',
                            arguments: [1, 100],
                            extra: {
                                function: 'toFixed',
                            },
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : '39'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call with arguments', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'integer',
                            arguments: [1, 100],
                            extra: {
                                function: 'toFixed',
                                arguments: [3],
                            },
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : '39.000'",
            );

            expect(result).toMatchSnapshot();
        });

        it('can accept an extra function call with arguments shorthand', async () => {
            const result = await plugin(testSchema, [], {
                ...config,
                fieldGeneration: {
                    A: {
                        dateTime: {
                            generator: 'integer',
                            arguments: [1, 100],
                            extra: {
                                function: 'toFixed',
                                arguments: 3,
                            },
                        },
                    },
                },
            });
            expect(result).toBeDefined();

            expect(result).toContain(
                "dateTime: overrides && overrides.hasOwnProperty('dateTime') ? overrides.dateTime! : '39.000'",
            );

            expect(result).toMatchSnapshot();
        });
    });
});

describe('per-type random generator using casual', () => {
    const config = {
        generateLibrary: 'casual',
        fieldGeneration: {
            A: { str: ['string', 'word'] },
        },
    } as TypescriptMocksPluginConfig;

    beforeEach(() => {
        jest.spyOn(casual, 'double').mockReturnValue(0.51);
    });

    afterEach(() => {
        jest.spyOn(casual, 'double').mockRestore();
    });

    describe('with dynamic values', () => {
        beforeAll(() => {
            config.dynamicValues = true;
        });

        it('should generate random fields using casual', async () => {
            const result = await plugin(testSchema, [], config);

            expect(result).toBeDefined();

            // String
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : [() => casual['string'], () => casual['word']][weightedChoice([1,1], () => casual.double(0, 1.0))]()",
            );

            expect(result).toMatchSnapshot();
        });
    });

    describe('without dynamic values', () => {
        beforeAll(() => {
            config.dynamicValues = false;
        });

        it('should generate random fields using casual', async () => {
            const result = await plugin(testSchema, [], config);

            expect(result).toBeDefined();

            // String
            expect(result).toContain("str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'ea'");

            expect(result).toMatchSnapshot();
        });
    });
});
