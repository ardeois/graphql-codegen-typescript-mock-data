import { faker } from '@faker-js/faker';
import casual from 'casual';

interface MockValueGenerator {
    dynamicValues: boolean;
    word: () => string;
    uuid: () => string;
    boolean: () => boolean | string;
    integer: () => number | string;
    float: () => number | string;
    date: () => string;
    seed: (seed: number) => void;
}

type MockValueGeneratorOptions = {
    dynamicValues: boolean;
};

type FunctionTokens = Record<'import' | 'seed' | 'seedFunction', string>;

type SetupMockValueGeneratorOptions = {
    generateLibrary: 'casual' | 'faker';
    dynamicValues: boolean;
};

class CasualMockValueGenerator implements MockValueGenerator {
    dynamicValues: boolean;

    constructor(opts: MockValueGeneratorOptions) {
        this.dynamicValues = opts.dynamicValues;
    }

    word = () => (this.dynamicValues ? `casual.word` : `'${casual.word}'`);
    uuid = () => (this.dynamicValues ? `casual.uuid` : `'${casual.uuid}'`);
    boolean = () => (this.dynamicValues ? `casual.boolean` : casual.boolean);
    integer = () => (this.dynamicValues ? `casual.integer(0, 9999)` : `${casual.integer(0, 9999)}`);
    float = () =>
        this.dynamicValues
            ? `Math.round(casual.double(0, 10) * 100) / 100`
            : `${Math.round(casual.double(0, 10) * 100) / 100}`;
    date = () =>
        this.dynamicValues
            ? `new Date(casual.unix_time).toISOString()`
            : `'${new Date(casual.unix_time).toISOString()}'`;
    seed = (seed: number) => casual.seed(seed);
}

const casualFunctionTokens: FunctionTokens = {
    import: `import casual from 'casual';`,
    seed: 'casual.seed(0);',
    seedFunction: 'export const seedMocks = (seed: number) => casual.seed(seed);',
};

class FakerMockValueGenerator implements MockValueGenerator {
    dynamicValues: boolean;

    constructor(opts: MockValueGeneratorOptions) {
        this.dynamicValues = opts.dynamicValues;
    }

    word = () => (this.dynamicValues ? `faker.lorem.word()` : `'${faker.lorem.word()}'`);
    uuid = () => (this.dynamicValues ? `faker.datatype.uuid()` : `'${faker.datatype.uuid()}'`);
    boolean = () => (this.dynamicValues ? `faker.datatype.boolean()` : faker.datatype.boolean());
    integer = () =>
        this.dynamicValues
            ? `faker.datatype.number({ min: 0, max: 9999 })`
            : faker.datatype.number({ min: 0, max: 9999 });
    float = () =>
        this.dynamicValues
            ? `faker.datatype.float({ min: 0, max: 10, precision: 0.1 })`
            : faker.datatype.float({ min: 0, max: 10, precision: 0.1 });
    date = () => (this.dynamicValues ? `faker.date.past().toISOString()` : `'${faker.date.past().toISOString()}'`);
    seed = (seed: number) => faker.seed(seed);
}

const fakerFunctionTokens: FunctionTokens = {
    import: `import { faker } from '@faker-js/faker';`,
    seed: 'faker.seed(0);',
    seedFunction: 'export const seedMocks = (seed: number) => faker.seed(seed);',
};

export const setupMockValueGenerator = ({
    generateLibrary,
    dynamicValues,
}: SetupMockValueGeneratorOptions): MockValueGenerator => {
    switch (generateLibrary) {
        case 'casual':
            return new CasualMockValueGenerator({ dynamicValues });
        case 'faker':
            return new FakerMockValueGenerator({ dynamicValues });
    }
};

export const setupFunctionTokens = (generateLibrary: 'casual' | 'faker'): FunctionTokens => {
    switch (generateLibrary) {
        case 'casual':
            return casualFunctionTokens;
        case 'faker':
            return fakerFunctionTokens;
    }
};
