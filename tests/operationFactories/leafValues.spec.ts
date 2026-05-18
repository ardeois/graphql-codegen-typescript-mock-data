// tests/operationFactories/leafValues.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('leaf value generation', () => {
    it('honors custom scalars config', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { id } }`]);
        const result = await plugin(opSchema, docs, {
            typesFile: './types.ts',
            scalars: { ID: 'string.uuid' },
        });
        // The factory's id default should look like a UUID call from faker.
        expect(result).toMatch(/id:\s*'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/);
    });

    it('honors fieldGeneration config', async () => {
        const docs = makeDocs([`query GetUser($id: ID!) { user(id: $id) { email } }`]);
        const result = await plugin(opSchema, docs, {
            typesFile: './types.ts',
            fieldGeneration: { User: { email: 'internet.email' } },
        });
        expect(result).toMatch(/email:\s*'\S+@\S+'/);
    });
});
