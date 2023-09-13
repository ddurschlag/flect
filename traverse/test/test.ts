import { record, numberType, stringType, Reify, array, union, literal } from '@flect/core';
import {traverseIndex, traverseRecord} from '..';

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;

const BinarySequence = array(union(literal(true), literal(false)));
type BinarySequence = Reify<typeof BinarySequence>;

describe('@flect/traverse', () => {
	test('Index', () => {
		const getThird = traverseIndex(BinarySequence, 3);
		const myBins = [true, false, true, false];
		const cThird = getThird(myBins);
		expect(cThird).toBe(false);
	});
	test('Record', () => {
		const getSound = traverseRecord(Animal, 'sound');
		const myDog = { 'legCount': 4, sound: 'woof' };
		const dogSound = getSound(myDog);
		expect(dogSound).toBe('woof');
	});
});
