import { plugin } from '../../src';
import testSchema from './schema';

it('should support useImplementingTypes', async () => {
    const result = await plugin(testSchema, [], { prefix: 'mock', useImplementingTypes: true });

    expect(result).toBeDefined();

    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : mockTestAConfig() || mockTestTwoAConfig(),",
    );

    expect(result).toContain(
        "configArray: overrides && overrides.hasOwnProperty('configArray') ? overrides.configArray! : [mockTestAConfig() || mockTestTwoAConfig()],",
    );

    expect(result).toContain(
        "field: overrides && overrides.hasOwnProperty('field') ? overrides.field! : mockTestTwoAConfig(),",
    );

    expect(result).toContain(
        "action: overrides && overrides.hasOwnProperty('action') ? overrides.action! : mockTestAction(),",
    );
    expect(result).toMatchSnapshot();
});

it(`shouldn't support useImplementingTypes`, async () => {
    const result = await plugin(testSchema, [], { prefix: 'mock' });

    expect(result).toBeDefined();

    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : mockAConfig(),",
    );

    expect(result).toMatchSnapshot();
});

it(`support useImplementingTypes with fieldGeneration prop`, async () => {
    let result = await plugin(testSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        fieldGeneration: {
            A: { str: 'internet.email' },
        },
    });
    expect(result).toBeDefined();

    expect(result).toContain(
        "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'Jeanie.Fay45@yahoo.com'",
    );

    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : mockTestAConfig() || mockTestTwoAConfig(),",
    );

    result = await plugin(testSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        fieldGeneration: {
            A: { config: 'internet.email' },
        },
    });
    expect(result).toBeDefined();

    expect(result).toContain("str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'cuius'");

    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : 'Kian.Keeling70@gmail.com',",
    );

    expect(result).toMatchSnapshot();
});
