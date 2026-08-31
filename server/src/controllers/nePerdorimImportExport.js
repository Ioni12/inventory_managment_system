const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Product = require("../models/Product");
const { buildNePerdorimRows } = require("./nePerdorimController");
const { findOrCreateGroup, moveUnits } = require("../utils/productGroups");
const { isValidAssetId } = require("../utils/assetId");
const { applyStandardSheetStyle } = require("../utils/excelStyle");
const { logAction, diffFields } = require("../utils/logAction");

async function exportNePerdorim(req, res) {
  try {
    const rows = await buildNePerdorimRows();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ne Perdorim");

    sheet.columns = [
      { header: "Nr.", key: "nr", width: 6 },
      { header: "Emer Mbiemer", key: "emerMbiemer", width: 24 },
      { header: "Kompani", key: "kompani", width: 16 },
      { header: "Departamenti", key: "departamenti", width: 18 },
      { header: "Asset ID", key: "assetId", width: 16 },
      { header: "Emails", key: "email", width: 34 },
      { header: "Nr.telefoni", key: "nrTelefoni", width: 16 },
      { header: "Badge + QR Code", key: "badgeQr", width: 18 },
      { header: "Sasia", key: "sasia", width: 8 },
    ];

    rows.forEach((r) => {
      sheet.addRow({
        nr: r.nr,
        emerMbiemer: r.emerMbiemer,
        kompani: r.kompani,
        departamenti: r.departamenti,
        assetId: r.assetId,
        email: r.email,
        nrTelefoni: r.nrTelefoni,
        badgeQr: r.badgeQr,
        sasia: r.sasia,
      });
    });

    applyStandardSheetStyle(sheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ne_perdorim_export.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/products/ne-perdorim/import
//
// Logging: one 'import-summary' line for the whole run, plus per-row
// lines — a 'create'/'update' on the Employee touched, and an 'assign'
// on the resulting Group action — each with a real diff/detail payload.
// All lines share a batchId.
async function importNePerdorim(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const batchId = new mongoose.Types.ObjectId();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let employeesCreated = 0;
    let employeesUpdated = 0;
    let assignmentsCreated = 0;
    const skipped = [];

    // Column layout (no Nr. Serial, single Emails column):
    // 1 Nr. | 2 Emer Mbiemer | 3 Kompani | 4 Departamenti | 5 Asset ID |
    // 6 Emails | 7 Nr.telefoni | 8 Badge + QR Code | 9 Sasia
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const get = (col) => (row.getCell(col).value ?? "").toString().trim();

      const emerMbiemer = get(2);
      const kompani = get(3);
      const departamenti = get(4);
      const assetId = get(5);
      const emailsRaw = get(6);
      const nrTelefoni = get(7);
      const badgeQr = get(8);
      const sasiaRaw = get(9);

      const emailList = emailsRaw
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean);
      const primaryEmail = emailList[0] || "";
      const extraEmails = emailList.slice(1);

      if (!sasiaRaw) {
        skipped.push({ row: i, reason: "Missing Sasia (quantity) column" });
        continue;
      }
      const sasia = Number(sasiaRaw);
      if (!Number.isFinite(sasia) || sasia <= 0) {
        skipped.push({ row: i, reason: `Invalid Sasia value: ${sasiaRaw}` });
        continue;
      }

      if (!assetId || !isValidAssetId(assetId)) {
        skipped.push({
          row: i,
          reason: `Invalid or missing Asset ID: ${assetId}`,
        });
        continue;
      }
      const product = await Product.findOne({ assetId: assetId.toUpperCase() });
      if (!product) {
        skipped.push({ row: i, reason: `Asset ID ${assetId} not found` });
        continue;
      }

      // Resolve employee: try every address in the row's email list
      // against both `email` (primary) and `emails[]` (secondary).
      let employee = null;
      for (const addr of emailList) {
        employee = await Employee.findOne({
          $or: [{ email: addr }, { emails: addr }],
        });
        if (employee) break;
      }

      let employeeIsNew = false;
      let beforeSnapshot = null;

      if (employee) {
        beforeSnapshot = {
          company: employee.company,
          department: employee.department,
          phone: employee.phone,
          badgeQr: employee.badgeQr,
          emails: [...employee.emails],
        };
      } else if (emerMbiemer && kompani) {
        const [firstName, ...rest] = emerMbiemer.split(" ");
        const lastName = rest.join(" ");
        employee = await Employee.findOne({
          firstName,
          lastName,
          company: kompani,
        });
        if (employee) {
          beforeSnapshot = {
            company: employee.company,
            department: employee.department,
            phone: employee.phone,
            badgeQr: employee.badgeQr,
            emails: [...employee.emails],
          };
        }
      }

      if (employee) {
        if (kompani) employee.company = kompani;
        if (departamenti) employee.department = departamenti;
        if (nrTelefoni) employee.phone = nrTelefoni;
        if (badgeQr) employee.badgeQr = badgeQr;
        // Append any addresses not already known — never touch
        // employee.email here (login-critical), only emails[].
        for (const addr of emailList) {
          if (addr !== employee.email && !employee.emails.includes(addr)) {
            employee.emails.push(addr);
          }
        }
        await employee.save();
        employeesUpdated++;

        const afterSnapshot = {
          company: employee.company,
          department: employee.department,
          phone: employee.phone,
          badgeQr: employee.badgeQr,
          emails: employee.emails.join(", "),
        };
        beforeSnapshot.emails = beforeSnapshot.emails.join(", ");
        const changes = diffFields(beforeSnapshot, afterSnapshot);
        if (Object.keys(changes).length > 0) {
          await logAction({
            req,
            batchId,
            action: "update",
            entityType: "Employee",
            entityId: employee._id,
            entityLabel: `${employee.firstName} ${employee.lastName}`,
            changes,
          });
        }
      } else {
        if (!emerMbiemer) {
          skipped.push({
            row: i,
            reason: "No matching employee and no name to create one",
          });
          continue;
        }
        const [firstName, ...rest] = emerMbiemer.split(" ");
        const lastName = rest.join(" ") || firstName;
        employee = await Employee.create({
          firstName,
          lastName,
          email: primaryEmail || undefined,
          emails: extraEmails,
          company: kompani,
          department: departamenti,
          phone: nrTelefoni,
          badgeQr,
          role: "user",
        });
        employeesCreated++;
        employeeIsNew = true;

        await logAction({
          req,
          batchId,
          action: "create",
          entityType: "Employee",
          entityId: employee._id,
          entityLabel: `${employee.firstName} ${employee.lastName}`,
          changes: {
            firstName,
            lastName,
            email: primaryEmail,
            emails: extraEmails.join(", "),
            company: kompani,
            department: departamenti,
            phone: nrTelefoni,
            badgeQr,
          },
        });
      }

      const sourceGroup = product.groups.find(
        (g) => g.status === "Ne magazine" && !g.currentHolder,
      );
      const available = sourceGroup ? sourceGroup.quantity : 0;
      if (available < sasia) {
        skipped.push({
          row: i,
          reason: `Insufficient stock for ${assetId}: requested ${sasia}, available ${available}`,
        });
        continue;
      }
      moveUnits(
        product,
        sourceGroup,
        findOrCreateGroup(product, "Ne perdorim", employee._id),
        sasia,
      );
      await product.save();
      assignmentsCreated++;

      await logAction({
        req,
        batchId,
        action: "assign",
        entityType: "Group",
        entityId: product._id,
        entityLabel: `${product.name} (${product.assetId}) -> ${employee.firstName} ${employee.lastName}`,
        changes: {
          quantity: sasia,
          fromStatus: "Ne magazine",
          toStatus: "Ne perdorim",
          holder: `${employee.firstName} ${employee.lastName}`,
        },
      });
    }

    await logAction({
      req,
      batchId,
      action: "import-summary",
      entityType: "Employee",
      entityLabel: req.file.originalname || "ne perdorim import",
      changes: {
        filename: req.file.originalname,
        employeesCreated,
        employeesUpdated,
        assignmentsCreated,
        skipped,
      },
    });

    res.json({
      employeesCreated,
      employeesUpdated,
      assignmentsCreated,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportNePerdorim, importNePerdorim };
