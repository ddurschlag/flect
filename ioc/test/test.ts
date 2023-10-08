import {
	record,
	numberType,
	stringType,
	Reify,
	functionType,
	Type,
	array
} from "@flect/core";
import {
	Container,
	DependencyResolutionError,
	FLECT_CONSTRUCTOR_PARAMS,
	dep
} from "@flect/ioc";

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const myDog: Animal = {legCount: 4, sound: "woof"};

const dogKey = Symbol("sneaky-dog");

const Person = record({
	pet: record({
		legCount: numberType,
		sound: stringType
	})
});
type Person = Reify<typeof Person>;
const steve: Person = {pet: myDog};

const PetGroomer = record({
	customer: Person,
	getClientNoise: functionType(stringType)
});
type PetGroomer = Reify<typeof PetGroomer>;

class Cat implements Animal {
	get legCount() {
		return 4;
	}

	get sound() {
		return "meow";
	}
}

const DomesticPair = record({
	cat: Animal,
	dog: Animal
});
type DomesticPair = Reify<typeof DomesticPair>;

class LocalGroomer implements PetGroomer {
	constructor(public customer: Person) {
		this._customer = customer;
	}

	public static [FLECT_CONSTRUCTOR_PARAMS]() {
		return [Person] as const;
	}

	getClientNoise() {
		return this._customer.pet.sound;
	}

	private _customer: Person;
}

describe("@flect/ioc", () => {
	test("Chained resolutions", () => {
		const c = new Container();
		c.bind(Person)
			.with(Animal)
			.toFactory((a: Animal) => ({pet: a}));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);

		expect(c.resolve(PetGroomer).customer.pet.sound).toBe("meow");
	});
	test("Keyed resolutions and singletons", () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(myDog);
		expect(c.resolve(Animal, dogKey).sound).toBe("woof");
	});
	test("Resolution failure", () => {
		const c = new Container();
		expect(() => c.resolve(Animal)).toThrowError(DependencyResolutionError);
	});
	test("No-param ctor binding", () => {
		const c = new Container();
		c.bind(Animal).toType(Cat);
		expect(c.resolve(Animal).sound).toBe("meow");
	});
	test("Unknown key", () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => myDog);
		expect(() => c.resolve(Animal, dogKey)).toThrowError(
			DependencyResolutionError
		);
	});
	test("Object methods", () => {
		const c = new Container();
		c.bind(Person).toInstance(steve);
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(PetGroomer).getClientNoise()).toBe("woof");
	});
	test("Flect classes", () => {
		const c = new Container();
		c.bind(Person).toInstance(steve);
		c.bind(PetGroomer).toFlectType(LocalGroomer);
		expect(c.resolve(PetGroomer).getClientNoise()).toBe("woof");
	});
	test("Non-flect class can't masquerade", () => {
		const c = new Container();
		expect(() => {
			// @ts-expect-error
			c.bind(Animal).toFlectType(Cat);
		}).toThrow();
	});
	test("Wrong flect-types are wrong", () => {
		class WrongWrong {
			constructor(a: number) {
				this.A = a;
			}

			public static [FLECT_CONSTRUCTOR_PARAMS]() {
				return [stringType] as const;
			}

			public A: number;
		}
		const c = new Container();
		// @ts-expect-error
		c.bind(record({A: numberType})).toFlectType(WrongWrong);
	});
	test("Explicit dep", () => {
		const c = new Container();
		c.bind(Person)
			.with(dep(Animal))
			.toFactory((a: Animal) => ({pet: a}));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(myDog);
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(PetGroomer).customer.pet.sound).toBe("meow");
	});
	test("Keyed deps", () => {
		const c = new Container();
		c.bind(Person)
			.with(dep(Animal, dogKey))
			.toFactory((a: Animal) => ({pet: a}));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(myDog);
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(PetGroomer).customer.pet.sound).toBe("woof");
	});
	test("Non-strict dep", () => {
		const c = new Container();
		c.bind(Person)
			.with(dep(Animal, dogKey, false))
			.toFactory((a: Animal) => ({pet: a}));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(PetGroomer).customer.pet.sound).toBe("meow");
	});
	test("Failed strict dep", () => {
		const c = new Container();
		c.bind(Person)
			.with(dep(Animal, dogKey))
			.toFactory((a: Animal) => ({pet: a}));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(Animal).sound).toBe("meow");
		expect(() => c.resolve(PetGroomer)).toThrowError(DependencyResolutionError);
	});
	test("Full dep before type", () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(myDog);
		c.bind(DomesticPair)
			.with(dep(Animal, dogKey), Animal)
			.toFactory((dog, cat) => ({cat, dog}));
		expect(c.resolve(DomesticPair).cat).toBeInstanceOf(Cat);
	});
	test("Full dep after type", () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(myDog);
		c.bind(DomesticPair)
			.with(Animal, dep(Animal, dogKey))
			.toFactory((cat, dog) => ({cat, dog}));
		expect(c.resolve(DomesticPair).cat).toBeInstanceOf(Cat);
	});
	test("Split deps", () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(myDog);
		c.bind(DomesticPair)
			.with(Animal)
			.with(dep(Animal, dogKey))
			.toFactory((cat, dog) => ({cat, dog}));
		expect(c.resolve(DomesticPair).cat).toBeInstanceOf(Cat);
	});
	test("Same instance", () => {
		const c = new Container();
		c.bind(Person).toFactory(() => steve);
		expect(c.resolve(Person)).toBe(c.resolve(Person));
		expect(c.resolve(Person)).toBe(steve);
	});
	test("Different instance", () => {
		const c = new Container();
		c.bind(Animal).toType(Cat);
		expect(c.resolve(Animal)).not.toBe(c.resolve(Animal));
	});
	test("Cached implementations", () => {
		const c = new Container();
		c.bindCached(Animal).toType(Cat);
		expect(c.resolve(Animal)).toBe(c.resolve(Animal));
	});
	test("Cached deps", () => {
		const c = new Container();
		c.bindCached(Person)
			.with(Animal)
			.toFactory((a: Animal) => ({pet: a}));
		c.bindCached(Animal).toFactory(() => new Cat());
		expect(c.resolve(Animal)).toBe(c.resolve(Animal));
		expect(c.resolve(Person)).toBe(c.resolve(Person));
	});
	test("Separately specified types", () => {
		const c = new Container();
		c.bind(array(stringType)).toInstance(["foo", "bar"]);
		expect(c.resolve(array(stringType))).toEqual(["foo", "bar"]);
	});
});
