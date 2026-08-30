require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const connectDB = require("./config/db");
const requireAuth = require("./middleware/requireAuth");

const authRoutes = require("./routes/auth");
const categoriesRoutes = require("./routes/categories");
const suppliersRoutes = require("./routes/suppliers");
const productsRoutes = require("./routes/products");
const nePerdorimRoutes = require("./routes/nePerdorim");
const employeesRoutes = require("./routes/employees");
const locationsRoutes = require("./routes/locations");
const assetUnitsRoutes = require("./routes/assetUnits");

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

// Auth routes are open (login must work before a session exists)
app.use("/api/auth", authRoutes);

// Everything below requires a logged-in session
// NOTE: /api/products/ne-perdorim must be mounted BEFORE /api/products —
// Express matches app.use() by path prefix in registration order, so
// mounting /api/products first would swallow /ne-perdorim requests into
// productsRoutes, where the generic crudFactory's GET /:id route would
// try (and fail) to cast "ne-perdorim" as a Mongo ObjectId, causing a 400.
app.use("/api/categories", requireAuth, categoriesRoutes);
app.use("/api/suppliers", requireAuth, suppliersRoutes);
app.use("/api/products/ne-perdorim", requireAuth, nePerdorimRoutes);
app.use("/api/products", requireAuth, productsRoutes);
app.use("/api/employees", requireAuth, employeesRoutes);
app.use("/api/locations", requireAuth, locationsRoutes);
app.use("/api/asset-units", requireAuth, assetUnitsRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
