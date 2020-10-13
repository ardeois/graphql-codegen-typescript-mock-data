import { aB, aC, anA } from './mocks';

it('should terminate circular relationships when terminateCircularRelationships is true', () => {
    const a = anA();
    expect(a).toEqual({ B: { A: {} }, C: { aCollection: [{}] } });

    const b = aB();
    expect(b).toEqual({ A: { B: {}, C: { aCollection: [{}] } } });

    const c = aC();
    expect(c).toEqual({ aCollection: [{ B: { A: {} }, C: {} }] });
});
