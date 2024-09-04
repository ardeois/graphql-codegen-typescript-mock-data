import { Faker } from '@faker-js/faker';
import * as allFakerLocales from '@faker-js/faker';
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
    generatorLocale: string;
};

type FunctionTokens = Record<'import' | 'seed' | 'seedFunction', string>;

type SetupMockValueGeneratorOptions = {
    generateLibrary: 'casual' | 'faker';
    generatorLocale: string;
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
    private fakerInstance: Faker;

    constructor(opts: MockValueGeneratorOptions) {
        this.dynamicValues = opts.dynamicValues;
        const fakerImport = `faker${opts.generatorLocale.toUpperCase()}`;
        if (!(fakerImport in allFakerLocales)) {
            throw new Error(`Cannot find faker version for locale ${opts.generatorLocale.toUpperCase()}`);
        }
        this.fakerInstance = allFakerLocales[`faker${opts.generatorLocale.toUpperCase()}`];
    }

    word = () => (this.dynamicValues ? `faker.lorem.word()` : `'${this.fakerInstance.lorem.word()}'`);
    uuid = () => (this.dynamicValues ? `faker.string.uuid()` : `'${this.fakerInstance.string.uuid()}'`);
    boolean = () => (this.dynamicValues ? `faker.datatype.boolean()` : this.fakerInstance.datatype.boolean());
    integer = () =>
        this.dynamicValues
            ? `faker.number.int({ min: 0, max: 9999 })`
            : this.fakerInstance.number.int({ min: 0, max: 9999 });
    float = () =>
        this.dynamicValues
            ? `faker.number.float({ min: 0, max: 10, fractionDigits: 1 })`
            : this.fakerInstance.number.float({ min: 0, max: 10, fractionDigits: 1 });
    date = () =>
        this.dynamicValues
            ? `faker.date.past({ years: 1, refDate: new Date(2022, 0) }).toISOString()`
            : `'${this.fakerInstance.date.past({ years: 1, refDate: new Date(2022, 0) }).toISOString()}'`;
    seed = (seed: number) => this.fakerInstance.seed(seed);
}

function getFakerFunctionTokens(locale = 'en'): FunctionTokens {
    return {
        import: `import { faker${locale.toUpperCase()} as faker } from '@faker-js/faker';`,
        seed: 'faker.seed(0);',
        seedFunction: 'export const seedMocks = (seed: number) => faker.seed(seed);',
    };
}

export const setupMockValueGenerator = ({
    generateLibrary,
    dynamicValues,
    generatorLocale,
}: SetupMockValueGeneratorOptions): MockValueGenerator => {
    switch (generateLibrary) {
        case 'casual':
            return new CasualMockValueGenerator({ dynamicValues, generatorLocale });
        case 'faker':
            return new FakerMockValueGenerator({ dynamicValues, generatorLocale });
    }
};

export const setupFunctionTokens = (generateLibrary: 'casual' | 'faker', locale?: string): FunctionTokens => {
    switch (generateLibrary) {
        case 'casual':
            return casualFunctionTokens;
        case 'faker':
            return getFakerFunctionTokens(locale);
    }
};
