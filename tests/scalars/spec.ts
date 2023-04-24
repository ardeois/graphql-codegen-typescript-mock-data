import { plugin } from '../../src';
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
    expect(result).toContain("str: 'ea corrupti qui incidunt eius consequatur blanditiis',");

    // Float
    expect(result).toContain('flt: -24.509902694262564,');

    // ID
    expect(result).toContain('id: 82,');

    // Boolean
    expect(result).toContain('bool: false');

    // Int
    expect(result).toContain('int: -93,');

    expect(result).toMatchSnapshot();
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
    expect(result).toContain("str: casual['string'],");

    // Float
    expect(result).toContain("flt: casual['double'](...[-100,0]),");

    // ID
    expect(result).toContain("id: casual['integer'](...[1,100]),");

    // Boolean
    expect(result).toContain('bool: false');

    // Int
    expect(result).toContain("int: casual['integer'](...[-100,0]),");

    expect(result).toMatchSnapshot();
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
    expect(result).toContain("str: 'Corrupti qui incidunt eius consequatur qui.',");

    // Float
    expect(result).toContain('flt: -24.51,');

    // ID
    expect(result).toContain('id: 83,');

    // Boolean
    expect(result).toContain('bool: false');

    // Int
    expect(result).toContain('int: -93,');

    expect(result).toMatchSnapshot();
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
    expect(result).toContain("str: faker['lorem']['sentence'](),");

    // Float
    expect(result).toContain('flt: faker[\'datatype\'][\'float\'](...[{"min":-100,"max":0}]),');

    // ID
    expect(result).toContain('id: faker[\'datatype\'][\'number\'](...[{"min":1,"max":100}]),');

    // Boolean
    expect(result).toContain('bool: false');

    // Int
    expect(result).toContain('int: faker[\'datatype\'][\'number\'](...[{"min":-100,"max":0}]),');

    expect(result).toMatchSnapshot();
});
