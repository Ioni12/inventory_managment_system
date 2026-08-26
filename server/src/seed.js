require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("./config/db");

const Category = require("./models/Category");
const Supplier = require("./models/Supplier");
const Product = require("./models/Product");
const Employee = require("./models/Employee");
const Location = require("./models/Location");
const AssetUnit = require("./models/AssetUnit");

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Product.deleteMany({}),
    Employee.deleteMany({}),
    Location.deleteMany({}),
    AssetUnit.deleteMany({}),
  ]);

  console.log("Seeding categories...");
  const [laptops, phones, accessories] = await Category.create([
    { name: "Laptops", trackingType: "serial", description: "Company laptops" },
    {
      name: "Phones",
      trackingType: "serial",
      description: "Company mobile phones",
    },
    {
      name: "Accessories",
      trackingType: "quantity",
      description: "Cables, mice, chargers",
    },
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

  console.log("Seeding locations...");
  const [mainOffice, warehouse] = await Location.create([
    { name: "Main Office" },
    { name: "Warehouse" },
  ]);

  console.log("Seeding employees...");
  const passwordHash = await bcrypt.hash("Admin123!", 10);
  const [admin, staff] = await Employee.create([
    {
      firstName: "Esmeralda",
      lastName: "Osmani",
      email: "admin@adc.local",
      passwordHash,
      role: "admin",
    },
    {
      firstName: "Test",
      lastName: "Employee",
      email: "employee@adc.local",
      passwordHash: await bcrypt.hash("Employee123!", 10),
      role: "user",
    },
  ]);

  console.log("Seeding products...");
  const [thinkpad, iphone] = await Product.create([
    {
      name: "ThinkPad T14",
      type: "Laptop",
      sku: "LT-T14",
      category: laptops._id,
      supplier: supplier._id,
      unit: "piece",
      purchasePrice: 850,
      salePrice: 0,
      minStock: 2,
      description: '14" business laptop',
    },
    {
      name: "iPhone 13",
      type: "Phone",
      sku: "PH-IP13",
      category: phones._id,
      supplier: supplier._id,
      unit: "piece",
      purchasePrice: 700,
      salePrice: 0,
      minStock: 1,
      description: "Company mobile phone",
    },
  ]);

  console.log("Seeding asset units...");
  await AssetUnit.create([
    {
      product: thinkpad._id,
      assetCode: "IT-0001",
      serial: "SN-TP-0001",
      status: "assigned",
      condition: "good",
      holderType: "employee",
      holder: admin._id,
      location: mainOffice._id,
      purchaseDate: new Date("2025-01-15"),
      warrantyUntil: new Date("2027-01-15"),
      accessories: "Charger, sleeve",
    },
    {
      product: thinkpad._id,
      assetCode: "IT-0002",
      serial: "SN-TP-0002",
      status: "in_stock",
      condition: "new",
      holderType: "none",
      location: warehouse._id,
      purchaseDate: new Date("2025-06-01"),
      warrantyUntil: new Date("2027-06-01"),
    },
    {
      product: iphone._id,
      assetCode: "IT-0003",
      serial: "SN-IP-0001",
      imei: "000000000000000",
      status: "assigned",
      condition: "good",
      holderType: "employee",
      holder: staff._id,
      location: mainOffice._id,
      purchaseDate: new Date("2025-03-10"),
      warrantyUntil: new Date("2026-03-10"),
    },
  ]);

  console.log("Seed complete.");
  console.log("Admin login: admin@adc.local / Admin123!");
  console.log("Employee login: employee@adc.local / Employee123!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
