import fs from 'fs';
import { plugin } from '../src';
import circularRelationshipsSchema from './terminateCircularRelationships/schema';
import dynamicValuesSchema from './dynamicValues/schema';
import generateLibrarySchema from './generateLibrary/schema';

export default async () => {
    const terminateCircularRelationshipsMocks = await plugin(circularRelationshipsSchema, [], {
        typesFile: './types.ts',
        terminateCircularRelationships: true,
    });
    fs.writeFileSync('./tests/terminateCircularRelationships/mocks.ts', terminateCircularRelationshipsMocks.toString());

    const dynamicValuesMocks = await plugin(dynamicValuesSchema, [], {
        typesFile: './types.ts',
        dynamicValues: true,
    });
    fs.writeFileSync('./tests/dynamicValues/mocks.ts', dynamicValuesMocks.toString());

    const generateWithFakerMocks = await plugin(generateLibrarySchema, [], {
        typesFile: '../types.ts',
        dynamicValues: true,
        generateLibrary: 'faker',
    });
    fs.writeFileSync('./tests/generateLibrary/faker/mocks.ts', generateWithFakerMocks.toString());
};
