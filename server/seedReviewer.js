const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedReviewer() {
    const email = process.env.REVIEWER_EMAIL?.trim().toLowerCase();
    const password = process.env.REVIEWER_PASSWORD;

    if (!email || !password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
        throw new Error("Provide an email and a password of 12-72 UTF-8 bytes");
    } 

    await mongoose.connect(process.env.MONGODB_URI);

    try {
        if (await User.exists({ email })) {
            console.log ("Reviewer account already exists");
            return;
        }
        await User.init(); // Ensure indexes are created before creating the a reviewer account
        await User.create({
            name: "Test Reviewer",
            email,
            passwordHash: await bcrypt.hash(password, 12),
            role: "reviewer",
        });
        
        console.log("Reviewer account created");
    } finally {
        await mongoose.disconnect();
    }
}

seedReviewer().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});