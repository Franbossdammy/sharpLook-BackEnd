declare class Database {
    private static instance;
    private constructor();
    static getInstance(): Database;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    dropDatabase(): Promise<void>;
    clearCollections(): Promise<void>;
}
declare const _default: Database;
export default _default;
//# sourceMappingURL=database.d.ts.map