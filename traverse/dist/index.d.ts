import { Type } from "@flect/core";
export declare function traverseIndex<Reflected extends unknown>(t: Type<Reflected[]>, index: number): (input: Reflected[]) => Reflected;
export declare function traverseRecord<Reflected extends Record<string | number, unknown>, K extends keyof Reflected>(t: Type<Reflected>, key: K): (input: Reflected) => Reflected[K];
