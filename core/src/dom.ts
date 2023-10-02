import {MakeType, Type} from "./type.js";

/*
	This list will have to expand massively over time. In theory, it should be
	equivalent to @types/web, but that would require some sort of codegen
	chicanery with a high startup cost.
*/

export const HTMLElementType = Type[MakeType]<HTMLElement>();
