// tests/operationFactories/unions.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('unions and interfaces', () => {
    it('picks the alphabetically first concrete branch as the default for a list of a union (with __typename)', async () => {
        const docs = makeDocs([
            `query Search { search(q: "hi") { __typename ... on User { id name } ... on Document { id title } } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factoryMatch = String(result).match(/export const aSearchQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        // Document < User alphabetically, so the list dispatch default is 'Document'.
        expect(factoryMatch![0]).toMatch(/applyBranchedArrayOverride\(\s*\{[^}]+\}\s*,\s*'Document'/);
    });

    it('picks the alphabetically first concrete branch as the default for an interface narrowing (with __typename)', async () => {
        const docs = makeDocs([
            `query GetNode($id: ID!) { node(id: $id) { __typename ... on User { id name } ... on Document { id title } } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factoryMatch = String(result).match(/export const aGetNodeQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        expect(factoryMatch![0]).toMatch(/pickByCallback\(\s*\{[^}]+\}\s*,\s*'Document'/);
    });

    it('does not emit callback dispatch when __typename is not selected', async () => {
        const docs = makeDocs([
            `query Search { search(q: "hi") { ... on User { id name } ... on Document { id title } } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factory = String(result).match(/export const aSearchQueryResponse[\s\S]+?^};$/m)?.[0] ?? '';
        expect(factory).not.toContain('pickByCallback');
    });

    it('emits __typename when the operation selects it on a union branch', async () => {
        const docs = makeDocs([
            `query Search { search(q: "hi") { __typename ... on User { id } ... on Document { id } } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toMatch(/__typename:\s*'Document'/);
    });

    it('inlines fields from an inline fragment whose type condition is an interface implemented by the chosen concrete type', async () => {
        const docs = makeDocs([`query GetNode($id: ID!) { node(id: $id) { ... on Node { id } } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factoryMatch = String(result).match(/export const aGetNodeQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        const factory = factoryMatch![0];
        expect(factory).toContain('id:');
        // Must not produce empty object literal (which surfaces as `{ , }` after our join).
        expect(factory).not.toMatch(/\{\s*,\s*\}/);
    });

    it('inlines fragment spreads nested inside an inline fragment matching the chosen branch', async () => {
        const docs = makeDocs([
            // Only the Document branch's inline fragment is present, and it spreads a fragment.
            `fragment DocBits on Document { id title }
             query Search { search(q: "hi") { ... on Document { ...DocBits } } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factoryMatch = String(result).match(/export const aSearchQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        const factory = factoryMatch![0];
        expect(factory).toContain('title:');
        expect(factory).not.toMatch(/\{\s*,\s*\}/);
    });

    it('inlines interface-typed inline fragments selected on a concrete object field (e.g. payload errors lists)', async () => {
        const docs = makeDocs([`query Friends { users { friends { ... on Node { id } } } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        const factoryMatch = String(result).match(/export const aFriendsQueryResponse[\s\S]+?^};$/m);
        expect(factoryMatch).toBeTruthy();
        const factory = factoryMatch![0];
        expect(factory).toContain('id:');
        expect(factory).not.toMatch(/_defaults\s*=\s*\{\s*,?\s*\};?/);
    });
});
