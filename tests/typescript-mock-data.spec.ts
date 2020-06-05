import '@graphql-codegen/testing';

import { buildSchema } from 'graphql';
import { plugin } from '../src';

const testSchema = buildSchema(/* GraphQL */ `
    type Avatar {
        id: ID!
        url: String!
    }

    type User {
        id: ID!
        login: String!
        avatar: Avatar
        status: Status!
    }

    type Query {
        user: User!
    }

    type ABCType {
        abc: String!
    }

    input UpdateUserInput {
        id: ID!
        login: String
        avatar: Avatar
    }

    enum Status {
        ONLINE
        OFFLINE
        isAFK
    }

    type Mutation {
        updateUser(user: UpdateUserInput): User
    }
`);

it('can be called', async () => {
    await plugin(testSchema, [], { typesFile: './types/graphql.ts' });
});

it('should generate mock data functions', async () => {
    const result = await plugin(testSchema, [], {});

    expect(result).toBeDefined();
    expect(result).toMatchSnapshot();
});

it('should generate mock data functions with external types file import', async () => {
    const result = await plugin(testSchema, [], { typesFile: './types/graphql.ts' });

    expect(result).toBeDefined();
    expect(result).toContain("import { ABCType, Avatar, UpdateUserInput, User, Status } from './types/graphql';");
    expect(result).toMatchSnapshot();
});

it('should generate mock data with typename if addTypename is true', async () => {
    const result = await plugin(testSchema, [], { typesFile: './types/graphql.ts', addTypename: true });

    expect(result).toBeDefined();
    expect(result).toContain("import { ABCType, Avatar, UpdateUserInput, User, Status } from './types/graphql';");
    expect(result).toMatchSnapshot();
});

it('should generate mock data with pascalCase enum if enumValues is "pascal-case#pascalCase"', async () => {
    const result = await plugin(testSchema, [], {
        enumValues: 'pascal-case#pascalCase',
        typesFile: './types/graphql.ts',
    });

    expect(result).toBeDefined();
    expect(result).toContain("import { ABCType, Avatar, UpdateUserInput, User, Status } from './types/graphql';");
    expect(result).toMatchSnapshot();
});

it('should generate mock data with upperCase enum if enumValues is "upper-case#upperCase"', async () => {
    const result = await plugin(testSchema, [], {
        enumValues: 'upper-case#upperCase',
        typesFile: './types/graphql.ts',
    });

    expect(result).toBeDefined();
    expect(result).toContain("import { ABCType, Avatar, UpdateUserInput, User, Status } from './types/graphql';");
    expect(result).toMatchSnapshot();
});

it('should generate mock data with as-is enum if enumValues is "keep"', async () => {
    const result = await plugin(testSchema, [], {
        enumValues: 'keep',
    });

    expect(result).toBeDefined();
    expect(result).toContain('isAFK');
    expect(result).not.toContain('isAfK');
    expect(result).not.toContain('ISAFK');
});

it('should generate mock data with pascalCase types by default', async () => {
    const result = await plugin(testSchema, [], {});

    expect(result).toBeDefined();
    expect(result).toContain('AbcType');
    expect(result).not.toContain('ABCType');
    expect(result).not.toContain('ABCTYPE');
});

it('should generate mock data with upperCase types if typenames is "upper-case#upperCase"', async () => {
    const result = await plugin(testSchema, [], {
        typenames: 'upper-case#upperCase',
    });

    expect(result).toBeDefined();
    expect(result).toContain('ABCTYPE');
    expect(result).not.toContain('AbcType');
    expect(result).not.toContain('ABCType');
});

it('should generate mock data with as-is types if typenames is "keep"', async () => {
    const result = await plugin(testSchema, [], {
        typenames: 'keep',
    });

    expect(result).toBeDefined();
    expect(result).toContain('ABCType');
    expect(result).not.toContain('AbcType');
    expect(result).not.toContain('ABCTYPE');
});
