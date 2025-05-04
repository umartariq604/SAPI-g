const { MongoClient } = require('mongodb');
require('dotenv').config();

async function dropIndex() {
    const client = new MongoClient(process.env.MONGO_URI);
    
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('secure_api');
        const collection = db.collection('users');

        // List all indexes
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes);

        // Drop the username index
        await collection.dropIndex('username_1');
        console.log("Dropped username index");

        // List indexes again to verify
        const newIndexes = await collection.indexes();
        console.log("Indexes after dropping:", newIndexes);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

dropIndex(); 