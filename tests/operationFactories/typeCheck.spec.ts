// tests/operationFactories/typeCheck.spec.ts
import '@graphql-codegen/testing';
import * as ts from 'typescript';
import { buildSchema } from 'graphql';
import { plugin } from '../../src';
import { makeDocs } from './fixtures';

const listUsersSchema = buildSchema(/* GraphQL */ `
    type Query {
        users: UserConnection!
    }

    type UserConnection {
        nodes: [User!]!
        totalCount: Int!
    }

    type User {
        id: ID!
        name: String!
        email: String!
    }
`);

const listUsersTypes = `
export type User = { id: string; name: string; email: string };
export type UserConnection = { nodes: User[]; totalCount: number };
export type Query = { users: UserConnection };
export type ListUsersQuery = {
    users: {
        nodes: User[];
        totalCount: number;
    };
};
`;

const compile = (files: Record<string, string>): readonly ts.Diagnostic[] => {
    const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2018,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
    };
    const host = ts.createCompilerHost(options);
    const realGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (Object.prototype.hasOwnProperty.call(files, fileName)) {
            return ts.createSourceFile(fileName, files[fileName], languageVersion, true);
        }
        return realGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };
    host.fileExists = (fileName) =>
        Object.prototype.hasOwnProperty.call(files, fileName) || ts.sys.fileExists(fileName);
    host.readFile = (fileName) =>
        Object.prototype.hasOwnProperty.call(files, fileName) ? files[fileName] : ts.sys.readFile(fileName);
    host.writeFile = () => undefined;

    const program = ts.createProgram(Object.keys(files), options, host);
    return ts.getPreEmitDiagnostics(program);
};

const formatDiagnostics = (diagnostics: readonly ts.Diagnostic[]): string =>
    diagnostics
        .map((d) => {
            const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
            if (d.file && d.start !== undefined) {
                const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
                return `${d.file.fileName}:${line + 1}:${character + 1} ${message}`;
            }
            return message;
        })
        .join('\n');

describe('generated factories type-check', () => {
    it('accepts partial element overrides for object lists', async () => {
        const docs = makeDocs([`query ListUsers { users { nodes { id name email } totalCount } }`]);
        const generated = await plugin(listUsersSchema, docs, { typesFile: './types.ts' });
        const mockFile = typeof generated === 'string' ? generated : generated.content;

        const usage = `
import { aListUsersQueryResponse } from './mocks.generated';

const partialElement = aListUsersQueryResponse({
    users: { nodes: [{ id: 'u1' }] },
});

const partialElementWithCount = aListUsersQueryResponse({
    users: {
        nodes: [{ id: 'u1' }, { name: 'Alice' }],
        totalCount: 2,
    },
});

const callbackForm = aListUsersQueryResponse({
    users: {
        nodes: (make) => [make({ id: 'u1' }), make({ name: 'Alice' })],
    },
});

const noOverride = aListUsersQueryResponse();

void partialElement;
void partialElementWithCount;
void callbackForm;
void noOverride;
`;

        const diagnostics = compile({
            '/types.ts': listUsersTypes,
            '/mocks.generated.ts': mockFile,
            '/usage.ts': usage,
        });

        expect(formatDiagnostics(diagnostics)).toBe('');
    });

    it('still rejects element overrides with extra unknown properties', async () => {
        const docs = makeDocs([`query ListUsers { users { nodes { id name email } totalCount } }`]);
        const generated = await plugin(listUsersSchema, docs, { typesFile: './types.ts' });
        const mockFile = typeof generated === 'string' ? generated : generated.content;

        const usage = `
import { aListUsersQueryResponse } from './mocks.generated';

const bogus = aListUsersQueryResponse({
    users: { nodes: [{ notAField: 'oops' }] },
});

void bogus;
`;

        const diagnostics = compile({
            '/types.ts': listUsersTypes,
            '/mocks.generated.ts': mockFile,
            '/usage.ts': usage,
        });

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(formatDiagnostics(diagnostics)).toMatch(/notAField/);
    });
});
