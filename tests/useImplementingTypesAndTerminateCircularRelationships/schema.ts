import { buildSchema } from 'graphql';

export default buildSchema(/* GraphQL */ `
    type Query {
        getUser(id: String!): User
    }

    type User {
        id: String!
        events: [Event!]
    }

    interface Event {
        startDate: String
        endDate: String
        timeZone: String
    }

    type MeetingEvent implements Event {
        endDate: String
        startDate: String
        timeZone: String
        event: Event!
    }

    type OtherEvent implements Event {
        endDate: String
        startDate: String
        timeZone: String
        somethingElse: String!
    }
`);
