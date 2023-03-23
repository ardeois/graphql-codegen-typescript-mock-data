import { plugin } from '../../src';
import testSchema from './schema';

it('should support useImplementingTypes', async () => {
    const result = await plugin(testSchema, [], { prefix: 'mock', useImplementingTypes: true });

    expect(result).toBeDefined();
    // Boolean
    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : mockTestAConfig() || mockTestTwoAConfig(),",
    );

    expect(result).toMatchSnapshot();
});

it(`shouldn't support useImplementingTypes`, async () => {
    const result = await plugin(testSchema, [], { prefix: 'mock' });

    expect(result).toBeDefined();
    // Boolean
    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : mockAConfig(),",
    );

    expect(result).toMatchSnapshot();
});

it(`shouldn't support useImplementingTypes with fieldGeneration prop`, async () => {
    const result = await plugin(testSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        fieldGeneration: {
            A: { config: 'email' },
        },
    });
    expect(result).toBeDefined();
    // Boolean
    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : 'Karelle_Kassulke@Carolyne.io'",
    );

    expect(result).toMatchSnapshot();
});
