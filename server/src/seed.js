require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("./config/db");

const Category = require("./models/Category");
const Supplier = require("./models/Supplier");
const Product = require("./models/Product");
const Employee = require("./models/Employee");
const { ensureUniqueAssetId } = require("./utils/assetId");

// NOTE: Location and AssetUnit are intentionally NOT seeded here.
// AssetUnit is fully deprecated (per-serial tracking was dropped in
// favor of Product.groups[]) and Location is orphaned (not referenced
// by Product or anything else) — see the project handoff doc's Open
// Items. Seeding either would just create dead data.

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Product.deleteMany({}),
    Employee.deleteMany({}),
  ]);

  console.log("Seeding categories...");
  const [laptops, phones, accessories] = await Category.create([
    { name: "Laptops", description: "Company laptops" },
    { name: "Phones", description: "Company mobile phones" },
    { name: "Accessories", description: "Cables, mice, chargers" },
  ]);

  console.log("Seeding suppliers...");
  const [supplier] = await Supplier.create([
    {
      name: "TechSource ADC",
      contactPerson: "Arben Krasniqi",
      phone: "+355 69 000 0000",
      email: "sales@techsource.example",
      notes: "Primary hardware vendor",
    },
  ]);

  console.log("Seeding employees...");
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const employeePasswordHash = await bcrypt.hash("Employee123!", 10);
  const [admin, staff] = await Employee.create([
    {
      firstName: "Esmeralda",
      lastName: "Osmani",
      email: "admin@adc.local",
      passwordHash: adminPasswordHash,
      role: "admin",
      company: "ADC",
      department: "IT",
    },
    {
      firstName: "Test",
      lastName: "Employee",
      email: "employee@adc.local",
      passwordHash: employeePasswordHash,
      role: "user",
      company: "ADC",
      department: "Operations",
    },
  ]);

  console.log("Seeding products...");

  // ThinkPad: 1 unit in Ne magazine (unassigned), 1 unit assigned to admin.
  const thinkpadAssetId = await ensureUniqueAssetId(Product, "assetId");
  const thinkpad = await Product.create({
    name: "ThinkPad T14",
    assetId: thinkpadAssetId,
    category: laptops._id,
    supplier: supplier._id,
    branding: "ADC",
    unit: "piece",
    purchasePrice: 850,
    description: '14" business laptop',
    groups: [
      { quantity: 1, status: "Ne magazine", currentHolder: null },
      { quantity: 1, status: "Ne perdorim", currentHolder: admin._id },
    ],
  });

  // iPhone: 1 unit assigned to staff.
  const iphoneAssetId = await ensureUniqueAssetId(Product, "assetId");
  const iphone = await Product.create({
    name: "iPhone 13",
    assetId: iphoneAssetId,
    category: phones._id,
    supplier: supplier._id,
    branding: "ADC",
    unit: "piece",
    purchasePrice: 700,
    description: "Company mobile phone",
    groups: [{ quantity: 1, status: "Ne perdorim", currentHolder: staff._id }],
  });

  // Mouse: pure accessory, all unassigned in warehouse stock.
  const mouseAssetId = await ensureUniqueAssetId(Product, "assetId");
  const mouse = await Product.create({
    name: "Logitech M170 Mouse",
    assetId: mouseAssetId,
    category: accessories._id,
    supplier: supplier._id,
    branding: "ADC",
    unit: "piece",
    purchasePrice: 12,
    description: "Wireless mouse",
    groups: [{ quantity: 10, status: "Ne magazine", currentHolder: null }],
  });

  console.log("Seed complete.");
  console.log(
    `Created: ${thinkpad.assetId}, ${iphone.assetId}, ${mouse.assetId}`,
  );
  console.log("Admin login: admin@adc.local / Admin123!");
  console.log("Employee login: employee@adc.local / Employee123!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
