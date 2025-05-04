const mongoose = require('mongoose');
require('dotenv').config();

async function resetIndexes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Get the User model
        const User = require('./models/user');

        // Drop all indexes on the users collection
        await User.collection.dropIndexes();
        console.log("Dropped all indexes on users collection");

        // Let Mongoose create new indexes based on the schema
        await User.init();
        console.log("Created new indexes based on schema");

        console.log("Index reset completed successfully");
    } catch (error) {
        console.error("Error resetting indexes:", error);
    } finally {
        await mongoose.disconnect();
    }
}

resetIndexes(); 