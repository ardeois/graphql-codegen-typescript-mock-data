// tests/operationFactories/collection.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('operation collection', () => {
    it('throws on duplicate operation names with both source locations', async () => {
        const docs = makeDocs([
            `query GetUser($id: ID!) { user(id: $id) { id } }`,
            `query GetUser($id: ID!) { user(id: $id) { name } }`,
        ]);
        await expect(async () => {
            await plugin(opSchema, docs, { typesFile: './types.ts' });
        }).rejects.toThrow(/two operations named "GetUser"/);
    });

    it('silently skips anonymous operations', async () => {
        const docs = makeDocs([`{ user(id: "1") { id } }`, `query Named($id: ID!) { user(id: $id) { id } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('aNamedQueryResponse');
    });
});
