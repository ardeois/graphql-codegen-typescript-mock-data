import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    type Query {
        getData(id: String!): Container
    }

    type Container {
        id: String!
        dataItem: DataItem!
    }

    interface DataItem {
        name: String
    }

    type TypeA implements DataItem {
        name: String
        fieldA: String
    }

    type TypeB implements DataItem {
        name: String
        fieldB: String
    }

    type TypeC implements DataItem {
        name: String
        fieldC: String
    }
`);
