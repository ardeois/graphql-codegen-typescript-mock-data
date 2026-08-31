// tests/operationFactories/callbackBranches.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

const factoryFor = async (source: string, name: string): Promise<string> => {
    const result = await plugin(opSchema, makeDocs([source]), { typesFile: './types.ts' });
    const matched = String(result).match(new RegExp(`export const ${name}[\\s\\S]+?^};$`, 'm'));
    if (!matched) throw new Error(`factory ${name} not found`);
    return matched[0];
};

describe('callback branch overrides for union/interface fields', () => {
    it('emits a per-branch defaults closure for each concrete type selected on an interface field', async () => {
        const factory = await factoryFor(
            `query GetNode($id: ID!) { node(id: $id) { __typename ... on User { id name } ... on Document { id title } } }`,
            'aGetNodeQueryResponse',
        );
        // One closure per branch, named after the concrete type.
        expect(factory).toMatch(
            /const makeDocument_\d+ = \(_o\?: any\): any => \{[\s\S]+__typename: 'Document'[\s\S]+title:/,
        );
        expect(factory).toMatch(/const makeUser_\d+ = \(_o\?: any\): any => \{[\s\S]+__typename: 'User'[\s\S]+name:/);
        // The field's value is built by pickByCallback wiring those closures by typename.
        expect(factory).toMatch(
            /node: pickByCallback\(\s*\{[^}]*'Document':\s*makeDocument_\d+[^}]*'User':\s*makeUser_\d+[^}]*\}/,
        );
    });

    it('emits per-branch closures and applyBranchedArrayOverride for a list of a union with __typename', async () => {
        const factory = await factoryFor(
            `query Search { search(q: "hi") { __typename ... on User { id name } ... on Document { id title } } }`,
            'aSearchQueryResponse',
        );
        expect(factory).toMatch(/const makeDocument_\d+ = \(_o\?: any\): any => \{[\s\S]+__typename: 'Document'/);
        expect(factory).toMatch(/const makeUser_\d+ = \(_o\?: any\): any => \{[\s\S]+__typename: 'User'/);
        // List of a union dispatches via applyBranchedArrayOverride, which receives the branch
        // factories and the override directly, with no intermediate make closure.
        expect(factory).toMatch(
            /search: applyBranchedArrayOverride\(\s*\{[^}]*'Document':\s*makeDocument_\d+[^}]*'User':\s*makeUser_\d+[^}]*\}\s*,\s*'Document'\s*,\s*overrides\?\.search\s*,/,
        );
        // The flat make+pickByCallback combo from the previous design is gone.
        expect(factory).not.toMatch(/const makeSearch_\d+ = \(_o\?: any\): any => pickByCallback\(/);
    });

    it('points the pickByCallback default at the alphabetically-first branch', async () => {
        const factory = await factoryFor(
            `query GetNode($id: ID!) { node(id: $id) { __typename ... on User { id name } ... on Document { id title } } }`,
            'aGetNodeQueryResponse',
        );
        expect(factory).toMatch(/pickByCallback\(\s*\{[^}]+\}\s*,\s*'Document'/);
    });

    it('does not emit branch dispatch when only one inline fragment is present', async () => {
        const factory = await factoryFor(
            `query GetNode($id: ID!) { node(id: $id) { __typename ... on User { id name } } }`,
            'aGetNodeQueryResponse',
        );
        expect(factory).not.toContain('pickByCallback');
    });

    it('does not emit branch dispatch when __typename is not selected', async () => {
        const factory = await factoryFor(
            `query GetNode($id: ID!) { node(id: $id) { ... on User { id name } ... on Document { id title } } }`,
            'aGetNodeQueryResponse',
        );
        expect(factory).not.toContain('pickByCallback');
    });

    it('finds inline-fragment branches reached through a named fragment spread', async () => {
        const factory = await factoryFor(
            `fragment Hit on SearchHit { __typename ... on User { id name } ... on Document { id title } }
             query Search { search(q: "hi") { ...Hit } }`,
            'aSearchQueryResponse',
        );
        // Both branch closures should be emitted, not just the alphabetically-first one.
        expect(factory).toMatch(/const makeDocument_\d+ = \(_o\?: any\): any => \{[\s\S]+__typename: 'Document'/);
        expect(factory).toMatch(/const makeUser_\d+ = \(_o\?: any\): any => \{[\s\S]+__typename: 'User'/);
        expect(factory).toMatch(/applyBranchedArrayOverride\(\s*\{[^}]*'Document':[^}]*'User':/);
    });
});
