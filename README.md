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

### terminateCircularRelationships (`boolean`, defaultValue: `false`)

When enabled, prevents circular relationships from triggering infinite recursion. After the first resolution of a
specific type in a particular call stack, subsequent resolutions will return an empty object cast to the correct type.

### prefix (`string`, defaultValue: `a` for constants & `an` for vowels)

The prefix to add to the mock function name. Cannot be empty since it will clash with the associated
typescript definition from `@graphql-codegen/typescript`

### listElementCount (`number`, defaultValue: `1`)

How many elements should be generated for lists. For example, with `listElementCount: 3` a schema field `names: [String!]!` would generate `3` names in each mock.

### enumValues (`string`, defaultValue: `pascal-case#pascalCase`)

Changes the case of the enums. Accepts `upper-case#upperCase`, `pascal-case#pascalCase` or `keep`

### typenames (`string`, defaultValue: `pascal-case#pascalCase`)

Changes the case of the enums. Accepts `upper-case#upperCase`, `pascal-case#pascalCase` or `keep`

### scalars (`{ [Scalar: string]: ScalarDefinition }`, defaultValue: `undefined`)

Allows you to define mappings for your custom scalars. Allows you to map any GraphQL Scalar to a
[casual](https://github.com/boo1ean/casual#embedded-generators) embedded generator (string or
function key) with optional arguments

Examples
**With arguments**

```
plugins:
  - typescript-mock-data:
      scalars:
        Date: # gets translated to casual.date('YYYY-MM-DD')
          generator: date
          arguments: 'YYYY-MM-DD'
```

**With multiple arguments**

```
plugins:
  - typescript-mock-data:
      scalars:
        PaginatedAmount: # gets translated to casual.integer(-100, 100)
          generator: integer
          arguments:
            - -100
            - 100
```

**Shorthand if you don't have arguments**

```
plugins:
  - typescript-mock-data:
      scalars:
        Date: date # gets translated to casual.date()
```

**Custom value generator**

```yaml
plugins:
  - add: "import { arrayBufferGenerator } from '../generators';"
  - typescript-mock-data:
      scalars:
        ArrayBuffer: arrayBufferGenerator()
```

### typesPrefix (`string`, defaultValue: '')

Useful if you have globally exported types under a certain namespace.
e.g If the types file is something like this

```
declare namespace Api {
 type User {
  ...
 }
}
```

Setting the `typesPrefix` to `Api.` will create the following mock data

```
export const aUser = (overrides?: Partial<Api.User>): Api.User => {
```

### enumsPrefix (`string`, defaultValue: '')

Similar to `typesPrefix`, but for enum types

```
declare namespace Api {
 enum Status {
  ...
 }
}
```

Setting the `enumsPrefix` to `Api.` will create the following mock data

```
export const aUser = (overrides?: Partial<User>): User => {
   status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : Api.Status.Online,
}
```

### transformUnderscore (`boolean`, defaultValue: `true`)

When disabled, underscores will be retained for type names when the case is changed. It has no effect if `typenames` is set to `keep`.

### dynamicValues (`boolean`, defaultValue: `false`)

When enabled, values will be generated dynamically when the mock function is called rather than statically when the mock function is generated. The values are generated consistently from a [faker seed](https://github.com/faker-js/faker#%EF%B8%8F-setting-a-randomness-seed) that can be manually configured using the generated `seedMocks(seed: number)` function, as shown in [this test](https://github.com/JimmyPaolini/graphql-codegen-typescript-mock-data/blob/dynamic-mode/tests/dynamicValues/spec.ts#L13).

## Examples of usage

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
      - typescript-mock-data:
          typesFile: '../generated-types.ts'
          enumValues: upper-case#upperCase
          typenames: keep
          scalars:
            AWSTimestamp: unix_time # gets translated to casual.unix_time
```

### With `eslint-disable` rule

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
      - add:
          content: '/* eslint-disable @typescript-eslint/no-use-before-define,@typescript-eslint/no-unused-vars,no-prototype-builtins */'
      - typescript-mock-data:
          typesFile: '../generated-types.ts'
          enumValues: upper-case#upperCase
          typenames: keep
          scalars:
            AWSTimestamp: unix_time # gets translated to casual.unix_time
```

## Example of generated code

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

export const anUpdateUserInput = (overrides?: Partial<UpdateUserInput>): UpdateUserInput => {
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

### Dealing with Timezone

If some properties use generated dates, the result could different depending on the timezone of your machine.

To force a timezone, you can set environment variable `TZ`:

```bash
TZ=UTC graphql-codegen
```

This will force the timezone to `UTC`, whatever the timezone of your machine or CI

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

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/ardeois/graphql-codegen-typescript-mock-data/master/LICENSE)

MIT
