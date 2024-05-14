import { plugin } from '../../src';
import testSchema from './schema';

it('should support setting terminateCircularRelationships as imediate and not create a new set of relationships', async () => {
    const result = await plugin(testSchema, [], {
        terminateCircularRelationships: 'immediate',
    });

    expect(result).toBeDefined();
    expect(result).not.toContain('new Set(_relationshipsToOmit)');
    expect(result).toMatchSnapshot();
});
