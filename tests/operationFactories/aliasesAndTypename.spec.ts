// tests/operationFactories/aliasesAndTypename.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('aliases and __typename', () => {
    it('uses the alias as the literal key', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { uid: id } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factory = String(result).match(/export const aGetUserQueryResponse[\s\S]+?^};$/m)?.[0] ?? '';
        expect(factory).toContain('uid:');
        // The factory should not have an unaliased "id:" key when alias is used.
        // We test by ensuring we don't see two distinct id keys in the user object.
        expect(factory.match(/id:/g)?.length ?? 0).toBeLessThanOrEqual(1);
    });

    it('emits __typename only when selected', async () => {
        const withTypename = await plugin(
            opSchema,
            makeDocs([`query GetUser($id: ID!) { user(id: $id) { __typename id } }`]),
            { typesFile: './types.ts' },
        );
        const withFactory = String(withTypename).match(/export const aGetUserQueryResponse[\s\S]+?^};$/m)?.[0] ?? '';
        expect(withFactory).toMatch(/__typename:\s*'User'/);

        const without = await plugin(opSchema, makeDocs([`query GetUser($id: ID!) { user(id: $id) { id } }`]), {
            typesFile: './types.ts',
        });
        const withoutFactory = String(without).match(/export const aGetUserQueryResponse[\s\S]+?^};$/m)?.[0] ?? '';
        expect(withoutFactory).not.toContain('__typename');
    });
});
