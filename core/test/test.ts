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
	intersection,
	brand,
	UnionType,
	mapType,
	setType,
	mappedRecord,
	SourceType,
	ArrayType,
	unknownType,
	voidType,
	nullType,
	TupleType,
	RecordType,
	Type
} from "@flect/core";

function assertKeyIsType<
	Reflected extends Record<string | number, unknown>,
	TypeCtor extends abstract new (...args: any) => Type
>(
	rec: RecordType<Reflected>,
	k: keyof Reflected extends string | symbol
		? (string | symbol) & keyof Reflected
		: string,
	expectedType: TypeCtor
) {
	const propMap = new Map(rec.properties.map(([key, val]) => [key, val]));
	const propertyValue = propMap.get(k);
	expect(propertyValue).toBeInstanceOf(expectedType);
	if (propertyValue instanceof expectedType) {
		return propertyValue as InstanceType<TypeCtor>;
	}
	throw new Error("Wat");
}

function assertKeyIsNot<Reflected extends Record<string | number, unknown>>(
	rec: RecordType<Reflected>,
	k: string
) {
	const propMap = new Map(rec.properties.map(([key, val]) => [key, val]));
	const propertyValue = propMap.get(k);
	expect(propertyValue).toBeUndefined();
}

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const dog: Animal = {legCount: 4, sound: "woof"};

const BinarySequence = array(union(literal(true), literal(false)));
type BinarySequence = Reify<typeof BinarySequence>;

const Bx1 = Symbol("bx1");
const Bx2 = Symbol("bx2");
const B1 = brand(Bx1);
type B1 = Reify<typeof B1>;
const B2 = brand(Bx2);
type B2 = Reify<typeof B2>;

const B1Animal = intersection(B1, Animal);
type B1Animal = Reify<typeof B1Animal>;
const B2Animal = intersection(B2, Animal);
type B2Animal = Reify<typeof B2Animal>;

describe("@flect/core", () => {
	describe("Types", () => {
		describe("Brand type", () => {
			test("Not interchangeable", () => {
				const b1: B1 = {} as B1;
				const b1b: B1 = b1;
				// @ts-expect-error
				const b2: B2 = b1;
			});
			test("Intersection guarantees uniqueness", () => {
				const animal1: B1Animal = {} as B1Animal;
				const animal1b: B1Animal = animal1;
				// @ts-expect-error
				const animal2: B2Animal = animal1;
			});
		});
		test("Literal type", () => {
			const AlwaysBob = literal("bob");
			type AlwaysBob = Reify<typeof AlwaysBob>;
			const bob: AlwaysBob = "bob";
			expect(bob).toBeTruthy();
			// @ts-expect-error
			const moreBob: AlwaysBob = "ted";
		});
		test("Record type", () => {
			expect(dog).toBeTruthy();
			// @ts-expect-error
			const chair: Animal = {legCount: 4, seat: true};
		});
		test("Array type", () => {
			const StringArray = array(stringType);
			type StringArray = Reify<typeof StringArray>;
			const good1: StringArray = ["3", "4"];
			const good2: StringArray = ["3"];
			const good3: StringArray = [];
			// @ts-expect-error
			const bad1: StringArray = [3];
			// @ts-expect-error
			const bad2: StringArray = [3, 4];
		});
		test("Map type", () => {
			const S2sMap = mapType(stringType, stringType);
			type S2sMap = Reify<typeof S2sMap>;
			const good: S2sMap = new Map();
			good.set("3", "4");
			const bad: S2sMap = new Map();
			// @ts-expect-error
			bad.set(3, "4");
			// @ts-expect-error
			bad.set("3", 4);
			// @ts-expect-error
			bad.set(3, 4);
		});
		test("Set type", () => {
			const StringSet = setType(stringType);
			type StringSet = Reify<typeof StringSet>;
			const good: StringSet = new Set();
			good.add("3");
			const bad: StringSet = new Set();
			// @ts-expect-error
			bad.add(3);
		});
		test("Keyof type", () => {
			const AnimalKeys = keyof(Animal);
			type AnimalKeys = Reify<typeof AnimalKeys>;
			const aKey: AnimalKeys = "legCount";
			expect(aKey).toBeTruthy();
			// @ts-expect-error
			const notKey: AnimalKeys = "seat";
		});
		test("Index type", () => {
			const Person = record({
				pet: record({
					legCount: numberType,
					sound: stringType
				})
			});
			type Person = Reify<typeof Person>;
			const steve: Person = {pet: dog};
			const NumberToString = index(
				index(index(Person, "pet"), "legCount"),
				"toString"
			);
			type NumberToString = Reify<typeof NumberToString>;
			const threeToString: NumberToString = (3).toString;
			expect(threeToString).toBeTruthy();
			// @ts-expect-error
			const someOtherFunc: NumberToString = [].at;
		});
		test("Union type", () => {
			const binSeq: BinarySequence = [true, false, true];
			expect(binSeq).toBeTruthy();
			const u = BinarySequence.itemType as UnionType<[true, false]>;
			expect(u.subsets.length).toBe(2);
			// @ts-expect-error
			const numSeq: BinarySequence = [1, 2, 3];
		});
		test("Intersection type", () => {
			const threeOrFour = union(literal(3), literal(4));
			const fourOrFive = union(literal(5), literal(4));
			const Four = intersection(threeOrFour, fourOrFive);
			type Four = Reify<typeof Four>;
			const myFour: Four = 4;
			expect(Four.subsets.length).toBe(2);
			// @ts-expect-error
			const notFour: Four = 5;
		});
		test("Tuple type", () => {
			const StringNumString = tuple(stringType, numberType, stringType);
			type StringNumString = Reify<typeof StringNumString>;
			const sos: StringNumString = ["s", 0, "s"];
			expect(sos).toBeTruthy();
			expect(StringNumString.subsets.length).toBe(3);
			// @ts-expect-error
			const oso: StringNumString = [0, "s", 0];
		});
		test("Instance type", () => {
			class MyClass {
				constructor(
					public a: string,
					public b: number
				) {}
			}
			const MyClassType = classType(MyClass);
			type MyClassType = Reify<typeof MyClassType>;
			const mc: MyClassType = new MyClass("a", 3);
			expect(mc).toBeTruthy();
			// @ts-expect-error
			const notmc: MyClassType = {};
		});
		test("Function type", () => {
			const StoI = functionType(numberType, stringType);
			type StoI = Reify<typeof StoI>;
			const len: StoI = (s) => s.length;
			expect(len).toBeTruthy();
			// @ts-expect-error
			const notLen: StoI = [].at;
		});
		test("Single generic function", () => {
			const CountOfThingToThings = singleGenericFunctionType(
				array(FIRST_GENERIC_TYPE),
				numberType,
				FIRST_GENERIC_TYPE
			);
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
			const notGeneric: CountOfThingToThings = (
				repCount: number,
				item: string
			) => {
				const result: string[] = [];
				for (let i = 0; i < repCount; i++) {
					result[i] = item;
				}
				return result;
			};
			// @ts-expect-error
			const badArgOrder: CountOfThingToThings = <T>(
				item: T,
				repCount: number
			) => {
				const result: T[] = [];
				for (let i = 0; i < repCount; i++) {
					result[i] = item;
				}
				return result;
			};
		});
		test("Double generic function", () => {
			const Pairing = doubleGenericFunctionType(
				tuple(FIRST_GENERIC_TYPE, SECOND_GENERIC_TYPE),
				FIRST_GENERIC_TYPE,
				SECOND_GENERIC_TYPE
			);
			type Pairing = Reify<typeof Pairing>;
			const pair: Pairing = <T, U>(t: T, u: U) => [t, u] as const;
			expect(pair).toBeTruthy();
			// @ts-expect-error
			const moreArgs: Pairing = <T, U>(t: T, u: U, x: number) =>
				[t, u, x] as const;
		});
		test("Triple generic function", () => {
			const LabelThreeThings = tripleGenericFunctionType(
				record({
					first: FIRST_GENERIC_TYPE,
					second: SECOND_GENERIC_TYPE,
					third: THIRD_GENERIC_TYPE
				}),
				FIRST_GENERIC_TYPE,
				SECOND_GENERIC_TYPE,
				THIRD_GENERIC_TYPE
			);
			type LabelThreeThings = Reify<typeof LabelThreeThings>;
			const label: LabelThreeThings = <T, U, V>(
				first: T,
				second: U,
				third: V
			) => ({first, second, third});
			expect(label).toBeTruthy();
			// @ts-expect-error
			const onlyTwo: LabelThreeThings = <T, U>(first: T, second: U) => ({
				first,
				second,
				third: 0
			});
		});
		test("Conditional type", () => {
			const ThreeNumMeansString = conditional(
				literal(3),
				numberType,
				stringType,
				neverType
			);
			type ThreeNumMeansString = Reify<typeof ThreeNumMeansString>;
			const myString: ThreeNumMeansString = "foo!";
			expect(myString).toBeTruthy();
			// @ts-expect-error
			const myNum: ThreeNumMeansString = 3;
		});
		describe("Mapped types", () => {
			test("Smoke test", () => {
				const Herd = mappedRecord(Animal, array(SourceType), "allMy", "");
				type Herd = Reify<typeof Herd>;
				const good: Herd = {
					allMyLegCount: [1, 2, 3],
					allMySound: ["moo", "bah", "la la la"]
				};
				expect(Herd.properties.length).toBe(2);
				assertKeyIsNot(Herd, "legCount");
				const legs = assertKeyIsType(Herd, "allMyLegCount", ArrayType);
				expect(legs.itemType).toBe(numberType);
			});
			test("Tuple type", () => {
				const pair = record({tuple: tuple(numberType, numberType)});
				const pairOfPairs = mappedRecord(
					pair,
					tuple(SourceType, SourceType),
					"",
					""
				);
				const tup = assertKeyIsType(pairOfPairs, "tuple", TupleType);
				expect(tup.subsets.length).toBe(2);
			});
			test("Constant tuple type", () => {
				const pair = record({tuple: tuple(numberType, numberType)});
				const otherPairs = mappedRecord(
					pair,
					tuple(stringType, stringType),
					"",
					""
				);
				const tup = assertKeyIsType(otherPairs, "tuple", TupleType);
				expect(tup.subsets.length).toBe(2);
			});
			test("Record type", () => {
				const hierarchy = record({rec: record({key: numberType})});
				const MegaHierarchy = mappedRecord(
					hierarchy,
					record({old: SourceType}),
					"",
					""
				);

				const recOfOld = assertKeyIsType(MegaHierarchy, "rec", RecordType);
				assertKeyIsType(recOfOld, "old", RecordType);
			});
			test("Constant record type", () => {
				const hierarchy = record({rec: record({key: numberType})});
				const OtherHierarchy = mappedRecord(
					hierarchy,
					record({myString: stringType}),
					"",
					""
				);

				const recofStrings = assertKeyIsType(OtherHierarchy, "rec", RecordType);
				expect(recofStrings.properties.length).toBe(1);
				expect(recofStrings.properties[0][1]).toBe(stringType);
			});
			test("Array type", () => {
				const recOfArr = record({arr: array(stringType)});
				const arrArr = mappedRecord(recOfArr, array(SourceType), "", "");

				const innerArr = assertKeyIsType(arrArr, "arr", ArrayType);
				expect(innerArr.itemType).toBeInstanceOf(ArrayType);
			});
			test("Constant array type", () => {
				const recOfArr = record({arr: array(stringType)});
				const arrArr = mappedRecord(recOfArr, array(stringType), "", "");

				const innerArr = assertKeyIsType(arrArr, "arr", ArrayType);
				expect(innerArr.itemType).toBe(stringType);
			});
			test("Type with numeric key", () => {
				const doors = record({1: unknownType, 2: numberType, 3: unknownType});
				const moreDoors = mappedRecord(
					doors,
					stringType,
					"behind_door_number_",
					""
				);
				expect(moreDoors.properties.length).toBe(3);
			});
			test("Type with symbol key", () => {
				const s = Symbol("my-symbol");
				const weird = record({[s]: voidType});
				expect(() => mappedRecord(weird, nullType, "foo", "bar")).toThrow();
			});
		});
	});
});
