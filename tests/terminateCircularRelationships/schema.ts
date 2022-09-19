import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    type A {
        B: B!
        C: C!
    }
    type B {
        A: A!
    }
    type C {
        aCollection: [A!]!
    }
    type D {
        A: A!
        B: B!
    }
`);
