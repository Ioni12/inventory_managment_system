const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Product = require("../models/Product");
const { buildNePerdorimRows } = require("./nePerdorimController");
const {
  findOrCreateGroup,
  moveUnits,
  findGroupWithSerial,
} = require("../utils/productGroups");
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
      { header: "Sasia", key: "sasia", width: 8 },
      { header: "Serial", key: "serial", width: 18 },
      { header: "Emails", key: "email", width: 34 },
      { header: "Nr.telefoni", key: "nrTelefoni", width: 16 },
      { header: "Badge + QR Code", key: "badgeQr", width: 18 },
    ];

    rows.forEach((r) => {
      sheet.addRow({
        nr: r.nr,
        emerMbiemer: r.emerMbiemer,
        kompani: r.kompani,
        departamenti: r.departamenti,
        assetId: r.assetId,
        sasia: r.sasia,
        serial: r.serial || "",
        email: r.email,
        nrTelefoni: r.nrTelefoni,
        badgeQr: r.badgeQr,
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
// Row semantics for the Sasia + Serial columns mirror the Products
// import: a row with a Serial represents exactly ONE physical unit
// (Sasia must be 1 or blank). Serial handling is checked against the
// WHOLE product, not just the source bucket:
//   - not found anywhere on the product -> tag it onto the unassigned
//     ("Ne magazine", no holder) source group, then move it to the
//     employee along with the quantity, in one step.
//   - already sitting in the unassigned source group -> normal case,
//     it moves along with the quantity.
//   - already sitting in the exact destination (this employee's "Ne
//     perdorim" group) -> already satisfied, counted as a no-op.
//   - found in some OTHER group (different holder, in repair, etc.)
//     -> conflict, row is skipped with an error.
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
    const noop = [];

    // Column layout:
    // 1 Nr. | 2 Emer Mbiemer | 3 Kompani | 4 Departamenti | 5 Asset ID |
    // 6 Sasia | 7 Serial | 8 Emails | 9 Nr.telefoni | 10 Badge + QR Code
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const get = (col) => (row.getCell(col).value ?? "").toString().trim();

      const emerMbiemer = get(2);
      const kompani = get(3);
      const departamenti = get(4);
      const assetId = get(5);
      const sasiaRaw = get(6);
      const serial = get(7);
      const emailsRaw = get(8);
      const nrTelefoni = get(9);
      const badgeQr = get(10);

      const emailList = emailsRaw
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean);
      const primaryEmail = emailList[0] || "";
      const extraEmails = emailList.slice(1);

      let sasia;
      if (serial) {
        // A serial row is exactly one physical unit — never silently
        // truncate a larger Sasia value.
        if (sasiaRaw && Number(sasiaRaw) !== 1) {
          skipped.push({
            row: i,
            reason: `Row has a Serial but Sasia is ${sasiaRaw} (must be 1 or blank for a serialized row)`,
          });
          continue;
        }
        sasia = 1;
      } else {
        if (!sasiaRaw) {
          skipped.push({ row: i, reason: "Missing Sasia (quantity) column" });
          continue;
        }
        sasia = Number(sasiaRaw);
        if (!Number.isFinite(sasia) || sasia <= 0) {
          skipped.push({ row: i, reason: `Invalid Sasia value: ${sasiaRaw}` });
          continue;
        }
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

      const serialsToMove = [];
      if (serial) {
        const destGroupCandidate = findOrCreateGroup(
          product,
          "Ne perdorim",
          employee._id,
        );
        const existingSerialGroup = findGroupWithSerial(product, serial);

        if (existingSerialGroup && existingSerialGroup === destGroupCandidate) {
          noop.push({
            row: i,
            reason: `Serial "${serial}" already assigned to ${employee.firstName} ${employee.lastName} — no change`,
          });
          continue;
        }
        if (existingSerialGroup && existingSerialGroup !== sourceGroup) {
          skipped.push({
            row: i,
            reason: `Serial "${serial}" is already recorded elsewhere on this product (different status/holder)`,
          });
          continue;
        }
        if (!existingSerialGroup) {
          // Not tagged yet anywhere — tag it onto the unassigned source
          // group now, then move it below along with the quantity.
          sourceGroup.serials.push(serial);
        }
        serialsToMove.push(serial);
      }

      moveUnits(
        product,
        sourceGroup,
        { status: "Ne perdorim", currentHolder: employee._id },
        sasia,
        serialsToMove,
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
          ...(serialsToMove.length ? { serials: serialsToMove } : {}),
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
        noop,
        skipped,
      },
    });

    res.json({
      employeesCreated,
      employeesUpdated,
      assignmentsCreated,
      noop,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportNePerdorim, importNePerdorim };
