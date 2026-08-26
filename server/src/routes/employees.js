const crudFactory = require("./crudFactory");
const Employee = require("../models/Employee");

module.exports = crudFactory(Employee, {
  requiredFields: ["firstName", "lastName"],
});
