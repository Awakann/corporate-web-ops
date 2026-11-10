
const express = require("express");
const mongoose = require("mongoose");
const Page = require("./models/Page");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const path = require("node:path");

const { rateLimit } = require("express-rate-limit");

const app = express();

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  next();
});

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});


const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");

if (!Number.isInteger(proxyHops) || proxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
}

app.set("trust proxy", proxyHops);

const allowedOrigins = new Set(
  (process.env.APP_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (allowedOrigins.size === 0) {
  throw new Error("APP_ORIGINS is required");
}

app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("Origin");

  if (!origin || !allowedOrigins.has(origin)) {
    return res.status(403).json({
      error: "Request origin is not allowed",
    });
  }

  return next();
});

app.use(express.json());

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
}



const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
});



app.use(
    session({
        name: "corporate.sid",
        secret: process.env.SESSION_SECRET,
        store:  sessionStore,
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



const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many failed login attempts. Try again in 15 minutes.",
  },
});


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


app.post("/api/auth/login", loginLimiter, async (req, res) => {
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




function changePublicationStatus(from, to, missingMessage) {
  return async (req, res) => {
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
      if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({ error: "Invalid page ID" });
      }

      const page = await Page.findOneAndUpdate(
        { _id: req.params.id, status: from },
        { $set: { status: to } },
        { returnDocument: "after", runValidators: true }
      );

      if (!page) {
        return res.status(404).json({ error: missingMessage });
      }

      return res.json({ page });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Could not change publication status",
      });
    }
  };
}

app.patch(
  "/api/admin/pages/:id/publish",
  changePublicationStatus("draft", "published", "Draft not found")
);

app.patch(
  "/api/admin/pages/:id/unpublish",
  changePublicationStatus("published", "draft", "Published page not found")
);



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
      { returnDocument: "after", runValidators: true }
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


    if (process.env.SERVE_CLIENT === "true") {
    const clientDir = path.join(__dirname, "client-dist");

    app.use("/api", (_req, res) => {
        res.status(404).json({ error: "API route not found" });
    });

    app.use(express.static(clientDir));

    app.get("/{*path}", (_req, res) => {
        res.sendFile(path.join(clientDir, "index.html"));
    });
    }



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

if (require.main === module) {
  startServer();
}

module.exports = { app, sessionStore };







