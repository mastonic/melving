
import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';

// Convert Blob to data: URL to bypass Chrome's HTTP download blocking
const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const triggerDownload = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadAsDocx = async (content: string, filename: string): Promise<void> => {
  const lines = content.split('\n');
  const children = lines.map(line => {
    const trimmed = line.trim();
    const isHeading =
      (trimmed === trimmed.toUpperCase() && trimmed.length > 4 && trimmed.length < 80 && /[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ]/.test(trimmed)) ||
      /^ARTICLE\s/i.test(trimmed) ||
      /^CONTRAT\s/i.test(trimmed) ||
      /^OBJET\s*:/i.test(trimmed);

    return new Paragraph({
      heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: line,
          size: isHeading ? 24 : 22,
          font: 'Calibri',
          bold: isHeading,
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const dataUrl = await blobToDataUrl(blob);
  const base = filename.replace(/\.[^.]+$/, '');
  triggerDownload(dataUrl, base + '.docx');
};

export const downloadAsText = async (content: string, filename: string): Promise<void> => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const dataUrl = await blobToDataUrl(blob);
  triggerDownload(dataUrl, filename);
};

export const downloadAsCsv = async (content: string, filename: string): Promise<void> => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  const dataUrl = await blobToDataUrl(blob);
  const base = filename.replace(/\.[^.]+$/, '');
  triggerDownload(dataUrl, base + '.csv');
};
