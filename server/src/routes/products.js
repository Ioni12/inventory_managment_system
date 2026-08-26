const crudFactory = require("./crudFactory");
const Product = require("../models/Product");

module.exports = crudFactory(Product, {
  requiredFields: ["name", "category"],
  populate: "category supplier",
});
