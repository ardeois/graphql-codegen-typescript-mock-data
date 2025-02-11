import { plugin } from '../../src';
import testSchema from './schema';

it('should support useImplementingTypes', async () => {
    const result = await plugin(testSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        defaultNullableToNull: true,
    });

    expect(result).toBeDefined();

    expect(result).toContain(
        "field1: overrides && overrides.hasOwnProperty('field1') ? overrides.field1! : mockA() || mockB() || mockC() || mockD(),",
    );

    expect(result).toContain("field2: overrides && overrides.hasOwnProperty('field2') ? overrides.field2! : null,");

    expect(result).toMatchSnapshot();
});
