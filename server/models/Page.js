const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, 
    unique: true },
    content: { type: String, default: "" },
    status: {
        type: String,
        enum: ["draft", "published"],
        default: "draft",
    },
    
},
 { timestamps: true }
);

module.exports = mongoose.model("Page", pageSchema);