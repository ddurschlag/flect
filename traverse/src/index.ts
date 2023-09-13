import { Type } from "@flect/core";

export function traverseIndex<Reflected extends unknown>(t: Type<Reflected[]>, index: number) {
	return function traverser(input: Reflected[]) {
		return input[index];
	}
}

export function traverseRecord<Reflected extends Record<string | number, unknown>, K extends keyof Reflected>(t: Type<Reflected>, key: K) {
	return function traverser(input: Reflected) {
		return input[key];
	}
}
