import casual from 'casual';
import { A, B } from './types';

casual.seed(0);

export const anA = (overrides?: Partial<A>): A => {
    return {
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : casual.uuid,
        str: overrides && overrides.hasOwnProperty('str') ? overrides.str! : casual.word,
        obj: overrides && overrides.hasOwnProperty('obj') ? overrides.obj! : aB(),
    };
};

export const aB = (overrides?: Partial<B>): B => {
    return {
        int: overrides && overrides.hasOwnProperty('int') ? overrides.int! : casual.integer(0, 9999),
        flt: overrides && overrides.hasOwnProperty('flt') ? overrides.flt! : Math.round(casual.double(0, 10) * 100) / 100,
        bool: overrides && overrides.hasOwnProperty('bool') ? overrides.bool! : casual.boolean,
    };
};

export const seedMocks = (seed: number) => casual.seed(seed);
