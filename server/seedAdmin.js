const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
        throw new Error("Provide an email and a password of 12-72 UTF-8 bytes");
    } 

    await mongoose.connect(process.env.MONGODB_URI);

    try {
        if (await User.exists({ role: "admin" })) {
            console.log ("An admin user account already exists");
            return;
        }
        await User.init(); // Ensure indexes are created before creating the admin user
        await User.create({
            name: "Site Admin",
            email,
            passwordHash: await bcrypt.hash(password, 12),
            role: "admin",
        });
        
        console.log("Admin User Account created");
    } finally {
        await mongoose.disconnect();
    }
}

seedAdmin().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});