import { plugin } from '../../src';
import testSchema from './schema';

describe('Custom scalar generation using casual', () => {
    it('should generate custom scalars for native and custom types', async () => {
        const result = await plugin(testSchema, [], {
            generateLibrary: 'casual',
            scalars: {
                String: 'string',
                Float: {
                    generator: 'double',
                    arguments: [-100, 0],
                },
                ID: {
                    generator: 'integer',
                    arguments: [1, 100],
                },
                Boolean: 'false',
                Int: {
                    generator: 'integer',
                    arguments: [-100, 0],
                },
                AnyObject: 'email',
            },
        });

        expect(result).toBeDefined();

        // String
        expect(result).toContain(
            "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'ea corrupti qui incidunt eius consequatur blanditiis',",
        );

        // Float
        expect(result).toContain(
            "flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : -24.509902694262564,",
        );

        // ID
        expect(result).toContain("id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 82,");

        // Boolean
        expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

        // Int
        expect(result).toContain("int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : -93,");

        expect(result).toMatchSnapshot();
    });

    it('should generate dynamic custom scalars for native and custom types', async () => {
        const result = await plugin(testSchema, [], {
            generateLibrary: 'casual',
            dynamicValues: true,
            scalars: {
                String: 'string',
                Float: {
                    generator: 'double',
                    arguments: [-100, 0],
                },
                ID: {
                    generator: 'integer',
                    arguments: [1, 100],
                },
                Boolean: 'false',
                Int: {
                    generator: 'integer',
                    arguments: [-100, 0],
                },
                AnyObject: 'email',
            },
        });

        expect(result).toBeDefined();

        // String
        expect(result).toContain(
            "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : casual['string'],",
        );

        // Float
        expect(result).toContain(
            "flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : casual['double'](...[-100,0]),",
        );

        // ID
        expect(result).toContain(
            "id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : casual['integer'](...[1,100]),",
        );

        // Boolean
        expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

        // Int
        expect(result).toContain(
            "int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : casual['integer'](...[-100,0]),",
        );

        expect(result).toMatchSnapshot();
    });

    describe('with different input/output configurations', () => {
        it('should generate distinct custom scalars for native and custom input/output types', async () => {
            const result = await plugin(testSchema, [], {
                generateLibrary: 'casual',
                scalars: {
                    String: 'string',
                    Float: {
                        generator: 'double',
                        arguments: [-100, 0],
                    },
                    ID: {
                        generator: 'integer',
                        arguments: [1, 100],
                    },
                    Boolean: 'false',
                    Int: {
                        generator: 'integer',
                        arguments: [-100, 0],
                    },
                    AnyObject: {
                        input: 'string',
                        output: 'email',
                    },
                },
            });

            expect(result).toBeDefined();

            // String
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'ea corrupti qui incidunt eius consequatur blanditiis',",
            );

            // Float
            expect(result).toContain(
                "flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : -24.509902694262564,",
            );

            // ID
            expect(result).toContain("id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 82,");

            // Boolean
            expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

            // Int
            expect(result).toContain("int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : -93,");

            // AnyObject in type A (an email)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : 'Kelly_Cremin@Turcotte.biz',",
            );

            // AnyObject in input C (a string)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : 'itaque distinctio iure molestias voluptas reprehenderit quos',",
            );

            expect(result).toMatchSnapshot();
        });

        it('should generate distinct dynamic custom scalars for native and custom types', async () => {
            const result = await plugin(testSchema, [], {
                generateLibrary: 'casual',
                dynamicValues: true,
                scalars: {
                    String: 'string',
                    Float: {
                        generator: 'double',
                        arguments: [-100, 0],
                    },
                    ID: {
                        generator: 'integer',
                        arguments: [1, 100],
                    },
                    Boolean: 'false',
                    Int: {
                        generator: 'integer',
                        arguments: [-100, 0],
                    },
                    AnyObject: {
                        input: 'string',
                        output: 'email',
                    },
                },
            });

            expect(result).toBeDefined();

            // String
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : casual['string'],",
            );

            // Float
            expect(result).toContain(
                "flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : casual['double'](...[-100,0]),",
            );

            // ID
            expect(result).toContain(
                "id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : casual['integer'](...[1,100]),",
            );

            // Boolean
            expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

            // Int
            expect(result).toContain(
                "int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : casual['integer'](...[-100,0]),",
            );

            // AnyObject in type A (an email)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : casual['email'],",
            );

            // AnyObject in input C (an string)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : casual['string'],",
            );

            expect(result).toMatchSnapshot();
        });
    });
});

describe('custom scalar generation using faker', () => {
    it('should generate custom scalars for native and custom types', async () => {
        const result = await plugin(testSchema, [], {
            generateLibrary: 'faker',
            scalars: {
                String: 'lorem.sentence',
                Float: {
                    generator: 'number.float',
                    arguments: [{ min: -100, max: 0, fractionDigits: 2 }],
                },
                ID: {
                    generator: 'number.int',
                    arguments: [{ min: 1, max: 100 }],
                },
                Boolean: 'false',
                Int: {
                    generator: 'number.int',
                    arguments: [{ min: -100, max: 0 }],
                },
                AnyObject: 'internet.email',
            },
        });

        expect(result).toBeDefined();

        // String
        expect(result).toContain(
            "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'Depereo nulla calco blanditiis cornu defetiscor.',",
        );

        // Float
        expect(result).toContain("flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : -24.51,");

        // ID
        expect(result).toContain("id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 83,");

        // Boolean
        expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

        // Int
        expect(result).toContain("int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : -93,");

        expect(result).toMatchSnapshot();
    });

    it('should generate dynamic custom scalars for native and custom types', async () => {
        const result = await plugin(testSchema, [], {
            generateLibrary: 'faker',
            dynamicValues: true,
            scalars: {
                String: 'lorem.sentence',
                Float: {
                    generator: 'number.float',
                    arguments: [{ min: -100, max: 0 }],
                },
                ID: {
                    generator: 'number.int',
                    arguments: [{ min: 1, max: 100 }],
                },
                Boolean: 'false',
                Int: {
                    generator: 'number.int',
                    arguments: [{ min: -100, max: 0 }],
                },
                AnyObject: 'internet.email',
            },
        });

        expect(result).toBeDefined();

        // String
        expect(result).toContain(
            "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : faker['lorem']['sentence'](),",
        );

        // Float
        expect(result).toContain(
            "flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : faker['number']['float'](...[{\"min\":-100,\"max\":0}]),",
        );

        // ID
        expect(result).toContain(
            "id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : faker['number']['int'](...[{\"min\":1,\"max\":100}]),",
        );

        // Boolean
        expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

        // Int
        expect(result).toContain(
            "int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : faker['number']['int'](...[{\"min\":-100,\"max\":0}]),",
        );

        expect(result).toMatchSnapshot();
    });

    describe('with different input/output configurations', () => {
        it('should generate distinct custom scalars for native and custom input/output types', async () => {
            const result = await plugin(testSchema, [], {
                generateLibrary: 'faker',
                scalars: {
                    String: 'lorem.sentence',
                    Float: {
                        generator: 'number.float',
                        arguments: [{ min: -100, max: 0, fractionDigits: 2 }],
                    },
                    ID: {
                        generator: 'number.int',
                        arguments: [{ min: 1, max: 100 }],
                    },
                    Boolean: 'false',
                    Int: {
                        generator: 'number.int',
                        arguments: [{ min: -100, max: 0 }],
                    },
                    AnyObject: {
                        input: 'lorem.word',
                        output: 'internet.email',
                    },
                },
            });

            expect(result).toBeDefined();

            // String
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'Depereo nulla calco blanditiis cornu defetiscor.',",
            );

            // Float
            expect(result).toContain("flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : -24.51,");

            // ID
            expect(result).toContain("id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 83,");

            // Boolean
            expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

            // Int
            expect(result).toContain("int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : -93,");

            // AnyObject in type A (an email)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : 'Orlando_Cremin@gmail.com',",
            );

            // AnyObject in input C (a string)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : 'vilicus',",
            );

            expect(result).toMatchSnapshot();
        });

        it('should generate distinct dynamic custom scalars for native and custom types', async () => {
            const result = await plugin(testSchema, [], {
                generateLibrary: 'faker',
                dynamicValues: true,
                scalars: {
                    String: 'lorem.sentence',
                    Float: {
                        generator: 'number.float',
                        arguments: [{ min: -100, max: 0 }],
                    },
                    ID: {
                        generator: 'number.int',
                        arguments: [{ min: 1, max: 100 }],
                    },
                    Boolean: 'false',
                    Int: {
                        generator: 'number.int',
                        arguments: [{ min: -100, max: 0 }],
                    },
                    AnyObject: {
                        input: 'lorem.word',
                        output: 'internet.email',
                    },
                },
            });

            expect(result).toBeDefined();

            // String
            expect(result).toContain(
                "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : faker['lorem']['sentence'](),",
            );

            // Float
            expect(result).toContain(
                "flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : faker['number']['float'](...[{\"min\":-100,\"max\":0}]),",
            );

            // ID
            expect(result).toContain(
                "id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : faker['number']['int'](...[{\"min\":1,\"max\":100}]),",
            );

            // Boolean
            expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

            // Int
            expect(result).toContain(
                "int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : faker['number']['int'](...[{\"min\":-100,\"max\":0}]),",
            );

            // AnyObject in type A (an email)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : faker['internet']['email'](),",
            );

            // AnyObject in input C (a string)
            expect(result).toContain(
                "anyObject: overrides && overrides.hasOwnProperty('anyObject') ? overrides.anyObject! : faker['lorem']['word'](),",
            );

            expect(result).toMatchSnapshot();
        });
    });
});
