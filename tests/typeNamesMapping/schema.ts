import { buildSchema } from 'graphql/index';

export default buildSchema(/* GraphQL */ `
    enum EnumExample {
        LOREM
        IPSUM
    }

    type A {
        id: ID!
        str: String!
        email: String!
    }

    type B {
        id: ID!
        str: String!
        email: String!
    }

    type C {
        id: ID!
        str: String!
        enum: EnumExample!
        D: D!
    }

    type D {
        nested: C!
    }
`);
