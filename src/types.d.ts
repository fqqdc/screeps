// type shim for nodejs' `require()` syntax
// for stricter node.js typings, remove this and install `@types/node`
declare const require: (module: string) => any;

// add your custom typings here
type HashTable = { [id: string]: number }
type Predicate<T> = { (t: T): boolean };
type StructureSpawnRelated = StructureExtension | StructureSpawn;
type StructureStorehouse = StructureContainer | StructureStorage;
type TaskTarget = Source | Structure | ConstructionSite | Resource | StructureStorehouse;
