import { plugin } from '../../src';
import testSchema from './schema';

it.only('should support useTypeImports', async () => {
    const result = await plugin(testSchema, [], { typesFile: './types/graphql.ts', useTypeImports: true });

    expect(result).toBeDefined();
    expect(result).toContain(
        "import type { Avatar, User, WithAvatar, CamelCaseThing, PrefixedResponse, AbcType, ListType, UpdateUserInput, Mutation, Query, AbcStatus, Status, PrefixedEnum } from './types/graphql';",
    );
    expect(result).toMatchSnapshot();
});
