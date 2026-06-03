import fs from 'fs';
import path from 'path';

const getPapersDir = () => {
  const dir = path.join(process.cwd(), 'public', 'papers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export function isPdfDownloaded(paperId: string): boolean {
  const pdfPath = path.join(getPapersDir(), `${paperId}.pdf`);
  return fs.existsSync(pdfPath);
}

export function getLocalPdfPath(paperId: string): string {
  return `/papers/${paperId}.pdf`;
}