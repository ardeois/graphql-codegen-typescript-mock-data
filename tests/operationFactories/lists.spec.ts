// tests/operationFactories/lists.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('list selections', () => {
    it('emits applyArrayOverride and a per-element factory', async () => {
        const docs = makeDocs([`query AllUsers { users { id name } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('applyArrayOverride(');
        expect(result).toMatch(/const make[A-Z]\w* = \(/);
    });

    it('honors listElementCount config', async () => {
        const docs = makeDocs([`query AllUsers { users { id } }`]);
        const result = await plugin(opSchema, docs, {
            typesFile: './types.ts',
            listElementCount: 3,
        });
        expect(result).toContain('applyArrayOverride(');
        expect(result).toContain(', 3)');
    });

    it('handles nested lists (friends inside user)', async () => {
        const docs = makeDocs([`query AllUsers { users { id friends { id name } } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        // Should have at least two make* factories (top-level users and nested friends)
        const output = typeof result === 'string' ? result : result.content;
        const matches = output.match(/const make[A-Z]\w* = \(/g) ?? [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});
