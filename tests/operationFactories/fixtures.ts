// tests/operationFactories/fixtures.ts
import { buildSchema, parse, Source } from 'graphql';
import { Types } from '@graphql-codegen/plugin-helpers';

export const opSchema = buildSchema(/* GraphQL */ `
    scalar Date

    enum Status {
        ACTIVE
        INACTIVE
    }

    interface Node {
        id: ID!
    }

    type User implements Node {
        id: ID!
        name: String!
        email: String!
        status: Status!
        avatar: Avatar
        friends: [User!]!
    }

    type Avatar {
        id: ID!
        url: String!
    }

    type Document implements Node {
        id: ID!
        title: String!
        url: String!
    }

    union SearchHit = User | Document

    type Query {
        user(id: ID!): User
        node(id: ID!): Node
        search(q: String!): [SearchHit!]!
        users: [User!]!
    }

    type Mutation {
        renameUser(id: ID!, name: String!): User!
    }

    type Subscription {
        userUpdated(id: ID!): User!
    }
`);

export const makeDocs = (sources: string[]): Types.DocumentFile[] =>
    sources.map((source, i) => {
        const location = `tests/operationFactories/fixtures.graphql#${i}`;
        return {
            document: parse(new Source(source, location)),
            location,
        };
    });
