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

export class CasualMockValueGenerator implements MockValueGenerator {
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

export const casualFunctionTokens: FunctionTokens = {
    import: `import casual from 'casual';`,
    seed: 'casual.seed(0);',
    seedFunction: 'export const seedMocks = (seed: number) => casual.seed(seed);',
};
