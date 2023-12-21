import { plugin } from '../../src';
import testSchema from './schema';

it('should support typesPrefix and terminateCircularRelationships at the same time', async () => {
    const result = await plugin(testSchema, [], {
        prefix: 'mock',
        typesPrefix: 'Mock',
        terminateCircularRelationships: true,
    });

    expect(result).toBeDefined();
    expect(result).toContain(
        "a: overrides && overrides.hasOwnProperty('a') ? overrides.a! : relationshipsToOmit.has('A') ? {} as MockA : mockA({}, relationshipsToOmit)",
    );
    expect(result).toMatchSnapshot();
});
