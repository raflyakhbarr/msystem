// src/utils/fileUtils.js
import * as XLSX from 'xlsx';

/**
 * Convert JSON data to Excel workbook
 */
export function jsonToExcel(data) {
  const wb = XLSX.utils.book_new();

  data.sheet.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  return wb;
}

/**
 * Convert Excel workbook to JSON data
 */
export function excelToJson(workbook) {
  const sheets = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    sheets.push({
      name: sheetName,
      data: data
    });
  });

  return sheets;
}

/**
 * Download file in browser
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Read Excel file
 */
export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate Excel structure
 * @param {string[]|Array<{name: string, data: any[]}>} sheets - Array of sheet names or array of sheet objects
 */
export function validateExcelStructure(sheets) {
  const requiredSheets = [
    'CMDB Items',
    'Groups',
    'Services',
    'Service Items',
    'Service Groups',
    'Service Group Connections',
    'Cross-Service Connections',
    'Metadata'
  ];

  // Handle both array of strings and array of objects
  let sheetNames;
  if (sheets.length > 0 && typeof sheets[0] === 'string') {
    // Array of strings: ['CMDB Items', 'Groups', ...]
    sheetNames = sheets;
  } else {
    // Array of objects: [{name: 'CMDB Items', data: [...]}, ...]
    sheetNames = sheets.map(s => s.name);
  }

  const missingSheets = requiredSheets.filter(rs => !sheetNames.includes(rs));

  if (missingSheets.length > 0) {
    throw new Error(`Missing sheets: ${missingSheets.join(', ')}`);
  }

  return true;
}
