const crudFactory = require("./crudFactory");
const Supplier = require("../models/Supplier");

module.exports = crudFactory(Supplier, {
  requiredFields: ["name"],
});
