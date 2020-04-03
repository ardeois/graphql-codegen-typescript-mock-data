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

    input UpdateUserInput {
        id: ID!
        login: String
        avatar: Avatar
    }

    enum Status {
        ONLINE
        OFFLINE
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
    expect(result).toContain("import { Avatar, UpdateUserInput, User, Status } from './types/graphql';");
    expect(result).toMatchSnapshot();
});

it('should generate mock data with typename if addTypename is true', async () => {
    const result = await plugin(testSchema, [], { typesFile: './types/graphql.ts', addTypename: true });

    expect(result).toBeDefined();
    expect(result).toContain("import { Avatar, UpdateUserInput, User, Status } from './types/graphql';");
    expect(result).toMatchSnapshot();
});

it('should generate mock data with pascalCase enum if enumValues is "pascal-case#pascalCase"', async () => {
    const result = await plugin(testSchema, [], {
        enumValues: 'pascal-case#pascalCase',
        typesFile: './types/graphql.ts',
    });

    expect(result).toBeDefined();
    expect(result).toContain("import { Avatar, UpdateUserInput, User, Status } from './types/graphql';");
    expect(result).toMatchSnapshot();
});
