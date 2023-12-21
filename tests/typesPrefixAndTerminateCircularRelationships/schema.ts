import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    type A {
        b: B!
    }
    type B {
        a: A!
    }
`);
