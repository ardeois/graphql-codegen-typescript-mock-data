import { A, B, C, D } from './types';

export const anA = (overrides?: Partial<A>, _relationshipsToOmit: Array<string> = []): A => {
    const relationshipsToOmit = ([..._relationshipsToOmit, 'A']);
    return {
        B: overrides && overrides.hasOwnProperty('B') ? overrides.B! : relationshipsToOmit.includes('B') ? {} as B : aB({}, relationshipsToOmit),
        C: overrides && overrides.hasOwnProperty('C') ? overrides.C! : relationshipsToOmit.includes('C') ? {} as C : aC({}, relationshipsToOmit),
    };
};

export const aB = (overrides?: Partial<B>, _relationshipsToOmit: Array<string> = []): B => {
    const relationshipsToOmit = ([..._relationshipsToOmit, 'B']);
    return {
        A: overrides && overrides.hasOwnProperty('A') ? overrides.A! : relationshipsToOmit.includes('A') ? {} as A : anA({}, relationshipsToOmit),
    };
};

export const aC = (overrides?: Partial<C>, _relationshipsToOmit: Array<string> = []): C => {
    const relationshipsToOmit = ([..._relationshipsToOmit, 'C']);
    return {
        aCollection: overrides && overrides.hasOwnProperty('aCollection') ? overrides.aCollection! : [relationshipsToOmit.includes('A') ? {} as A : anA({}, relationshipsToOmit)],
    };
};

export const aD = (overrides?: Partial<D>, _relationshipsToOmit: Array<string> = []): D => {
    const relationshipsToOmit = ([..._relationshipsToOmit, 'D']);
    return {
        A: overrides && overrides.hasOwnProperty('A') ? overrides.A! : relationshipsToOmit.includes('A') ? {} as A : anA({}, relationshipsToOmit),
        B: overrides && overrides.hasOwnProperty('B') ? overrides.B! : relationshipsToOmit.includes('B') ? {} as B : aB({}, relationshipsToOmit),
    };
};
