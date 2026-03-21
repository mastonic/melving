
import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  const base = filename.replace(/\.[^.]+$/, '');
  triggerDownload(blob, base + '.docx');
};

export const downloadAsText = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, filename);
};

export const downloadAsCsv = (content: string, filename: string) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  const base = filename.replace(/\.[^.]+$/, '');
  triggerDownload(blob, base + '.csv');
};
