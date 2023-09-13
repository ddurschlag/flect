import { record, numberType, stringType, Reify, functionType, array, boolType, union, literal, Type } from "@flect/core";
import { Container, DependencyResolutionError, dep } from '..';

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const dog: Animal = { legCount: 4, sound: 'woof' };

const dogKey = Symbol('sneaky-dog');

const Person = record({
	pet: record({
		legCount: numberType,
		sound: stringType
	})
});
type Person = Reify<typeof Person>;
const steve: Person = { pet: dog };

const PetGroomer = record({
	customer: Person,
	getClientNoise: functionType(stringType)
});
type PetGroomer = Reify<typeof PetGroomer>;

class Cat implements Animal {
	get legCount() { return 4; }
	get sound() { return "meow"; }
};

const DomesticPair = record({
	cat: Animal,
	dog: Animal
});
type DomesticPair = Reify<typeof DomesticPair>;


class LocalGroomer implements PetGroomer {
	constructor(public customer: Person) { this._customer = customer; }
	getClientNoise() {
		return this._customer.pet.sound;
	}
	private _customer: Person;
}

const Named = record({ sayHello: functionType(stringType, stringType) });
type Named = Reify<typeof Named>;
class Human {
	constructor(name: string) {
		this._name = name;
	}

	sayHello(to: string) { return `Hello ${to}, my name is ${this._name}.`; }

	private _name: string;
}


describe('@flect/ioc', () => {
	test('Chained resolutions', () => {
		const c = new Container();
		c.bind(Person).with(Animal).toFactory((a: Animal) => ({ pet: a }));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);

		expect(c.resolve(PetGroomer).customer.pet.sound).toBe('meow');
	});
	test('Keyed resolutions and singletons', () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(dog);
		expect(c.resolve(Animal, dogKey).sound).toBe('woof');
	});
	test('Resolution failure', () => {
		const c = new Container();
		expect(() => c.resolve(Animal)).toThrowError(DependencyResolutionError);
	});
	test('No-param ctor binding', () => {
		const c = new Container();
		c.bind(Animal).toType(Cat);
		expect(c.resolve(Animal).sound).toBe('meow');
	});
	test('Unknown key', () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => dog);
		expect(() => c.resolve(Animal, dogKey)).toThrowError(DependencyResolutionError);
	});
	test('Object methods', () => {
		const c = new Container();
		c.bind(Person).toInstance(steve);
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(PetGroomer).getClientNoise()).toBe('woof');
	});
	test('Non-object deps', () => {
		// Note that we create a variable here. Two different
		// instances of Type with the same type parameter are not the same.
		// Functionally, this means identity equality is ussed for types,
		// not structural equality. A structural comparer is plausible,
		// but would be complex and potentially slow.
		const personName = new Type<string>();
		const c = new Container();
		c.bind(personName).toFactory(() => "steve");
		c.bind(Named).with(dep(personName)).toType(Human);
		expect(c.resolve(Named).sayHello('Joe')).toBe('Hello Joe, my name is steve.');
	});
	test('Keyed deps', () => {
		const c = new Container();
		c.bind(Person).with(dep(Animal, dogKey)).toFactory((a: Animal) => ({ pet: a }));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(dog);
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(PetGroomer).customer.pet.sound).toBe('woof');
	});
	test('Non-strict dep', () => {
		const c = new Container();
		c.bind(Person).with(dep(Animal, dogKey, false)).toFactory((a: Animal) => ({ pet: a }));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(PetGroomer).customer.pet.sound).toBe('meow');
	});
	test('Failed strict dep', () => {
		const c = new Container();
		c.bind(Person).with(dep(Animal, dogKey)).toFactory((a: Animal) => ({ pet: a }));
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(PetGroomer).with(Person).toType(LocalGroomer);
		expect(c.resolve(Animal).sound).toBe('meow');
		expect(() => c.resolve(PetGroomer)).toThrowError(DependencyResolutionError);
	});
	test('Full dep before type', () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(dog);
		c.bind(DomesticPair).with(dep(Animal, dogKey), Animal).toFactory((dog, cat) => ({ cat, dog }));
		expect(c.resolve(DomesticPair).cat).toBeInstanceOf(Cat);
	});
	test('Full dep after type', () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(dog);
		c.bind(DomesticPair).with(Animal, dep(Animal, dogKey)).toFactory((cat, dog) => ({ cat, dog }));
		expect(c.resolve(DomesticPair).cat).toBeInstanceOf(Cat);
	});
	test('Split deps', () => {
		const c = new Container();
		c.bind(Animal).toFactory(() => new Cat());
		c.bind(Animal, dogKey).toInstance(dog);
		c.bind(DomesticPair).with(Animal).with(dep(Animal, dogKey)).toFactory((cat, dog) => ({ cat, dog }));
		expect(c.resolve(DomesticPair).cat).toBeInstanceOf(Cat);
	});
	test('Same instance', () => {
		const c = new Container();
		c.bind(Person).toFactory(() => steve);
		expect(c.resolve(Person)).toBe(c.resolve(Person));
		expect(c.resolve(Person)).toBe(steve);
	});
});
