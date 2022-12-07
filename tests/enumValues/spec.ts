import { plugin } from '../../src';
import enumSchema from './schema';

describe('enumValues config', () => {
    describe(`having 'keep' value`, () => {
        it('should keep case', async () => {
            const result = await plugin(enumSchema, [], {
                enumValues: 'keep',
            });

            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum._id');
            expect(result).toContain('PascalCaseEnum.PascalCase');
            expect(result).toContain('CamelCaseEnum.camelCase');
            expect(result).toContain('SnakeCaseEnum.snake_case');
            expect(result).toContain('ScreamingSnakeCaseEnum.SCREAMING_SNAKE_CASE');
            expect(result).toMatchSnapshot();
        });

        it(`should have no effect if 'transformUnderscore' is false`, async () => {
            const result = await plugin(enumSchema, [], {
                enumValues: 'keep',
                transformUnderscore: false,
            });

            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum._id');
            expect(result).toContain('PascalCaseEnum.PascalCase');
            expect(result).toContain('CamelCaseEnum.camelCase');
            expect(result).toContain('SnakeCaseEnum.snake_case');
            expect(result).toContain('ScreamingSnakeCaseEnum.SCREAMING_SNAKE_CASE');
            expect(result).toMatchSnapshot();
        });
    });

    describe(`having default value`, () => {
        it('should update case in pascal case', async () => {
            const result = await plugin(enumSchema, [], {});

            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum.Id');
            expect(result).toContain('PascalCaseEnum.PascalCase');
            expect(result).toContain('CamelCaseEnum.CamelCase');
            expect(result).toContain('SnakeCaseEnum.SnakeCase');
            expect(result).toContain('ScreamingSnakeCaseEnum.ScreamingSnakeCase');
            expect(result).toMatchSnapshot();
        });

        it(`should keep underscores if 'transformUnderscore' is false`, async () => {
            const result = await plugin(enumSchema, [], {
                transformUnderscore: false,
            });

            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum._Id');
            expect(result).toContain('PascalCaseEnum.PascalCase');
            expect(result).toContain('CamelCaseEnum.CamelCase');
            expect(result).toContain('SnakeCaseEnum.Snake_Case');
            expect(result).toContain('ScreamingSnakeCaseEnum.Screaming_Snake_Case');
            expect(result).toMatchSnapshot();
        });
    });

    describe(`having 'change-case-all#pascalCase' value`, () => {
        it('should update case in pascal case', async () => {
            const result = await plugin(enumSchema, [], {
                enumValues: 'change-case-all#pascalCase',
            });

            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum.Id');
            expect(result).toContain('PascalCaseEnum.PascalCase');
            expect(result).toContain('CamelCaseEnum.CamelCase');
            expect(result).toContain('SnakeCaseEnum.SnakeCase');
            expect(result).toContain('ScreamingSnakeCaseEnum.ScreamingSnakeCase');
            expect(result).toMatchSnapshot();
        });

        it(`should keep underscores if 'transformUnderscore' is false`, async () => {
            const result = await plugin(enumSchema, [], {
                enumValues: 'change-case-all#pascalCase',
                transformUnderscore: false,
            });

            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum._Id');
            expect(result).toContain('PascalCaseEnum.PascalCase');
            expect(result).toContain('CamelCaseEnum.CamelCase');
            expect(result).toContain('SnakeCaseEnum.Snake_Case');
            expect(result).toContain('ScreamingSnakeCaseEnum.Screaming_Snake_Case');
            expect(result).toMatchSnapshot();
        });
    });

    describe(`having 'change-case-all#upperCase' value`, () => {
        it('should update case in upper case', async () => {
            const result = await plugin(enumSchema, [], {
                enumValues: 'change-case-all#upperCase',
            });

            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum._ID');
            expect(result).toContain('PascalCaseEnum.PASCALCASE');
            expect(result).toContain('CamelCaseEnum.CAMELCASE');
            expect(result).toContain('SnakeCaseEnum.SNAKE_CASE');
            expect(result).toContain('ScreamingSnakeCaseEnum.SCREAMING_SNAKE_CASE');
            expect(result).toMatchSnapshot();
        });

        it(`should keep underscores if 'transformUnderscore' is false`, async () => {
            const result = await plugin(enumSchema, [], {
                enumValues: 'change-case-all#upperCase',
                transformUnderscore: false,
            });

            expect(result).toBeDefined();
            expect(result).toBeDefined();
            expect(result).toContain('UnderscoreEnum._ID');
            expect(result).toContain('PascalCaseEnum.PASCALCASE');
            expect(result).toContain('CamelCaseEnum.CAMELCASE');
            expect(result).toContain('SnakeCaseEnum.SNAKE_CASE');
            expect(result).toContain('ScreamingSnakeCaseEnum.SCREAMING_SNAKE_CASE');
            expect(result).toMatchSnapshot();
        });
    });
});
