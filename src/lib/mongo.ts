import { Db, Document, MongoClient, ServerApiVersion } from 'mongodb';

const MONGO_DB = 'snap-now';

declare global {
    var __mongoClientPromise: Promise<MongoClient> | undefined;
}

export class Mongo {
    private static get client(): Promise<MongoClient> {
        if (!global.__mongoClientPromise) {
            const client = new MongoClient(process.env.MONGO_URL!, {
                maxPoolSize: 10,
                maxIdleTimeMS: 60_000,
                serverApi: { version: ServerApiVersion.v1, deprecationErrors: true },
            });

            global.__mongoClientPromise = client.connect();
        }

        return global.__mongoClientPromise!;
    }

    static async db(): Promise<Db> {
        const client = await this.client;

        return client.db(MONGO_DB);
    }

    static async collection<T extends Document>(name: string) {
        const db = await this.db();

        return db.collection<T>(name);
    }
}
