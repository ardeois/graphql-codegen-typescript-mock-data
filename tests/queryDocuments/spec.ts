import { DocumentNode, Kind, OperationTypeNode } from 'graphql';
import { aQuery } from './mocks';

it('should only return object fields present in the query document', () => {
    const MOCKED_QUERY_DOCUMENT: DocumentNode = {
        kind: Kind.DOCUMENT,
        definitions: [
            {
                kind: Kind.OPERATION_DEFINITION,
                operation: OperationTypeNode.QUERY,
                selectionSet: {
                    kind: Kind.SELECTION_SET,
                    selections: [
                        {
                            kind: Kind.FIELD,
                            name: { kind: Kind.NAME, value: 'A' },
                            selectionSet: {
                                kind: Kind.SELECTION_SET,
                                selections: [
                                    {
                                        kind: Kind.FIELD,
                                        name: { kind: Kind.NAME, value: 'obj1' },
                                        selectionSet: {
                                            kind: Kind.SELECTION_SET,
                                            selections: [
                                                {
                                                    kind: Kind.FIELD,
                                                    name: { kind: Kind.NAME, value: 'b2' },
                                                },
                                                {
                                                    kind: Kind.FIELD,
                                                    name: { kind: Kind.NAME, value: 'b3' },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ],
    };

    const mockedQueryResponse = aQuery({}, MOCKED_QUERY_DOCUMENT);
    expect(mockedQueryResponse.B).toEqual({});
    expect(mockedQueryResponse.A.obj2).toEqual({});
});
