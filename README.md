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
}

type Query {
  user: User!
}
```

The code generated will look like:

```typescript
export const anAvatar = (overrides?: Partial<Avatar>): Avatar => {
  return {
    id: '1550ff93-cd31-49b4-bc38-ef1cb68bdc38',
    url: 'aliquid',
    ...overrides,
  };
};

export const aUser = (overrides?: Partial<User>): User => {
  return {
    id: 'b5756f00-51a6-422a-9a7d-c13ee6a63750',
    login: 'libero',
    avatar: anAvatar(),
    ...overrides,
  };
};
```

### Usage in tests

Those helper functions can be used in our unit tests:

```typescript
const user = aUser({ login: 'johndoe' });

// will create a user object with `login` property overridden to `johndoe`
```
