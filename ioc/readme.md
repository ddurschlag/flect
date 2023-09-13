<p align="center">
  <img src="flect.png" width="200px" align="center" alt="flect logo" />
  <h1 align="center">Flect/ioc</h1>
  <p align="center">
    Inversion of Control Container for Flect types
  </p>
</p>

## Introduction

Flect/ioc is a library for building and resolving a dependency graph.

## Usage

```ts
const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;

const Person = record({
	pet: record({
		legCount: numberType,
		sound: stringType
	})
});
type Person = Reify<typeof Person>;

class Cat implements Animal {
	get legCount() { return 4; }
	get sound() { return "meow"; }
};

const c = new Container();
c.bind(Person).with(Animal).toFactory((a: Animal) => ({ pet: a }));
c.bind(Animal).toFactory(() => new Cat());

console.log(c.resolve(Person).pet.sound); // Goes 'woof'
```