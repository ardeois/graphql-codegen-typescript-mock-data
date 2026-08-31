// tests/operationFactories/nested.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('nested object selections', () => {
    it('emits nested literals for object subfields', async () => {
        const docs = makeDocs([`query Profile($id: ID!) { user(id: $id) { id avatar { id url } } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toMatch(/avatar:\s*\{[^}]*id:[^}]*url:[^}]*\}/);
    });

    it('handles a null branch on nullable object fields', async () => {
        const docs = makeDocs([`query Profile($id: ID!) { user(id: $id) { id avatar { url } } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        // avatar is nullable; default should be the object, not null
        expect(result).not.toMatch(/avatar:\s*null/);
    });
});
