import '@graphql-codegen/testing';

import { buildSchema } from 'graphql';
import { plugin } from '../src';

const testSchema = buildSchema(/* GraphQL */ `
    scalar Date
    scalar AnyObject

    type Avatar {
        id: ID!
        url: String!
    }

    type User {
        id: ID!
        creationDate: Date!
        login: String!
        avatar: Avatar
        status: Status!
        customStatus: ABCStatus
        scalarValue: AnyObject!
    }

    type Query {
        user: User!
    }

    type ABCType {
        abc: String!
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

    enum ABCStatus {
        hasXYZStatus
    }

    type Mutation {
        updateUser(user: UpdateUserInput): User
    }
`);

it('can be called', async () => {
    await plugin(testSchema, [], { typesFile: './types/graphql.ts' });
});

it('should generate mock data functions', async () => {
    const result = await plugin(testSchema, [], {});

    expect(result).toBeDefined();
    expect(result).toMatchSnapshot();
});

it('should generate mock data functions with scalars', async () => {
    const result = await plugin(testSchema, [], {});

    expect(result).toBeDefined();
    expect(result).toContain(
        "scalarValue: overrides && overrides.hasOwnProperty('scalarValue') ? overrides.scalarValue! : 'neque',",
    );
    expect(result).toMatchSnapshot();
});

it('should generate mock data functions with external types file import', async () => {
    const result = await plugin(testSchema, [], { typesFile: './types/graphql.ts' });

    expect(result).toBeDefined();
    expect(result).toContain(
        "import { ABCType, Avatar, UpdateUserInput, User, ABCStatus, Status } from './types/graphql';",
    );
    expect(result).toMatchSnapshot();
});

it('should generate mock data with typename if addTypename is true', async () => {
    const result = await plugin(testSchema, [], { addTypename: true });

    expect(result).toBeDefined();
    expect(result).toContain('__typename');
    expect(result).toMatchSnapshot();
});

it('should generate mock data with pascalCase enum values by default', async () => {
    const result = await plugin(testSchema, [], {});

    expect(result).toBeDefined();
    expect(result).toContain('HasXyzStatus');
    expect(result).not.toContain('hasXYZStatus');
    expect(result).not.toContain('HASXYZSTATUS');
    expect(result).toMatchSnapshot();
});

it('should generate mock data with pascalCase enum values if enumValues is "pascal-case#pascalCase"', async () => {
    const result = await plugin(testSchema, [], { enumValues: 'pascal-case#pascalCase' });

    expect(result).toBeDefined();
    expect(result).toContain('HasXyzStatus');
    expect(result).not.toContain('hasXYZStatus');
    expect(result).not.toContain('HASXYZSTATUS');
    expect(result).toMatchSnapshot();
});

it('should generate mock data with upperCase enum values if enumValues is "upper-case#upperCase"', async () => {
    const result = await plugin(testSchema, [], { enumValues: 'upper-case#upperCase' });

    expect(result).toBeDefined();
    expect(result).not.toContain('HasXyzStatus');
    expect(result).not.toContain('hasXYZStatus');
    expect(result).toContain('HASXYZSTATUS');
    expect(result).toMatchSnapshot();
});

it('should generate mock data with as-is enum values if enumValues is "keep"', async () => {
    const result = await plugin(testSchema, [], { enumValues: 'keep' });

    expect(result).toBeDefined();
    expect(result).not.toContain('HasXyzStatus');
    expect(result).toContain('hasXYZStatus');
    expect(result).not.toContain('HASXYZSTATUS');
    expect(result).toMatchSnapshot();
});

it('should generate mock data with pascalCase types and enums by default', async () => {
    const result = await plugin(testSchema, [], {});

    expect(result).toBeDefined();
    expect(result).toMatch(/Abc(Type|Status)/);
    expect(result).not.toMatch(/ABC(Type|Status)/);
    expect(result).not.toMatch(/ABC(TYPE|STATUS)/);
    expect(result).toMatchSnapshot();
});

it('should generate mock data with pascalCase enum values if typenames is "pascal-case#pascalCase"', async () => {
    const result = await plugin(testSchema, [], { typenames: 'pascal-case#pascalCase' });

    expect(result).toBeDefined();
    expect(result).toMatch(/Abc(Type|Status)/);
    expect(result).not.toMatch(/ABC(Type|Status)/);
    expect(result).not.toMatch(/ABC(TYPE|STATUS)/);
    expect(result).toMatchSnapshot();
});

it('should generate mock data with upperCase types and enums if typenames is "upper-case#upperCase"', async () => {
    const result = await plugin(testSchema, [], { typenames: 'upper-case#upperCase' });

    expect(result).toBeDefined();
    expect(result).not.toMatch(/Abc(Type|Status)/);
    expect(result).not.toMatch(/ABC(Type|Status)/);
    expect(result).toMatch(/ABC(TYPE|STATUS)/);
    expect(result).toMatchSnapshot();
});

it('should generate mock data with as-is types and enums if typenames is "keep"', async () => {
    const result = await plugin(testSchema, [], { typenames: 'keep' });

    expect(result).toBeDefined();
    expect(result).not.toMatch(/Abc(Type|Status)/);
    expect(result).toMatch(/ABC(Type|Status)/);
    expect(result).not.toMatch(/ABC(TYPE|STATUS)/);
    expect(result).toMatchSnapshot();
});

it('should add custom prefix if the `prefix` config option is specified', async () => {
    const result = await plugin(testSchema, [], { prefix: 'mock' });

    expect(result).toBeDefined();
    expect(result).toMatch(/const mockUser/);
    expect(result).not.toMatch(/const aUser/);
    expect(result).toMatchSnapshot();
});

it('should correctly generate the `casual` data for a scalar mapping of type string', async () => {
    const result = await plugin(testSchema, [], { scalars: { AnyObject: 'email' } });

    expect(result).toBeDefined();
    expect(result).toContain('Mohamed.Nader@Kiehn.io');
    expect(result).toMatchSnapshot();
});

it('should correctly generate the `casual` data for a non-string scalar mapping', async () => {
    const result = await plugin(testSchema, [], { scalars: { AnyObject: 'rgb_array' } });

    expect(result).toBeDefined();
    expect(result).toContain(JSON.stringify([41, 98, 185]));
    expect(result).toMatchSnapshot();
});

it('should correctly generate the `casual` data for a function with arguments scalar mapping', async () => {
    const result = await plugin(testSchema, [], {
        scalars: {
            AnyObject: {
                generator: 'date',
                arguments: ['YYYY-MM-DD'],
            },
        },
    });

    expect(result).toBeDefined();
    expect(result).toContain("'1977-06-26'");
    expect(result).toMatchSnapshot();
});

it('should correctly generate the `casual` data for a function with one argument scalar mapping', async () => {
    const result = await plugin(testSchema, [], {
        scalars: {
            AnyObject: {
                generator: 'date',
                arguments: 'YYYY-MM-DD',
            },
        },
    });

    expect(result).toBeDefined();
    expect(result).toContain("'1977-06-26'");
    expect(result).toMatchSnapshot();
});

it('should add typesPrefix to all types when option is specified', async () => {
    const result = await plugin(testSchema, [], { typesPrefix: 'Api.' });

    expect(result).toBeDefined();
    expect(result).toMatch(/: Api.User/);
    expect(result).not.toMatch(/: User/);
    expect(result).toMatchSnapshot();
});

it('should use relationshipsToOmit argument to terminate circular relationships with terminateCircularRelationships enabled', async () => {
    const result = await plugin(testSchema, [], { terminateCircularRelationships: true });

    expect(result).toBeDefined();
    expect(result).toMatch(/relationshipsToOmit.add\('User'\)/);
    expect(result).toMatch(/relationshipsToOmit.has\('Avatar'\) \? {} as Avatar : anAvatar\({}, relationshipsToOmit\)/);
    expect(result).not.toMatch(/: anAvatar\(\)/);
    expect(result).toMatchSnapshot();
});
