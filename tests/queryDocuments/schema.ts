import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    type Query {
        A: A
        B: B
    }
    type A {
        obj1: B!
        obj2: B!
    }
    type B {
        b1: String!
        b2: String!
        b3: String!
    }
`);
