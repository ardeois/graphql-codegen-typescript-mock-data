import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    scalar AnyObject

    type A {
        id: ID!
        str: String!
        obj: B!
        anyObject: AnyObject!
    }

    type B {
        int: Int!
        flt: Float!
        bool: Boolean!
    }

    input C {
        anyObject: AnyObject!
    }
`);
