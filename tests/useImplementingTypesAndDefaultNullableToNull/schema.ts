import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    interface Root {
        id: ID
    }

    type A implements Root {
        id: ID
    }

    type B implements Root {
        id: ID
    }

    type C implements Root {
        id: ID
    }

    type D implements Root {
        id: ID
    }

    type Test {
        field1: Root!
        field2: Root
    }
`);
