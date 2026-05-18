// tests/operationFactories/activation.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('operation factory activation', () => {
    it('emits nothing extra when no documents are provided', async () => {
        const result = await plugin(opSchema, [], { typesFile: './types.ts' });
        expect(result).not.toContain('QueryResponse');
        expect(result).not.toContain('mergeOverrides');
    });

    it('throws when documents are present but typesFile is missing', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id } }`]);
        await expect(async () => {
            await plugin(opSchema, docs, {});
        }).rejects.toThrow(/requires `typesFile` to be set/);
    });

    it('does nothing when generateOperationFactories is false', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id } }`]);
        const result = await plugin(opSchema, docs, {
            typesFile: './types.ts',
            generateOperationFactories: false,
        });
        expect(result).not.toContain('GetUserQueryResponse');
    });
});
