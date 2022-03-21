import fs from 'fs';
import { buildSchema } from 'graphql';
import { plugin } from '../../src';
export default async () => {
    const circularSchema = buildSchema(/* GraphQL */ `
        type A {
            B: B!
            C: C!
        }
        type B {
            A: A!
        }
        type C {
            aCollection: [A!]!
        }
        type D {
            A: A!
            B: B!
        }
    `);

    const output = await plugin(circularSchema, [], { typesFile: './types.ts', terminateCircularRelationships: true });

    fs.writeFileSync('./tests/circular-mocks/mocks.ts', output.toString());
};
