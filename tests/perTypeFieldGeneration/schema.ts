import { buildSchema } from 'graphql/index';

export default buildSchema(/* GraphQL */ `
    scalar Date
    scalar DateTime

    enum EnumExample {
        LOREM
        IPSUM
    }

    type A {
        id: ID!
        str: String!
        email: String!
        date: Date!
        overriddenDate: Date!
        dateTime: DateTime!
    }

    type B {
        id: ID!
        str: String!
        email: String!
        date: Date!
        overriddenDate: Date!
        dateTime: DateTime!
    }

    type C {
        id: ID!
        str: String!
        enum: EnumExample!
    }

    type D {
        nested: C!
    }
`);
