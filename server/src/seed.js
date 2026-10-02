const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const bcrypt = require("bcrypt");
const connectDB = require("./config/db");
const Employee = require("./models/Employee");

// Creates the initial admin user, but only if there are no employees yet.
// Everything else (categories, suppliers, products) starts blank.
// Does NOT connect to the DB or exit the process — the caller does that.
async function seed() {
  const existing = await Employee.countDocuments();
  if (existing > 0) {
    console.log("Employees already exist, skipping admin creation.");
    return;
  }

  console.log("Creating admin user...");
  const passwordHash = await bcrypt.hash("Admin123!", 10);
  await Employee.create({
    firstName: "Esmeralda",
    lastName: "Osmani",
    email: "admin@adc.local",
    passwordHash,
    role: "admin",
    company: "ADC",
    department: "IT",
  });

  console.log("Admin login: admin@adc.local / Admin123!");
}

module.exports = seed;

// `node seed.js` still works manually (same safe behavior).
if (require.main === module) {
  connectDB()
    .then(() => seed())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
