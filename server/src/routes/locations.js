const crudFactory = require("./crudFactory");
const Location = require("../models/Location");

module.exports = crudFactory(Location, {
  requiredFields: ["name"],
});
