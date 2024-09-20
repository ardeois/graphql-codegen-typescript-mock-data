import { plugin } from '../../src';
import testSchema from './schema';

it('should support typeNamesMapping', async () => {
    const result = await plugin(testSchema, [], {
        typesFile: './types/graphql.ts',
        typeNamesMapping: { A: 'RenamedAType' },
    });

    expect(result).toBeDefined();
    expect(result).toContain("import { A as RenamedAType, B, C, D, EnumExample } from './types/graphql';");
});

it('should support typeNamesMapping with circular relationships', async () => {
    const result = await plugin(testSchema, [], {
        typesFile: './types/graphql.ts',
        typeNamesMapping: { D: 'RenamedDType' },
        terminateCircularRelationships: 'immediate',
    });

    expect(result).toBeDefined();
    expect(result).toContain("import { A, B, C, D as RenamedDType, EnumExample } from './types/graphql';");
    expect(result).toContain(
        "D: overrides && overrides.hasOwnProperty('D') ? overrides.D! : relationshipsToOmit.has('D') ? {} as DAsRenamedDType : aD({}, relationshipsToOmit),",
    );
});

it('should not support typeNamesMapping when enum type is given', async () => {
    const result = await plugin(testSchema, [], {
        typesFile: './types/graphql.ts',
        typeNamesMapping: { EnumExample: 'RenamedEnum' },
    });

    expect(result).toBeDefined();
    expect(result).toContain("import { A, B, C, D, EnumExample } from './types/graphql';");
});
