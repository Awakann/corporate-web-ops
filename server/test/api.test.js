const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const databaseName = `corporate_web_ops_test_${randomUUID().replaceAll("-", "")}`;
const origin = "http://localhost:8080";
const password = "Test-only-password-2026!";

// Override configuration before importing the application.
// Always use a fresh database on the local Docker MongoDB.
process.env.NODE_ENV = "test";
process.env.TRUST_PROXY_HOPS = "0";
process.env.APP_ORIGINS = origin;
process.env.SESSION_SECRET = randomUUID();
process.env.MONGODB_URI =
  `mongodb://127.0.0.1:27018/${databaseName}`;

const User = require("../models/User");
const Page = require("../models/Page");

let app;
let sessionStore;

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  await Promise.all([User.init(), Page.init()]);

  ({ app, sessionStore } = require("../server"));

  const passwordHash = await bcrypt.hash(password, 10);

  await User.insertMany(
    ["admin", "editor", "reviewer"].map((role) => ({
      name: `Test ${role}`,
      email: `${role}@example.invalid`,
      passwordHash,
      role,
    }))
  );
}, { timeout: 30000 });

after(async () => {
  try {
    if (sessionStore) {
      await sessionStore.close();
    }

    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, databaseName);
      assert.match(databaseName, /^corporate_web_ops_test_[a-f0-9]{32}$/);
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
  }
});

async function login(role) {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: `${role}@example.invalid`, password })
    .expect(200);

  return agent;
}

test("anonymous visitors cannot access staff operations", async () => {
  const id = new mongoose.Types.ObjectId().toString();

  await request(app).get("/api/auth/me").expect(401);
  await request(app).get("/api/admin/pages").expect(401);

  await request(app)
    .post("/api/pages")
    .set("Origin", origin)
    .send({ title: "Private", slug: "private" })
    .expect(401);

  await request(app)
    .patch(`/api/admin/pages/${id}`)
    .set("Origin", origin)
    .send({ content: "Unauthorized edit" })
    .expect(401);

  await request(app)
    .patch(`/api/admin/pages/${id}/publish`)
    .set("Origin", origin)
    .expect(401);
});

test("state-changing requests require an allowed origin", async () => {
  const credentials = {
    email: "admin@example.invalid",
    password,
  };

  await request(app)
    .post("/api/auth/login")
    .send(credentials)
    .expect(403);

  await request(app)
    .post("/api/auth/login")
    .set("Origin", "https://untrusted.example")
    .send(credentials)
    .expect(403);
});

test("login persists a session and logout invalidates it", async () => {
  await request(app)
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({
      email: "admin@example.invalid",
      password: "incorrect-password",
    })
    .expect(401);

  const agent = await login("admin");
  const response = await agent.get("/api/auth/me").expect(200);

  assert.equal(response.body.user.role, "admin");
  assert.equal(response.body.user.email, "admin@example.invalid");
  assert.equal(response.body.user.passwordHash, undefined);

  await agent
    .post("/api/auth/logout")
    .set("Origin", origin)
    .expect(200);

  await agent.get("/api/auth/me").expect(401);
  await agent.get("/api/admin/pages").expect(401);
});

test("editor creates and edits; reviewer publishes; drafts stay private", async () => {
  const editor = await login("editor");
  const reviewer = await login("reviewer");

  const created = await editor
    .post("/api/pages")
    .set("Origin", origin)
    .send({
      title: "Workflow test",
      slug: "workflow-test",
      content: "Initial content",
      status: "published",
    })
    .expect(201);

  const id = created.body.page._id;
  assert.equal(created.body.page.status, "draft");

  const drafts = await reviewer.get("/api/admin/pages").expect(200);
  assert.ok(drafts.body.pages.some((page) => page._id === id));

  await request(app).get("/api/pages/workflow-test").expect(404);

  const publicBefore = await request(app).get("/api/pages").expect(200);
  assert.ok(!publicBefore.body.pages.some((page) => page._id === id));

  await reviewer
    .post("/api/pages")
    .set("Origin", origin)
    .send({ title: "Denied", slug: "reviewer-denied" })
    .expect(403);

  await reviewer
    .patch(`/api/admin/pages/${id}`)
    .set("Origin", origin)
    .send({ content: "Reviewer edit must fail" })
    .expect(403);

  await editor
    .patch(`/api/admin/pages/${id}/publish`)
    .set("Origin", origin)
    .expect(403);

  const unchanged = await Page.findById(id);
  assert.equal(unchanged.status, "draft");
  assert.equal(unchanged.content, "Initial content");

  await editor
    .patch(`/api/admin/pages/${id}`)
    .set("Origin", origin)
    .send({ content: "Approved content" })
    .expect(200);

  const published = await reviewer
    .patch(`/api/admin/pages/${id}/publish`)
    .set("Origin", origin)
    .expect(200);

  assert.equal(published.body.page.status, "published");

  const publicPage = await request(app)
    .get("/api/pages/workflow-test")
    .expect(200);

  assert.equal(publicPage.body.page.content, "Approved content");

  const publicAfter = await request(app).get("/api/pages").expect(200);
  assert.ok(publicAfter.body.pages.some((page) => page._id === id));

  const remaining = await editor.get("/api/admin/pages").expect(200);
  assert.ok(!remaining.body.pages.some((page) => page._id === id));

  await editor
    .patch(`/api/admin/pages/${id}`)
    .set("Origin", origin)
    .send({ content: "Published page edit must fail" })
    .expect(404);

  await reviewer
    .patch(`/api/admin/pages/${id}/publish`)
    .set("Origin", origin)
    .expect(404);
});

test("admin can create, edit, and publish; duplicate slugs are rejected", async () => {
  const admin = await login("admin");

  const created = await admin
    .post("/api/pages")
    .set("Origin", origin)
    .send({ title: "Admin test", slug: "admin-test" })
    .expect(201);

  const id = created.body.page._id;

  await admin
    .post("/api/pages")
    .set("Origin", origin)
    .send({ title: "Duplicate", slug: "admin-test" })
    .expect(409);

  await admin
    .patch(`/api/admin/pages/${id}`)
    .set("Origin", origin)
    .send({ content: "Admin content" })
    .expect(200);

  await admin
    .patch(`/api/admin/pages/${id}/publish`)
    .set("Origin", origin)
    .expect(200);

  const response = await request(app)
    .get("/api/pages/admin-test")
    .expect(200);

  assert.equal(response.body.page.content, "Admin content");
});