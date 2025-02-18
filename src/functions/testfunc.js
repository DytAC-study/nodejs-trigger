const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const COSMOS_DB_CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING;
const DATABASE_NAME = process.env.DATABASE_NAME || "db1";
const CONTAINER_NAME = process.env.CONTAINER_NAME || "container1";

if (!COSMOS_DB_CONNECTION_STRING) {
    throw new Error("❌ ERROR: Missing CosmosDB connection string!");
}

const client = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
const database = client.database(DATABASE_NAME);
const container = database.container(CONTAINER_NAME);

app.http('HttpTrigger1', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        try {
            context.log(`✅ Function processed request for URL "${request.url}"`);

            if (request.method === "GET") {
                try {
                    context.log("🔍 Fetching items from CosmosDB...");
                    const { resources } = await container.items.query(
                        {
                            query: "SELECT * FROM c"
                        },
                        { enableCrossPartitionQuery: true } // Set to true if querying across partitions
                    ).fetchAll();
                    context.log("✅ GET request successful.");
                    return { status: 200, body: JSON.stringify(resources, null, 2), headers: { "Content-Type": "application/json" } };
                } catch (dbError) {
                    context.log(`❌ DATABASE ERROR: ${dbError.message}`);
                    return { status: 500, body: `❌ DATABASE ERROR: ${dbError.message}` };
                }
            }

            if (request.method === "POST") {
                try {
                    context.log("📌 Processing POST request...");
                    const item = await request.json();
                    if (!item || Object.keys(item).length === 0) {
                        throw new Error("❌ ERROR: Request body is empty!");
                    }

                    context.log(`📌 Received item: ${JSON.stringify(item)}`);
                    await client.database(DATABASE_NAME).container(CONTAINER_NAME).items.create(item);
                    context.log("✅ Item added successfully.");
                    return { status: 201, body: "✅ Item added successfully!" };
                } catch (dbError) {
                    context.log(`❌ DATABASE ERROR: ${dbError.message}`);
                    return { status: 500, body: `❌ DATABASE ERROR: ${dbError.message}` };
                }
            }

            throw new Error("⚠️ ERROR: Invalid request method.");
        } catch (error) {
            context.log(`❌ ERROR: ${error.message}`);
            return { status: 500, body: `❌ ERROR: ${error.message}` };
        }
    }
});