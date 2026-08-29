const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true }, // primary login email
    emails: { type: [String], default: [] }, // additional emails (e.g. per-company)
    company: { type: String, default: "" }, // e.g. ADC, Volton, Vodafone
    department: { type: String, default: "" },
    phone: { type: String, default: "" },
    badgeQr: { type: String, default: "" },
    passwordHash: { type: String, select: false },
    role: { type: String, default: "user" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Employee", employeeSchema, "employees");
