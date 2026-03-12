import * as XLSX from "xlsx";
import * as fs from "fs";

const filePath = process.argv[2];
const fileData = fs.readFileSync(filePath);
const workbook = XLSX.read(fileData, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Total rows:", data.length);
console.log("--- Header ---");
console.log(JSON.stringify(data[0], null, 2));

console.log("--- First 3 Rows ---");
for (let i = 1; i < Math.min(4, data.length); i++) {
  console.log(JSON.stringify(data[i], null, 2));
}
