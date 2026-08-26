const crudFactory = require("./crudFactory");
const Category = require("../models/Category");

module.exports = crudFactory(Category, {
  requiredFields: ["name", "trackingType"],
});
