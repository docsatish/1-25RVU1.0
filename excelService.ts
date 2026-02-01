
import { RVUEntry, WorklistItem } from "./types";

// This expects the global XLSX library from the script tag
declare const XLSX: any;

export const parseRVUDatabase = async (file: File): Promise<RVUEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map flexible headers
        const entries: RVUEntry[] = jsonData.map((row: any) => {
          const cpt = String(row.CPT || row['CPT Code'] || row['cpt'] || '').trim();
          const description = String(row.Description || row['Study Description'] || row['desc'] || row['Name'] || '').trim();
          const rvu = parseFloat(row.RVU || row['Total RVU'] || row['rvu'] || '0');
          return { cpt: cpt || undefined, description, rvu };
        }).filter((item: RVUEntry) => (item.cpt || item.description) && !isNaN(item.rvu));

        resolve(entries);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parseWorklistSpreadsheet = async (file: File): Promise<WorklistItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const items: WorklistItem[] = jsonData.map((row: any) => {
          const cpt = String(row.CPT || row['CPT Code'] || row['cpt'] || '').trim();
          const description = String(row.Description || row['Study Description'] || row['desc'] || row['Name'] || '').trim();
          const count = parseInt(row.Count || row.Quantity || row.Qty || '1', 10);
          
          // Try to parse exam date
          let examDateStr = row['Exam Date'] || row['Date'] || row['Service Date'] || row['date'];
          if (examDateStr instanceof Date) {
            examDateStr = examDateStr.toISOString().split('T')[0];
          } else if (typeof examDateStr === 'number') {
            // Handle Excel serial date
            const date = new Date((examDateStr - 25569) * 86400 * 1000);
            examDateStr = date.toISOString().split('T')[0];
          }

          return { 
            cpt: cpt || undefined, 
            description: description || undefined, 
            count,
            examDate: examDateStr ? String(examDateStr).split('T')[0] : undefined
          };
        }).filter((item: WorklistItem) => item.cpt || item.description);

        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
