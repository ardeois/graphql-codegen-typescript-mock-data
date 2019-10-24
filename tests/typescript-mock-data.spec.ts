import '@graphql-codegen/testing';

import { buildSchema, print } from 'graphql';
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
    }

    type Query {
        user: User!
    }
`);

it('can be called', async () => {
    await plugin(testSchema, [], { typesFile: './types/graphql.ts' });
});

it('should generate mock data functions', async () => {
    const result = await plugin(testSchema, [], { typesFile: './types/graphql.ts' });

    expect(result).toBeDefined();
    // @ts-ignore
    expect(result).toMatchSnapshot();
});
