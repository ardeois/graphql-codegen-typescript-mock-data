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
            A: { str: 'email' },
        },
    });
    expect(result).toBeDefined();

    expect(result).toContain(
        "str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'Krystel.Farrell@Frederique.biz'",
    );

    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : mockTestAConfig() || mockTestTwoAConfig(),",
    );

    result = await plugin(testSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        fieldGeneration: {
            A: { config: 'email' },
        },
    });
    expect(result).toBeDefined();

    expect(result).toContain("str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : 'ea'");

    expect(result).toContain(
        "config: overrides && overrides.hasOwnProperty('config') ? overrides.config! : 'Karelle_Kassulke@Carolyne.io',",
    );

    expect(result).toMatchSnapshot();
});
