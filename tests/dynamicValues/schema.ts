import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    type A {
        id: ID!
        str: String!
        obj: B!
    }

    type B {
        int: Int!
        flt: Float!
        bool: Boolean!
    }
`);
