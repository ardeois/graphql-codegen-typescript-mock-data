// tests/operationFactories/snapshot.spec.ts
import '@graphql-codegen/testing';
import { plugin } from '../../src';
import { opSchema, makeDocs } from './fixtures';

describe('snapshot', () => {
    it('matches snapshot for a representative operation set', async () => {
        const docs = makeDocs([
            `fragment UserCore on User { id name email }`,
            `query GetUser($id: ID!) { user(id: $id) { ...UserCore avatar { id url } } }`,
            `query AllUsers { users { id friends { id name } } }`,
            `mutation Rename($id: ID!, $name: String!) { renameUser(id: $id, name: $name) { id name } }`,
            `query Search { search(q: "x") { __typename ... on User { id } ... on Document { id title } } }`,
        ]);
        const result = await plugin(opSchema, docs, {
            typesFile: './types.ts',
            listElementCount: 2,
        });
        expect(result).toMatchSnapshot();
    });
});
