
const express = require("express");
const mongoose = require("mongoose");
const Page = require("./models/page");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

const app = express();
app.use(express.json());

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
}

app.use(
    session({
        name: "corporate.sid",
        secret: process.env.SESSION_SECRET,
        store:  MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 8 * 60 * 60 * 1000,
        },
    })
);




app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});


app.get("/api/pages", async (req, res) => {
    try {
        const pages = await Page.find({ status: "published" }).sort({ createdAt: -1 });
        res.json({ pages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not fetch pages." });
    }
});


app.get("/api/admin/pages", async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "Login required" });
    }

    try {
        const user = await User.exists({ _id: req.session.userId });
        if (!user) {
            return res.status(401).json({ error: "Login required" });
        }

        const pages = await Page.find(({ status: "draft" }))
        .sort({ createdAt: -1 });

      return res.json({ pages });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Could not fetch drafts" })
    }
});



app.get("/api/pages/:slug", async (req, res) => {
    try {
        const page = await Page.findOne({
            slug: req.params.slug,
            status: "published",
        });
        if (!page) {
            return res.status(404).json({ error: "Page not found" });
        }
        res.json({ page });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not fetch page." });
    }
});


app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "Login required" });
    }

    try {
        const user = await User.findById(req.session.userId).select("name email role");
        if (!user) {
            return res.status(401).json({ error: "Login required" });
        }

        return res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: "Could not fetch user data" });
    }
});


app.post("/api/pages", async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "Login required" });
    }

    const user = await User.findById(req.session.userId).select("role");

    if (!user || !["admin", "editor"].includes(user.role)) {
        return res.status(403).json({ error: "Permission denied" });
    }

    const { title, slug, content } = req.body ?? {};

    if (content !== undefined && typeof content !== "string") {
        return res.status(400).json({ error: "Content must be text" });
    }

    if (typeof title !== "string" || typeof slug !== "string") {
        return res.status(400).json({ error: "Title and slug are required" });
    }

    const cleanTitle = title.trim();
    const cleanSlug = slug.trim().toLowerCase();

    if (!cleanTitle || !cleanSlug) {
        return res.status(400).json({ error: "Title and slug cannot be empty" });
    }

   try {
    const page = await Page.create({
        title: cleanTitle,
        slug: cleanSlug,
        status: "draft",
        content: content ?? "",
    });

    return res.status(201).json({ page });
   } catch (error) {
    if (error.code === 11000) {
        return res.status(409).json({ error: "Slug already exists!" });
    }
    console.error(error);
    return res.status(500).json({ error: "Could not create page." })
   }
});


app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Email and password are required"});
    }

    try {
        const user = await User.findOne({
            email: email.trim().toLowerCase(),
        }).select("+passwordHash");

        const validPassword = user 
        ? await bcrypt.compare(password, user.passwordHash) 
        : false;

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        return req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({ error: "Could not start session", });
            }

            req.session.userId = user.id;

            req.session.save((error) => {
                if (error) {
                    return res.status(500).json({ error: "Could not save session", 
                    });
                }

                return res.json({ message: "Login successful" });
            });
        });
    } catch (error) {
        return res.status(500).json({ error: "Could not verify credentials", 
        });
    }
});


app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({ error: "Could not log out" });
        }

        res.clearCookie("corporate.sid", { path: "/" });
        return res.json({ message: "Logged out successfully" });
    });
});



app.patch("/api/admin/pages/:id/publish", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    const user = await User.findById(req.session.userId).select("role");
    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }
    if (!["admin", "reviewer"].includes(user.role)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid page ID" });
    }

    const page = await Page.findOneAndUpdate(
      { _id: req.params.id, status: "draft" },
      { $set: { status: "published" } },
      { new: true }
    );

    if (!page) {
      return res.status(404).json({ error: "Draft not found" });
    }

    return res.json({ page });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not publish page" });
  }
});



app.patch("/api/admin/pages/:id", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    const user = await User.findById(req.session.userId).select("role");
    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }
    if (!["admin", "editor"].includes(user.role)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid page ID" });
    }

    const { content } = req.body ?? {};
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const page = await Page.findOneAndUpdate(
      { _id: req.params.id, status: "draft" },
      { $set: { content: content.trim() } },
      { new: true, runValidators: true }
    );

    if (!page) {
      return res.status(404).json({ error: "Draft not found" });
    }

    return res.json({ page });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not update draft" });
  }
});



const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        await Page.init(); // Ensure indexes are created before starting the server
        console.log("Connected to MongoDB");

        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
 }   catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

startServer();







