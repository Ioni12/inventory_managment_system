const ExcelJS = require("exceljs");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");

const EXPORT_COLUMNS = [
  { header: "Name", key: "name", width: 25 },
  { header: "Type", key: "type", width: 15 },
  { header: "SKU", key: "sku", width: 15 },
  { header: "Category", key: "categoryName", width: 18 },
  { header: "Supplier", key: "supplierName", width: 18 },
  { header: "Unit", key: "unit", width: 10 },
  { header: "Purchase Price", key: "purchasePrice", width: 15 },
  { header: "Sale Price", key: "salePrice", width: 12 },
  { header: "Min Stock", key: "minStock", width: 10 },
  { header: "Stock", key: "stock", width: 10 },
  { header: "Branding", key: "branding", width: 15 },
  { header: "Description", key: "description", width: 30 },
];

const IMPORT_SHEET_NAME = "Asete gjendje";

// GET /api/products/export
async function exportProducts(req, res) {
  try {
    const products = await Product.find().populate("category supplier");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Products");
    sheet.columns = EXPORT_COLUMNS;

    products.forEach((p) => {
      sheet.addRow({
        name: p.name,
        type: p.type,
        sku: p.sku,
        categoryName: p.category?.name || "",
        supplierName: p.supplier?.name || "",
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        minStock: p.minStock,
        stock: p.stock,
        branding: p.branding,
        description: p.description,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function buildColumnIndex(sheet) {
  const headerRow = sheet.getRow(1).values; // 1-indexed, [0] is empty
  const colIndex = {};
  headerRow.forEach((val, idx) => {
    if (!val) return;
    colIndex[String(val).trim().toLowerCase()] = idx;
  });
  return colIndex;
}

function cellGetter(colIndex) {
  return (row, label) => {
    const idx = colIndex[label.toLowerCase()];
    if (!idx) return undefined;
    const cell = row.getCell(idx).value;
    return cell === null || cell === undefined ? "" : String(cell).trim();
  };
}

async function resolveCategory(name) {
  if (!name) return null;
  let category = await Category.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!category) {
    category = await Category.create({ name, trackingType: "quantity" });
  }
  return category._id;
}

async function resolveSupplier(name) {
  if (!name) return null;
  let supplier = await Supplier.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!supplier) {
    supplier = await Supplier.create({ name });
  }
  return supplier._id;
}

// POST /api/products/import
async function importProducts(req, res) {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No file uploaded (field name must be "file")' });
  }

  const results = { created: 0, updated: 0, skipped: [] };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet =
      workbook.getWorksheet(IMPORT_SHEET_NAME) || workbook.worksheets[0];

    const colIndex = buildColumnIndex(sheet);
    const get = cellGetter(colIndex);

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const name = get(row, "Marka/modeli") || get(row, "Name");

      if (!name) {
        results.skipped.push({ row: rowNum, reason: "Missing product name" });
        continue;
      }

      const categoryId = await resolveCategory(
        get(row, "Kategoria") || get(row, "Category"),
      );
      const supplierId = await resolveSupplier(
        get(row, "Furnitori") || get(row, "Supplier"),
      );

      if (!categoryId) {
        results.skipped.push({ row: rowNum, reason: "No category resolved" });
        continue;
      }

      const payload = {
        name,
        category: categoryId,
        type: get(row, "Type") || "",
        unit: get(row, "Njesia") || get(row, "Unit") || "piece",
        branding: get(row, "Branding") || "",
        description:
          get(row, "Pershkrim (opsional)") || get(row, "Description") || "",
        purchasePrice:
          Number(get(row, "Cmimi i blerjes") || get(row, "Purchase Price")) ||
          0,
        stock: Number(get(row, "Stok") || get(row, "Stock")) || 0,
      };
      if (supplierId) payload.supplier = supplierId;

      const existing = await Product.findOne({
        name: new RegExp(`^${name}$`, "i"),
      });

      if (existing) {
        await Product.findByIdAndUpdate(existing._id, payload);
        results.updated += 1;
      } else {
        await Product.create(payload);
        results.created += 1;
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportProducts, importProducts };
