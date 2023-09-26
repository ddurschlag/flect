import {Type} from "@flect/core";

export function traverseIndex<Reflected extends unknown>(
	t: Type<Reflected[]>,
	index: number
) {
	return function traverser(input: Reflected[]) {
		return input[index];
	};
}

export function traverseRecord<
	Reflected extends Record<string | number, unknown>,
	K extends keyof Reflected
>(t: Type<Reflected>, key: K) {
	return function traverser(input: Reflected) {
		return input[key];
	};
}

export function traverse<Reflected extends unknown, Output extends unknown>(
	t: Type<Reflected>,
	f: (input: Reflected) => Output
) {
	return function traverser(input: Reflected) {
		return f(input);
	};
}

export function traverseMapKey<ReflectedKey, ReflectedValue>(
	t: Type<Map<ReflectedKey, ReflectedValue>>,
	key: ReflectedKey
) {
	return function traverser(input: Map<ReflectedKey, ReflectedValue>) {
		return input.get(key);
	};
}
