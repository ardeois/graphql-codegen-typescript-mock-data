import { anA, seedMocks } from './mocks';

it('should generate dynamic values when dynamicValues is true', () => {
    const a1 = anA();
    expect(a1).toMatchSnapshot();

    const a2 = anA();
    expect(a2).toMatchSnapshot();

    expect(a1).not.toEqual(a2);
});

it('should generate dynamic values from seed when dynamicValues is true', () => {
    seedMocks(0);
    const a1 = anA();

    seedMocks(0);
    const a1Copy = anA();

    seedMocks(1);
    const a2 = anA();

    expect(a1).toEqual(a1Copy);
    expect(a1).not.toEqual(a2);
    expect(a1Copy).not.toEqual(a2);
});
