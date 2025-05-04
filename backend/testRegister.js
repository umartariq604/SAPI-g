const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/user');

async function testRegistration() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Test user data
        const testUser = {
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
            password: "testpassword123",
            role: "user"
        };

        // Hash password
        const hashedPassword = await bcrypt.hash(testUser.password, 10);

        // Create new user
        const newUser = new User({
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            email: testUser.email,
            password: hashedPassword,
            role: testUser.role
        });

        console.log("Attempting to save user:", newUser);

        // Save user
        await newUser.save();
        console.log("User saved successfully!");

        // Verify the saved data
        const savedUser = await User.findOne({ email: testUser.email });
        console.log("Saved user data from database:", savedUser);

    } catch (error) {
        console.error("Error during test:", error);
    } finally {
        await mongoose.disconnect();
    }
}

testRegistration(); 