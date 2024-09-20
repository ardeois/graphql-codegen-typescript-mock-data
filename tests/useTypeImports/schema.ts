import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    scalar Date
    scalar AnyObject

    type Avatar {
        id: ID!
        url: String!
    }

    type User implements WithAvatar {
        id: ID!
        creationDate: Date!
        login: String!
        avatar: Avatar
        status: Status!
        customStatus: ABCStatus
        scalarValue: AnyObject!
        camelCaseThing: camelCaseThing
        unionThing: UnionThing
        prefixedEnum: Prefixed_Enum
    }

    type Partial {
        id: ID!
    }

    interface WithAvatar {
        id: ID!
        avatar: Avatar
    }

    type camelCaseThing {
        id: ID!
    }

    type Prefixed_Response {
        ping: String!
    }

    type ABCType {
        abc: String!
    }

    type ListType {
        stringList: [String!]!
        nullableStringList: [String!]
    }

    input UpdateUserInput {
        id: ID!
        login: String
        avatar: Avatar
    }

    enum ABCStatus {
        hasXYZStatus
    }

    enum Status {
        ONLINE
        OFFLINE
    }

    enum Prefixed_Enum {
        PREFIXED_VALUE
    }

    union UnionThing = Avatar | camelCaseThing

    type Mutation {
        updateUser(user: UpdateUserInput): User
    }

    type Query {
        user: User!
        prefixed_query: Prefixed_Response!
    }
`);
