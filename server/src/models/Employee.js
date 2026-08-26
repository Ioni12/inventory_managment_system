const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, default: "user" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Employee", employeeSchema, "employees");
