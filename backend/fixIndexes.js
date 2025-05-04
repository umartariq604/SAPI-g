const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB");

        // Get the User model
        const User = require('./models/user');

        // Drop the existing index
        await User.collection.dropIndex('username_1');
        console.log("Dropped existing username index");

        // Let Mongoose create the new index based on the schema
        await User.init();
        console.log("Created new indexes based on schema");

        console.log("Index fix completed successfully");
    } catch (error) {
        console.error("Error fixing indexes:", error);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndexes(); 