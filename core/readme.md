<p align="center">
  <img src="flect.png" width="200px" align="center" alt="flect logo" />
  <h1 align="center">Flect/core</h1>
  <p align="center">
    Reifiable types for TypeScript
  </p>
</p>

## Introduction

Flect/core is a library for describing TypeScript types using JavaScript objects.

## Usage

```ts
const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const dog: Animal = { legCount: 4, sound: 'woof' };
```