
// RTF generator — Chrome does not block text/plain downloads, Word opens .rtf natively

const escapeRtf = (text: string): string =>
  [...text].map(char => {
    if (char === '\\') return '\\\\';
    if (char === '{') return '\\{';
    if (char === '}') return '\\}';
    const code = char.charCodeAt(0);
    if (code > 127) return `\\u${code > 32767 ? code - 65536 : code}?`;
    return char;
  }).join('');

const toDataUrl = (blob: Blob): Promise<string> =>
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

export const downloadAsRtf = async (content: string, filename: string): Promise<void> => {
  const lines = content.split('\n');
  const body = lines.map(line => {
    if (!line.trim()) return '\\pard\\par';
    const escaped = escapeRtf(line);
    const trimmed = line.trim();
    const isHeading =
      (trimmed.length > 4 && trimmed.length < 80 &&
        trimmed === trimmed.toUpperCase() &&
        /[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ]/.test(trimmed)) ||
      /^ARTICLE\s/i.test(trimmed) ||
      /^CONTRAT\s/i.test(trimmed) ||
      /^OBJET\s*:/i.test(trimmed);
    return isHeading
      ? `\\pard\\sb200\\sa100\\b\\fs26 ${escaped}\\b0\\fs22\\par`
      : `\\pard\\sa80 ${escaped}\\par`;
  }).join('\n');

  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1036\n{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}}\n\\f0\\fs22\\widowctrl\n${body}\n}`;

  // Use text/plain so Chrome never classifies it as a dangerous download
  const blob = new Blob([rtf], { type: 'text/plain;charset=utf-8' });
  const dataUrl = await toDataUrl(blob);
  triggerDownload(dataUrl, filename.replace(/\.[^.]+$/, '') + '.rtf');
};

export const downloadAsCsv = async (content: string, filename: string): Promise<void> => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' });
  const dataUrl = await toDataUrl(blob);
  triggerDownload(dataUrl, filename.replace(/\.[^.]+$/, '') + '.csv');
};
