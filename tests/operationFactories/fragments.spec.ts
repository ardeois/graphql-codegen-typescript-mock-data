// tests/operationFactories/fragments.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('named fragment spreads', () => {
    it('inlines fragment selections into the operation literal', async () => {
        const docs = makeDocs([
            `fragment UserCore on User { id name }
             query GetUser($id: ID!) { user(id: $id) { ...UserCore email } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        // Scope assertions to the operation factory body (avoid false positives from
        // schema-level type factories that also contain these field names).
        const factoryMatch = String(result).match(/export const aGetUserQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        const factory = factoryMatch![0];
        expect(factory).toContain('id:');
        expect(factory).toContain('name:');
        expect(factory).toContain('email:');
        expect(result).not.toContain('aUserCoreFragment'); // no fragment factory
    });

    it('resolves fragments defined in a separate document', async () => {
        const docs = makeDocs([
            `fragment UserCore on User { id name }`,
            `query GetUser($id: ID!) { user(id: $id) { ...UserCore } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factoryMatch = String(result).match(/export const aGetUserQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        expect(factoryMatch![0]).toContain('name:');
    });

    it('deduplicates fields selected directly and via a spread', async () => {
        const docs = makeDocs([
            `fragment UserBits on User { __typename name }
             query GetUser($id: ID!) { user(id: $id) { __typename name ...UserBits } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factoryMatch = String(result).match(/export const aGetUserQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        const factory = factoryMatch![0];
        expect(factory.match(/__typename:\s*'User'/g)?.length).toBe(1);
        expect(factory.match(/\bname:/g)?.length).toBe(1);
    });
});
