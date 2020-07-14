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

### prefix (`string`, defaultValue: `a` for constants & `an` for vowels)

The prefix to add to the mock function name. Cannot be empty since it will clash with the associated
typescript definition from `@graphql-codegen/typescript`

### enumValues (`string`, defaultValue: `pascal-case#pascalCase`)

Changes the case of the enums. Accepts `upper-case#upperCase`, `pascal-case#pascalCase` or `keep`

### typenames (`string`, defaultValue: `pascal-case#pascalCase`)

Changes the case of the enums. Accepts `upper-case#upperCase`, `pascal-case#pascalCase` or `keep`

### scalars (`{ [Scalar: string]: keyof Casual.Casual | Casual.functions }`, defaultValue: `undefined`)

Allows you to define mappings for your custom scalars. Allows you to map any GraphQL Scalar to a
 [casual](https://github.com/boo1ean/casual#embedded-generators) embedded generator (string or
 function key)

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
          enumValues: upper-case#upperCase
          typenames: keep
          scalars:
            AWSTimestamp: unix_time # gets translated to casual.unix_time
```

## Example or generated code

Given the following schema:

```graphql
scalar AWSTimestamp

type Avatar {
  id: ID!
  url: String!
}

type User {
  id: ID!
  login: String!
  avatar: Avatar
  status: Status!
  updatedAt: AWSTimestamp
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
    id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '0550ff93-dd31-49b4-8c38-ff1cb68bdc38',
    url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'aliquid',
  };
};

export const aUpdateUserInput = (overrides?: Partial<UpdateUserInput>): UpdateUserInput => {
  return {
    id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '1d6a9360-c92b-4660-8e5f-04155047bddc',
    login: overrides && overrides.hasOwnProperty('login') ? overrides.login! : 'qui',
    avatar: overrides && overrides.hasOwnProperty('avatar') ? overrides.avatar! : anAvatar(),
  };
};

export const aUser = (overrides?: Partial<User>): User => {
  return {
    id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'a5756f00-41a6-422a-8a7d-d13ee6a63750',
    login: overrides && overrides.hasOwnProperty('login') ? overrides.login! : 'libero',
    avatar: overrides && overrides.hasOwnProperty('avatar') ? overrides.avatar! : anAvatar(),
    status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : Status.Online,
    updatedAt: overrides && overrides.hasOwnProperty('updatedAt') ? overrides.updatedAt! : 1458071232,
  };
};
```

### Usage in tests

Those helper functions can be used in our unit tests:

```typescript
const user = aUser({ login: 'johndoe' });

// will create a user object with `login` property overridden to `johndoe`
```

### Contributing

Feel free to open issues and pull requests. We always welcome support from the community.

To run this project locally:

- Use Node >= 10
- Make sure that you have the latest Yarn version (https://yarnpkg.com/lang/en/docs/install/)
- Clone this repo using `git clone`
- Run `yarn`
- Run `yarn build` to build the package
- Run `yarn test` to make sure everything works

### License

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollostack/apollo-ios/master/LICENSE)

MIT
