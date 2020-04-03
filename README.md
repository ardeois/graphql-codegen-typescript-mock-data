# graphql-codegen-typescript-mock-data

## Description

[GraphQL Codegen Plugin](https://github.com/dotansimha/graphql-code-generator) for building mock data based on the schema.

## Installation

`yarn add -D graphql-codegen-typescript-mock-data`

## Configuration

### typesFile (`string`, defaultValue: `null`)

Defines the file path containing all GraphQL types. This file can also be generated through graphql-codgen

### addTypename (`boolean`, defaultValue: `false`)

Adds `__typename` property to mock data

### enumValues (`string`, defaultValue: `upper-case#upperCase`)

Change the case of the enums. Accept `upper-case#upperCase` or `pascal-case#pascalCase`

## Example of usage

**codegen.yml**

```yaml
overwrite: true
schema: schema.graphql
generates:
  src/generated-types.ts:
    plugins:
      - 'typescript'
  src/mocks/generated-mocks.ts:
    plugins:
      - 'graphql-codegen-typescript-mock-data':
          typesFile: '../generated-types.ts'
          enumValues: pascal-case#pascalCase
```

## Example or generated code

Given the following schema:

```graphql
type Avatar {
    id: ID!
    url: String!
}

type User {
    id: ID!
    login: String!
    avatar: Avatar
    status: Status!
}

type Query {
    user: User!
}

input UpdateUserInput {
    id: ID!
    login: String
    avatar: Avatar
}

enum Status {
    ONLINE
    OFFLINE
}

type Mutation {
    updateUser(user: UpdateUserInput): User
}
```

The code generated will look like:

```typescript
export const anAvatar = (overrides?: Partial<Avatar>): Avatar => {
    return {
        get id() { return overrides && 'id' in overrides ? overrides.id! : '0550ff93-dd31-49b4-8c38-ff1cb68bdc38'},
        get url() { return overrides && 'url' in overrides ? overrides.url! : 'aliquid'},
    };
};

export const aUpdateUserInput = (overrides?: Partial<UpdateUserInput>): UpdateUserInput => {
    return {
        get id() { return overrides && 'id' in overrides ? overrides.id! : '1d6a9360-c92b-4660-8e5f-04155047bddc'},
        get login() { return overrides && 'login' in overrides ? overrides.login! : 'qui'},
        get avatar() { return overrides && 'avatar' in overrides ? overrides.avatar! : anAvatar()},
    };
};

export const aUser = (overrides?: Partial<User>): User => {
    return {
        get id() { return overrides && 'id' in overrides ? overrides.id! : 'a5756f00-41a6-422a-8a7d-d13ee6a63750'},
        get login() { return overrides && 'login' in overrides ? overrides.login! : 'libero'},
        get avatar() { return overrides && 'avatar' in overrides ? overrides.avatar! : anAvatar()},
        get status() { return overrides && 'status' in overrides ? overrides.status! : Status.ONLINE},
    };
};
```

### Usage in tests

Those helper functions can be used in our unit tests:

```typescript
const user = aUser({ login: 'johndoe' });

// will create a user object with `login` property overridden to `johndoe`
```
