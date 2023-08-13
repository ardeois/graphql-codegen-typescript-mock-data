import { faker } from '@faker-js/faker';
import casual from 'casual';
import { TypescriptMocksPluginConfig, plugin } from '../../src';
import testSchema from './schema';

it('should generate custom scalars for native and custom types using casual', async () => {
    const result = await plugin(testSchema, [], {
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

describe('choosing random generator using casual', () => {
    const config = {
        generateLibrary: 'casual',
        scalars: {
            String: ['string', 'word'],
        },
    } as TypescriptMocksPluginConfig;

    beforeEach(() => {
        jest.spyOn(casual, 'double').mockReturnValue(0.51);
    });

    afterEach(() => {
        jest.spyOn(casual, 'double').mockRestore();
    });

    fit('should generate random scalars using casual', async () => {
        const result = await plugin(testSchema, [], config);

        expect(result).toBeDefined();

        // String
        expect(result).toContain("str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'ea'");

        expect(result).toMatchSnapshot();
    });
});

it('should generate dynamic custom scalars for native and custom types using casual', async () => {
    const result = await plugin(testSchema, [], {
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
    expect(result).toContain("str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : casual['string'],");

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

describe('choosing random dynamic generator using casual', () => {
    const config = {
        generateLibrary: 'casual',
        defineWeightedChoice: true,
        dynamicValues: true,
        scalars: {
            ID: [
                {
                    generator: 'integer',
                    arguments: [101, 1000],
                },
                {
                    generator: 'integer',
                    arguments: [1, 100],
                    weight: 99,
                },
            ],
        },
    } as TypescriptMocksPluginConfig;

    beforeEach(() => {
        jest.spyOn(casual, 'double').mockReturnValue(0.02);
    });

    afterEach(() => {
        jest.spyOn(casual, 'double').mockRestore();
    });

    it('should generate random scalars using casual', async () => {
        const result = await plugin(testSchema, [], config);

        expect(result).toBeDefined();

        // String
        expect(result).toContain(
            "id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : [() => casual['integer'](...[101,1000]), () => casual['integer'](...[1,100])][weightedChoice([1,99], () => casual.double(0, 1.0))]()",
        );

        expect(result).toMatchSnapshot();
    });
});

it('should generate custom scalars for native and custom types using faker', async () => {
    const result = await plugin(testSchema, [], {
        generateLibrary: 'faker',
        scalars: {
            String: 'lorem.sentence',
            Float: {
                generator: 'datatype.float',
                arguments: [{ min: -100, max: 0 }],
            },
            ID: {
                generator: 'datatype.number',
                arguments: [{ min: 1, max: 100 }],
            },
            Boolean: 'false',
            Int: {
                generator: 'datatype.number',
                arguments: [{ min: -100, max: 0 }],
            },
            AnyObject: 'internet.email',
        },
    });

    expect(result).toBeDefined();

    // String
    expect(result).toContain(
        "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'Corrupti qui incidunt eius consequatur qui.',",
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

describe('choosing random generator using faker', () => {
    const config = {
        generateLibrary: 'faker',
        scalars: {
            String: ['lorem.sentence', 'lorem.words'],
        },
    } as TypescriptMocksPluginConfig;

    beforeEach(() => {
        jest.spyOn(faker.datatype, 'float').mockReturnValue(0.51);
    });

    afterEach(() => {
        jest.spyOn(faker.datatype, 'float').mockRestore();
    });

    it('should generate random scalars using faker', async () => {
        const result = await plugin(testSchema, [], config);

        expect(result).toBeDefined();

        // String
        expect(result).toContain(
            "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'quas accusamus eos',",
        );

        expect(result).toMatchSnapshot();
    });
});

it('should generate dynamic custom scalars for native and custom types using faker', async () => {
    const result = await plugin(testSchema, [], {
        generateLibrary: 'faker',
        dynamicValues: true,
        scalars: {
            String: 'lorem.sentence',
            Float: {
                generator: 'datatype.float',
                arguments: [{ min: -100, max: 0 }],
            },
            ID: {
                generator: 'datatype.number',
                arguments: [{ min: 1, max: 100 }],
            },
            Boolean: 'false',
            Int: {
                generator: 'datatype.number',
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
        "flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : faker['datatype']['float'](...[{\"min\":-100,\"max\":0}]),",
    );

    // ID
    expect(result).toContain(
        "id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : faker['datatype']['number'](...[{\"min\":1,\"max\":100}]),",
    );

    // Boolean
    expect(result).toContain("bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : false");

    // Int
    expect(result).toContain(
        "int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : faker['datatype']['number'](...[{\"min\":-100,\"max\":0}]),",
    );

    expect(result).toMatchSnapshot();
});

describe('choosing random dynamic generator using faker', () => {
    const config = {
        generateLibrary: 'faker',
        defineWeightedChoice: true,
        dynamicValues: true,
        scalars: {
            String: [
                {
                    generator: 'lorem.sentence',
                    arguments: [3],
                },
                {
                    generator: 'lorem.words',
                    arguments: [3],
                    weight: 99,
                },
            ],
        },
    } as TypescriptMocksPluginConfig;

    beforeEach(() => {
        jest.spyOn(faker.datatype, 'float').mockReturnValue(0.02);
    });

    afterEach(() => {
        jest.spyOn(faker.datatype, 'float').mockRestore();
    });

    it('should generate random scalars using faker', async () => {
        const result = await plugin(testSchema, [], config);

        expect(result).toBeDefined();

        // String
        expect(result).toContain(
            "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : [() => faker['lorem']['sentence'](...[3]), () => faker['lorem']['words'](...[3])][weightedChoice([1,99], () => faker.datatype.float({ max: 1.0 }))]()",
        );

        expect(result).toMatchSnapshot();
    });
});
