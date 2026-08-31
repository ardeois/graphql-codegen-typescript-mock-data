// tests/operationFactories/runtime.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('runtime helpers', () => {
    it('emits DeepPartial, mergeOverrides, applyArrayOverride when operations are generated', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id name } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('type DeepPartial<');
        expect(result).toContain('function mergeOverrides<');
        expect(result).toContain('function applyArrayOverride<');
    });

    it('does not emit runtime helpers when no operations exist', async () => {
        const result = await plugin(opSchema, [], { typesFile: './types.ts' });
        expect(result).not.toContain('mergeOverrides');
    });
});
