const Employee = require("../models/Employee");

/**
 * Gates a route to logged-in employees with role: 'admin'. Must run
 * AFTER requireAuth (relies on req.session.userId already being set).
 *
 * This is the first real role-based gate in the codebase — role-based
 * write restrictions elsewhere (Categories/Suppliers/Employees CRUD)
 * were designed but never implemented (see handoff doc open item #1).
 * Only the Suppliers import route uses this so far; applying it more
 * broadly is a separate decision, not made here.
 */
async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const employee = await Employee.findById(req.session.userId);
  if (!employee || employee.role !== "admin") {
    return res.status(403).json({ error: "Admin role required" });
  }

  next();
}

module.exports = requireAdmin;
