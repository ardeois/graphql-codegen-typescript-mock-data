import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    interface AConfig {
        configTypes: [configTypes!]!
    }

    enum configTypes {
        TEST
        TEST2
    }

    type A {
        id: ID!
        str: String!
        obj: B!
        config: AConfig!
    }

    type B {
        int: Int!
        flt: Float!
        bool: Boolean!
    }

    type TestAConfig implements AConfig {
        detectionTypes: [configTypes!]!
        active: Boolean!
    }

    type TestTwoAConfig implements AConfig {
        detectionTypes: [configTypes!]!
        username: String!
    }
`);
