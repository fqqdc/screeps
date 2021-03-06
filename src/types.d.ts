// type shim for nodejs' `require()` syntax
// for stricter node.js typings, remove this and install `@types/node`
declare const require: (module: string) => any;

// add your custom typings here
type HashTable<T> = { [id: string]: T }
type StructureSpawnRelated = StructureExtension | StructureSpawn;
type StructureStoreable = StructureContainer | StructureStorage;
type TaskTarget = Source | AnyStructure | ConstructionSite | Resource;
type HasId = { "id":string }
