/**
 * Excel utility wrapper using ExcelJS (replacing vulnerable SheetJS/xlsx).
 * Provides a simple API for common Excel operations used throughout the app.
 */
import ExcelJS from "exceljs";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColWidth {
  wch: number;
}

// ─── Export helpers ──────────────────────────────────────────────────────────

/** Create a new ExcelJS Workbook */
export function createWorkbook(): ExcelJS.Workbook {
  return new ExcelJS.Workbook();
}

/**
 * Add a worksheet from an array of plain objects (like XLSX.utils.json_to_sheet).
 * Each object's keys become the header row.
 */
export function addJsonSheet(
  workbook: ExcelJS.Workbook,
  data: Record<string, any>[],
  sheetName: string,
  colWidths?: ColWidth[]
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet(sheetName);
  if (data.length === 0) return ws;

  // Extract headers from first row
  const headers = Object.keys(data[0]);
  ws.addRow(headers);

  // Bold header row
  ws.getRow(1).font = { bold: true };

  // Add data rows
  data.forEach((row) => {
    ws.addRow(headers.map((h) => row[h]));
  });

  // Apply column widths
  if (colWidths) {
    colWidths.forEach((cw, i) => {
      const col = ws.getColumn(i + 1);
      col.width = cw.wch;
    });
  }

  return ws;
}

/**
 * Add a worksheet from a 2D array (like XLSX.utils.aoa_to_sheet).
 */
export function addAoaSheet(
  workbook: ExcelJS.Workbook,
  data: any[][],
  sheetName: string,
  colWidths?: ColWidth[]
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet(sheetName);

  data.forEach((row) => {
    ws.addRow(row);
  });

  // Apply column widths
  if (colWidths) {
    colWidths.forEach((cw, i) => {
      const col = ws.getColumn(i + 1);
      col.width = cw.wch;
    });
  }

  return ws;
}

/**
 * Download the workbook as an .xlsx file in the browser.
 */
export async function writeFile(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import helpers ──────────────────────────────────────────────────────────

/**
 * Read an Excel file (File or ArrayBuffer) and return the first sheet as JSON
 * objects (like XLSX.utils.sheet_to_json). Header row keys become object keys.
 */
export async function readFileAsJson(
  file: File | ArrayBuffer
): Promise<Record<string, any>[]> {
  const wb = new ExcelJS.Workbook();

  if (file instanceof File) {
    const arrayBuf = await file.arrayBuffer();
    await wb.xlsx.load(arrayBuf);
  } else {
    await wb.xlsx.load(file);
  }

  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount === 0) return [];

  // First row = headers
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
  });

  const result: Record<string, any>[] = [];
  for (let rowIdx = 2; rowIdx <= ws.rowCount; rowIdx++) {
    const row = ws.getRow(rowIdx);
    // Skip empty rows
    let isEmpty = true;
    const obj: Record<string, any> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber - 1];
      if (key) {
        const val = cell.value;
        obj[key] = val;
        if (val !== null && val !== undefined && val !== "") isEmpty = false;
      }
    });
    if (!isEmpty) result.push(obj);
  }

  return result;
}
