<p align="center">
  <img src="flect.png" width="200px" align="center" alt="flect logo" />
  <h1 align="center">Flect</h1>
  <p align="center">
	Reifiable types for TypeScript
  </p>
</p>

## Introduction

Flect is a library for describing TypeScript types using JavaScript objects. These types can be reified into TypeScript types, as well as being used for tasks like validation and dependency injection.

## Inspiration

Flect was inspired by libraries like [reason-guard](https://github.com/6RiverSystems/reason-guard), [Zod](https://github.com/colinhacks/zod), and [zoddi](https://github.com/ddurschlag/zoddi). There is nothing wrong with these libraries, but the aim of Flect is to better separate type expression from type usage to allow broader extensibility.

## Packages

[Core](core/readme.md)
[Guard](guard/readme.md)
[IoC](ioc/readme.md)
[Traverse](traverse/readme.md)