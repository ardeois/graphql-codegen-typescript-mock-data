import { plugin } from '../../src';
import testSchema from './schema';

it('should generate custom scalars for native and custom types', async () => {
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
