import fs from 'fs';
import { plugin } from '../src';
import circularRelationshipsSchema from './terminateCircularRelationships/schema';
import generateLibrarySchema from './generateLibrary/schema';

export default async () => {
    const terminateCircularRelationshipsMocks = await plugin(circularRelationshipsSchema, [], {
        typesFile: './types.ts',
        terminateCircularRelationships: true,
    });
    fs.writeFileSync('./tests/terminateCircularRelationships/mocks.ts', terminateCircularRelationshipsMocks.toString());

    const generateWithFakerMocks = await plugin(generateLibrarySchema, [], {
        typesFile: '../types.ts',
        dynamicValues: true,
        generateLibrary: 'faker',
    });
    fs.writeFileSync('./tests/generateLibrary/faker/mocks.ts', generateWithFakerMocks.toString());

    const generateWithCasualMocks = await plugin(generateLibrarySchema, [], {
        typesFile: '../types.ts',
        dynamicValues: true,
        generateLibrary: 'casual',
    });
    fs.writeFileSync('./tests/generateLibrary/casual/mocks.ts', generateWithCasualMocks.toString());
};
