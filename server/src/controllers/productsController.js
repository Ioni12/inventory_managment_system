const ExcelJS = require("exceljs");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Employee = require("../models/Employee");
const { isValidAssetId, ensureUniqueAssetId } = require("../utils/assetId");

const STATUS_VALUES = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

const STATUS_COLORS = {
  "Ne magazine": "FFE5E7EB",
  "Ne perdorim": "FFD1FAE5",
  "Ne riparim": "FFFEF3C7",
  "Jashte perdorimit": "FFFEE2E2",
};

const HEADER_FILL = "FF1F2937";
const HEADER_FONT_COLOR = "FFFFFFFF";
const STRIPE_FILL = "FFF9FAFB";

// One row per serial (physical unit). Batch-level columns repeat across
// every row that shares the same Asset ID.
const EXPORT_COLUMNS = [
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Kategoria", key: "categoryName", width: 16 },
  { header: "Marka/modeli", key: "name", width: 22 },
  { header: "Branding", key: "branding", width: 14 },
  { header: "Njesia", key: "unit", width: 10 },
  { header: "Furnitori", key: "supplierName", width: 16 },
  { header: "Cmimi i blerjes", key: "purchasePrice", width: 14 },
  { header: "Pershkrim (opsional)", key: "description", width: 26 },
  { header: "Nr. Serial", key: "serial", width: 16 },
  { header: "Statusi", key: "status", width: 16 },
];

const IMPORT_SHEET_NAME = "Asete gjendje";

// GET /api/products/export
async function exportProducts(req, res) {
  try {
    const products = await Product.find().populate("category supplier");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Asete gjendje");
    sheet.columns = EXPORT_COLUMNS;

    products.forEach((p) => {
      const batch = {
        assetId: p.assetId || "",
        categoryName: p.category?.name || "",
        name: p.name,
        branding: p.branding,
        unit: p.unit,
        supplierName: p.supplier?.name || "",
        purchasePrice: p.purchasePrice,
        description: p.description,
      };

      if (p.serials.length === 0) {
        // A batch with no units yet still gets one row, serial columns blank.
        sheet.addRow({ ...batch, serial: "", status: "" });
        return;
      }

      p.serials.forEach((unit) => {
        sheet.addRow({
          ...batch,
          serial: unit.serial,
          status: unit.status,
        });
      });
    });

    // --- Styling ---
    const headerRow = sheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_FILL },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const statusColIndex =
      EXPORT_COLUMNS.findIndex((c) => c.key === "status") + 1;

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const isStripe = rowNum % 2 === 0;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        if (isStripe) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: STRIPE_FILL },
          };
        }
      });

      const statusCell = row.getCell(statusColIndex);
      const statusColor = STATUS_COLORS[statusCell.value];
      if (statusColor) {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: statusColor },
        };
        statusCell.alignment = { horizontal: "center" };
      }
    }

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
  const headerRow = sheet.getRow(1).values;
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
  if (!category)
    category = await Category.create({ name, trackingType: "quantity" });
  return category._id;
}

async function resolveSupplier(name) {
  if (!name) return null;
  let supplier = await Supplier.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!supplier) supplier = await Supplier.create({ name });
  return supplier._id;
}

// Resolves a holder by full name (splits on first space) + optional email.
// Auto-creates a bare-bones Employee if no match is found, same pattern as
// Category/Supplier auto-create.
async function resolveHolder(fullName, email) {
  if (!fullName) return null;

  if (email) {
    const byEmail = await Employee.findOne({ email });
    if (byEmail) return byEmail._id;
  }

  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ") || "(unknown)";

  let employee = await Employee.findOne({
    firstName: new RegExp(`^${firstName}$`, "i"),
    lastName: new RegExp(`^${lastName}$`, "i"),
  });

  if (!employee) {
    employee = await Employee.create({
      firstName,
      lastName,
      email: email || undefined,
    });
  }

  return employee._id;
}

function resolveStatus(raw) {
  if (!raw) return undefined;
  return STATUS_VALUES.find((v) => v.toLowerCase() === raw.toLowerCase());
}

// POST /api/products/import
// Rows are grouped by Asset ID: multiple rows sharing one Asset ID become
// one Product with multiple serial units. Blank Asset ID = a new batch,
// generated fresh. Existing Asset ID = update that batch / add or update
// one of its units, matched by Nr. Serial.
async function importProducts(req, res) {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No file uploaded (field name must be "file")' });
  }

  const results = { created: 0, updated: 0, skipped: [] };
  // Tracks Asset IDs newly generated in THIS import run, so multiple rows
  // for the same brand-new batch (all with blank Asset ID) get merged
  // instead of creating a separate Product per row.
  const newBatchByKey = new Map(); // key: `${name}|${category}` -> assetId

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
      const rawAssetId = get(row, "Asset ID");
      const serialNo = get(row, "Nr. Serial") || get(row, "Serial");

      if (!name) {
        results.skipped.push({ row: rowNum, reason: "Missing product name" });
        continue;
      }

      if (rawAssetId && !isValidAssetId(rawAssetId)) {
        results.skipped.push({
          row: rowNum,
          reason: `Invalid Asset ID "${rawAssetId}" (failed check digit)`,
        });
        continue;
      }

      const categoryName = get(row, "Kategoria") || get(row, "Category");
      const supplierName = get(row, "Furnitori") || get(row, "Supplier");
      const categoryId = categoryName
        ? await resolveCategory(categoryName)
        : null;
      const supplierId = supplierName
        ? await resolveSupplier(supplierName)
        : null;

      const statusRaw = get(row, "Statusi") || get(row, "Status");
      let status;
      if (statusRaw) {
        status = resolveStatus(statusRaw);
        if (!status) {
          results.skipped.push({
            row: rowNum,
            reason: `Invalid Statusi value "${statusRaw}" (must be one of: ${STATUS_VALUES.join(", ")})`,
          });
          continue;
        }
      }

      const holderName = get(row, "Emer Mbiemer");
      const holderEmail = get(row, "Email");
      const holderId = holderName
        ? await resolveHolder(holderName, holderEmail)
        : null;

      // Batch-level fields, only set if the row actually has a value
      // (never overwrite existing batch data with a blank cell).
      const batchFields = {};
      if (categoryId) batchFields.category = categoryId;
      if (supplierId) batchFields.supplier = supplierId;
      const branding = get(row, "Branding");
      if (branding) batchFields.branding = branding;
      const unit = get(row, "Njesia") || get(row, "Unit");
      if (unit) batchFields.unit = unit;
      const description =
        get(row, "Pershkrim (opsional)") || get(row, "Description");
      if (description) batchFields.description = description;
      const purchasePriceRaw =
        get(row, "Cmimi i blerjes") || get(row, "Purchase Price");
      if (purchasePriceRaw !== undefined && purchasePriceRaw !== "") {
        batchFields.purchasePrice = Number(purchasePriceRaw) || 0;
      }

      let product;

      if (rawAssetId) {
        product = await Product.findOne({ assetId: rawAssetId.toUpperCase() });
        if (!product) {
          results.skipped.push({
            row: rowNum,
            reason: `Asset ID "${rawAssetId}" not found — cannot update a non-existent item`,
          });
          continue;
        }
        Object.assign(product, batchFields);
      } else {
        // Blank Asset ID: reuse a batch created earlier in THIS import if
        // the name+category matches, otherwise start a brand-new batch.
        const key = `${name.toLowerCase()}|${categoryId}`;
        const existingNewAssetId = newBatchByKey.get(key);

        if (existingNewAssetId) {
          product = await Product.findOne({ assetId: existingNewAssetId });
        } else {
          if (!categoryId) {
            results.skipped.push({
              row: rowNum,
              reason: "No category resolved for new item",
            });
            continue;
          }
          const assetId = await ensureUniqueAssetId(Product, "assetId");
          product = new Product({
            name,
            category: categoryId,
            assetId,
            ...batchFields,
          });
          newBatchByKey.set(key, assetId);
        }
      }

      // Apply the serial (unit-level) part of this row, if any.
      if (serialNo) {
        let unitDoc = product.serials.find(
          (s) => s.serial.toLowerCase() === serialNo.toLowerCase(),
        );
        if (unitDoc) {
          if (status) unitDoc.status = status;
          if (
            holderId &&
            String(unitDoc.currentHolder || "") !== String(holderId)
          ) {
            const openEntry = unitDoc.history.find((h) => !h.returnedDate);
            if (openEntry) openEntry.returnedDate = new Date();
            unitDoc.history.push({
              employee: holderId,
              assignedDate: new Date(),
            });
            unitDoc.currentHolder = holderId;
          }
        } else {
          const newUnit = { serial: serialNo, status: status || "Ne magazine" };
          if (holderId) {
            newUnit.currentHolder = holderId;
            newUnit.history = [
              { employee: holderId, assignedDate: new Date() },
            ];
          }
          product.serials.push(newUnit);
        }
      }

      const isNewProduct = product.isNew;
      await product.save();
      if (isNewProduct) {
        results.created += 1;
      } else {
        results.updated += 1;
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportProducts, importProducts };
