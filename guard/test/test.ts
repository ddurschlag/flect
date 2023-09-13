import { Reify, array, bigintType, boolType, brand, neverType, nullType, numberType, record, stringType, symbolType, voidType } from '@flect/core';
import { GenericArrayValidator, GenericRecordValidator, GuardChain, defaultGuards, brandRepository } from '..'

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const dog: Animal = { legCount: 4, sound: 'woof' };

const Person = record({
	pet: record({
		legCount: numberType,
		sound: stringType
	})
});
type Person = Reify<typeof Person>;
const steve: Person = { pet: dog };

const Row = array(boolType);
const Grid = array(Row);
const Change = record({
	before: Grid,
	after: Grid,
	change: stringType
});
type Change = Reify<typeof Change>;

describe('@flect/Guard', () => {
	test('Brand', () => {
		const v = brandRepository.get(brand(Symbol()))!;
		expect(v(null)).toBe(false);
	});
	test('Record', () => {
		const v = new GuardChain();
		const recV = new GenericRecordValidator(v);
		v.add(defaultGuards);
		v.add(recV);

		expect(v.get(Animal)!({ legCount: 3, sound: 'woof' })).toBe(true);
		expect(v.get(Animal)!({ bork: 'woof' })).toBe(false);
		expect(v.get(Animal)!({ legCount: 3 })).toBe(false);
	});
	test('Array', () => {
		const v = new GuardChain();
		const arrV = new GenericArrayValidator(v);
		v.add(arrV);
		v.add(defaultGuards);

		expect(v.get(array(numberType))!([1, 2, 3])).toBe(true);
		expect(v.get(array(numberType))!([1, '2', 3])).toBe(false);
		expect(v.get(array(numberType))!(3)).toBe(false);
	});
	test('Recursion', () => {
		const v = new GuardChain();
		const recV = new GenericRecordValidator(v);
		v.add(defaultGuards);
		v.add(recV);

		expect(v.get(Person)!(steve)).toBe(true);
	});
	test('Mixed array/object', () => {
		const v = new GuardChain();
		const recV = new GenericRecordValidator(v);
		const arrV = new GenericArrayValidator(v);
		v.add(defaultGuards);
		v.add(recV);
		v.add(arrV);

		const r1 = [true, false];
		const r2 = [false, true, true];
		const r3 = [];
		const notR = [3];

		expect(v.get(Change)!({ before: [r1, r2], after: [r2, r3], change: 'good change' })).toBe(true);
		expect(v.get(Change)!({ before: [r1, r2], after: [notR, r3], change: 'good change' })).toBe(false);
		expect(v.get(Change)!(3)).toBe(false);
		expect(v.get(Change)!(null)).toBe(false);
	});
	test('Unvalidatable', () => {
		const v = new GuardChain();
		expect(v.get(Change)).toBeUndefined();
	});
	test('Unsubvalidatable record', () => {
		const v = new GuardChain();
		const recV = new GenericRecordValidator(v);
		v.add(recV);

		expect(v.get(Change)).toBeUndefined();
	});
	test('Unsubvalidatable array', () => {
		const v = new GuardChain();
		const arrV = new GenericArrayValidator(v);
		v.add(arrV);
		expect(v.get(array(numberType))).toBeUndefined();
	});
	test('Primitives', () => {
		expect(defaultGuards.get(stringType)!('string')).toBe(true);
		expect(defaultGuards.get(stringType)!(0)).toBe(false);

		expect(defaultGuards.get(numberType)!(3)).toBe(true);
		expect(defaultGuards.get(numberType)!('string')).toBe(false);

		expect(defaultGuards.get(bigintType)!(BigInt(0))).toBe(true);
		expect(defaultGuards.get(bigintType)!(0)).toBe(false);

		expect(defaultGuards.get(boolType)!(false)).toBe(true);
		expect(defaultGuards.get(boolType)!(0)).toBe(false);

		expect(defaultGuards.get(symbolType)!(Symbol())).toBe(true);
		expect(defaultGuards.get(symbolType)!(0)).toBe(false);

		expect(defaultGuards.get(voidType)!(undefined)).toBe(true);
		expect(defaultGuards.get(voidType)!(0)).toBe(false);

		expect(defaultGuards.get(nullType)!(null)).toBe(true);
		expect(defaultGuards.get(nullType)!({})).toBe(false);

		expect(defaultGuards.get(neverType)!('string')).toBe(false);
	});
});