import {
	numberType,
	record,
	stringType,
	Reify,
	array,
	literal,
	keyof,
	index,
	union,
	tuple,
	classType,
	functionType,
	FIRST_GENERIC_TYPE,
	singleGenericFunctionType,
	doubleGenericFunctionType,
	SECOND_GENERIC_TYPE,
	THIRD_GENERIC_TYPE,
	tripleGenericFunctionType,
	conditional,
	neverType,
	intersection
} from '../';

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const dog: Animal = { legCount: 4, sound: 'woof' };

const BinarySequence = array(union(literal(true), literal(false)));
type BinarySequence = Reify<typeof BinarySequence>;

describe('@flect/core', () => {
	describe('Types', () => { });
	test('Literal type', () => {
		const AlwaysBob = literal('bob');
		type AlwaysBob = Reify<typeof AlwaysBob>;
		const bob: AlwaysBob = 'bob';
		expect(bob).toBeTruthy();
		// @ts-expect-error
		const moreBob: AlwaysBob = 'ted';
	});
	test('Record type', () => {
		const dog: Animal = { legCount: 4, sound: 'woof' };
		expect(dog).toBeTruthy();
		// @ts-expect-error
		const chair: Animal = { legCount: 4, seat: true };
	});
	test('Keyof type', () => {
		const AnimalKeys = keyof(Animal);
		type AnimalKeys = Reify<typeof AnimalKeys>;
		const aKey: AnimalKeys = 'legCount';
		expect(aKey).toBeTruthy();
		// @ts-expect-error
		const notKey: AnimalKeys = 'seat';
	});
	test('Index type', () => {
		const Person = record({
			pet: record({
				legCount: numberType,
				sound: stringType
			})
		});
		type Person = Reify<typeof Person>;
		const steve: Person = { pet: dog };
		const NumberToString = index(index(index(Person, "pet"), "legCount"), "toString");
		type NumberToString = Reify<typeof NumberToString>;
		const threeToString: NumberToString = (3).toString;
		expect(threeToString).toBeTruthy();
		// @ts-expect-error
		const someOtherFunc: NumberToString = [].at;
	});
	test('Union type', () => {
		const binSeq: BinarySequence = [true, false, true];
		expect(binSeq).toBeTruthy();
		// @ts-expect-error
		const numSeq: BinarySequence = [1, 2, 3];
	});
	test('Intersection type', () => {
		const threeOrFour = union(literal(3), literal(4));
		const fourOrFive = union(literal(5), literal(4))
		const Four = intersection(threeOrFour, fourOrFive);
		type Four = Reify<typeof Four>;
		const myFour: Four = 4;
		// @ts-expect-error
		const notFour: Four = 5;
	})
	test('Tuple type', () => {
		const StringNumString = tuple(stringType, numberType, stringType);
		type StringNumString = Reify<typeof StringNumString>;
		const sos: StringNumString = ['s', 0, 's'];
		expect(sos).toBeTruthy();
		// @ts-expect-error
		const oso: StringNumString = [0, 's', 0];
	});
	test('Instance type', () => {
		class MyClass {
			constructor(public a: string, public b: number) { }
		};
		const MyClassType = classType(MyClass);
		type MyClassType = Reify<typeof MyClassType>;
		const mc: MyClassType = new MyClass('a', 3);
		expect(mc).toBeTruthy();
		// @ts-expect-error
		const notmc: MyClassType = new Object();
	});
	test('Function type', () => {
		const StoI = functionType(numberType, stringType);
		type StoI = Reify<typeof StoI>;
		const len: StoI = (s) => s.length;
		expect(len).toBeTruthy();
		// @ts-expect-error
		const notLen: StoI = [].at;
	});
	test('Single generic function', () => {
		const CountOfThingToThings = singleGenericFunctionType(array(FIRST_GENERIC_TYPE), numberType, FIRST_GENERIC_TYPE);
		type CountOfThingToThings = Reify<typeof CountOfThingToThings>;
		const repeat: CountOfThingToThings = <T>(repCount: number, item: T) => {
			const result: T[] = [];
			for (let i = 0; i < repCount; i++) {
				result[i] = item;
			}
			return result;
		};
		expect(repeat).toBeTruthy();
		// @ts-expect-error
		const notGeneric: CountOfThingToThings = (repCount: number, item: string) => {
			const result: string[] = [];
			for (let i = 0; i < repCount; i++) {
				result[i] = item;
			}
			return result;
		}
		// @ts-expect-error
		const badArgOrder: CountOfThingToThings = <T>(item: T, repCount: number) => {
			const result: T[] = [];
			for (let i = 0; i < repCount; i++) {
				result[i] = item;
			}
			return result;
		};
	});
	test('Double generic function', () => {
		const Pairing = doubleGenericFunctionType(tuple(FIRST_GENERIC_TYPE, SECOND_GENERIC_TYPE), FIRST_GENERIC_TYPE, SECOND_GENERIC_TYPE);
		type Pairing = Reify<typeof Pairing>;
		const pair: Pairing = <T, U>(t: T, u: U) => [t, u] as const;
		expect(pair).toBeTruthy();
		// @ts-expect-error
		const moreArgs: Pairing = <T, U>(t: Text, u: U, x: number) => [t, u, x] as const;
	});
	test('Triple generic function', () => {
		const LabelThreeThings = tripleGenericFunctionType(
			record({ first: FIRST_GENERIC_TYPE, second: SECOND_GENERIC_TYPE, third: THIRD_GENERIC_TYPE }),
			FIRST_GENERIC_TYPE,
			SECOND_GENERIC_TYPE,
			THIRD_GENERIC_TYPE
		);
		type LabelThreeThings = Reify<typeof LabelThreeThings>;
		const label: LabelThreeThings = <T, U, V>(first: T, second: U, third: V) => ({ first, second, third });
		expect(label).toBeTruthy();
		// @ts-expect-error
		const onlyTwo: LabelThreeThings = <T, U>(first: T, second: U) => ({ first, second, third: 0 });
	});
	test('Conditional type', () => {
		const ThreeNumMeansString = conditional(literal(3), numberType, stringType, neverType);
		type ThreeNumMeansString = Reify<typeof ThreeNumMeansString>;
		const myString: ThreeNumMeansString = 'foo!';
		expect(myString).toBeTruthy();
		// @ts-expect-error
		const myNum: ThreeNumMeansString = 3;
	});
});