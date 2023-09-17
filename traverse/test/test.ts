import {
	record,
	numberType,
	stringType,
	Reify,
	array,
	union,
	literal,
	Union,
	intersection,
	mapType
} from "@flect/core";
import {
	traverseIndex,
	traverseRecord,
	traverse,
	traverseMapKey
} from "@flect/traverse";

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;

const Person = record({
	name: stringType
});
type Person = Reify<typeof Person>;

const PersonAndPet = intersection(Person, Animal);
type PersonAndPet = Reify<typeof PersonAndPet>;

const BinarySequence = array(union(literal(true), literal(false)));
type BinarySequence = Reify<typeof BinarySequence>;

describe("@flect/traverse", () => {
	test("Index", () => {
		const getThird = traverseIndex(BinarySequence, 3);
		const myBins = [true, false, true, false];
		const cThird = getThird(myBins);
		expect(cThird).toBe(false);
	});
	test("Record", () => {
		const getSound = traverseRecord(Animal, "sound");
		const myDog = {legCount: 4, sound: "woof"};
		const dogSound = getSound(myDog);
		expect(dogSound).toBe("woof");
	});
	test("Union", () => {
		const NumOrString = union(numberType, stringType);
		const idOrLength = traverse(NumOrString, (nors) => {
			switch (typeof nors) {
				case "number":
					return nors;
				case "string":
					return nors.length;
				default:
					return 0;
			}
		});
		expect(idOrLength(4)).toBe(4);
		expect(idOrLength("four")).toBe(4);
	});
	test("Intersection", () => {
		const nameSound = traverse(PersonAndPet, (pp) => `${pp.sound} ${pp.name}`);
		const steveDog: PersonAndPet = {
			sound: "woof",
			legCount: 4,
			name: "steve"
		};
		expect(nameSound(steveDog)).toBe("woof steve");
	});
	test("Map", () => {
		const getThree = traverseMapKey(mapType(numberType, stringType), 3);
		const good = new Map();
		good.set(3, "foo");
		expect(getThree(good)).toBe("foo");
	});
});
