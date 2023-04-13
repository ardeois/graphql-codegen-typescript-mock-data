import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    interface AConfig {
        testTypes: [testObj!]!
    }

    interface Field {
        testTypes: [testObj!]!
    }

    interface Action {
        action: [testObj!]!
    }

    enum testObj {
        TEST
        TEST2
    }

    type A {
        id: ID!
        str: String!
        obj: B!
        config: AConfig!
        configArray: [AConfig!]!
        field: Field!
        action: Action!
    }

    type B {
        int: Int!
        flt: Float!
        bool: Boolean!
    }

    type TestAConfig implements AConfig {
        testTypes: [testObj!]!
        active: Boolean!
    }

    type TestTwoAConfig implements AConfig & Field {
        testTypes: [testObj!]!
        username: String!
    }

    type TestAction implements Action {
        action: [testObj!]!
        createdAt: String!
    }
`);
