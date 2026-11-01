const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function resetPassword() {
  try {
    const email = process.env.RESET_EMAIL?.trim().toLowerCase();
    const password = process.env.RESET_PASSWORD;

    if (!email || !password || password.length < 12) {
      throw new Error("Email and a password of at least 12 characters are required");
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("Password must not exceed 72 bytes");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await User.updateOne(
      { email },
      { $set: { passwordHash } },
      { runValidators: true }
    );

    if (result.matchedCount === 0) {
      throw new Error("Account not found");
    }

    console.log("Password reset successfully");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();