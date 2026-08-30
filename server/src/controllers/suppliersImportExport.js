const ExcelJS = require("exceljs");
const Supplier = require("../models/Supplier");
const { applyStandardSheetStyle } = require("../utils/excelStyle");

async function exportSuppliers(req, res) {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Furnitore");

    sheet.columns = [
      { header: "Emer subjekti", key: "name", width: 26 },
      { header: "Emer Mbiemer", key: "contactPerson", width: 22 },
      { header: "Telefon", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    suppliers.forEach((s) => {
      sheet.addRow({
        name: s.name || "",
        contactPerson: s.contactPerson || "",
        phone: s.phone || "",
        email: s.email || "",
        notes: s.notes || "",
      });
    });

    applyStandardSheetStyle(sheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=furnitore_export.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function importSuppliers(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let created = 0;
    let updated = 0;
    const skipped = [];

    // Column layout: 1 Emer subjekti | 2 Emer Mbiemer | 3 Telefon |
    // 4 Email | 5 Notes
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const get = (col) => (row.getCell(col).value ?? "").toString().trim();

      const name = get(1);
      const contactPerson = get(2);
      const phone = get(3);
      const email = get(4);
      const notes = get(5);

      if (!name) {
        skipped.push({ row: i, reason: "Emer subjekti (name) is required" });
        continue;
      }

      let supplier = await Supplier.findOne({
        name: new RegExp(`^${name}$`, "i"),
      });

      if (supplier) {
        if (contactPerson) supplier.contactPerson = contactPerson;
        if (phone) supplier.phone = phone;
        if (email) supplier.email = email;
        if (notes) supplier.notes = notes;
        await supplier.save();
        updated++;
      } else {
        await Supplier.create({ name, contactPerson, phone, email, notes });
        created++;
      }
    }

    res.json({ created, updated, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportSuppliers, importSuppliers };
