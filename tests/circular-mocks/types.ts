export type A = {
    B: B;
    C: C;
};

export type B = {
    A: A;
};

export type C = {
    aCollection: A[];
};
