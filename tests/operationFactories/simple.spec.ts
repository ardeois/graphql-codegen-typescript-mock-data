import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('simple scalar operation factory', () => {
    it('emits a factory whose name is articleNameOperation+Response', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id name email } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('export const aGetUserQueryResponse = (');
    });

    it('annotates return type with the operation TS type', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id name email } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('): GetUserQuery =>');
    });

    it('imports the operation type from typesFile', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id name email } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toMatch(/import\s*\{[^}]*GetUserQuery[^}]*\}\s*from\s*['"]\.\/types['"]/);
    });

    it('emits an inline literal matching the selection set', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id name email } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('user:');
        expect(result).toContain('id:');
        expect(result).toContain('name:');
        expect(result).toContain('email:');
    });

    it('emits an `an`-prefixed factory when operation type starts with a vowel', async () => {
        const docs = makeDocs([`query Audit { user(id: "1") { id } }`]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('export const anAuditQueryResponse = (');
    });

    it('emits factories for mutations and subscriptions too', async () => {
        const docs = makeDocs([
            `mutation Rename($id: ID!, $name: String!) { renameUser(id: $id, name: $name) { id name } }`,
            `subscription Watch($id: ID!) { userUpdated(id: $id) { id name } }`,
        ]);
        const result = await plugin(opSchema, docs, { typesFile: './types.ts' });
        expect(result).toContain('aRenameMutationResponse');
        expect(result).toContain('aWatchSubscriptionResponse');
    });
});
