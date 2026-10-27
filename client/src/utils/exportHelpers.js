export const downloadFile = (data, filename, mimeType) => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start consuming the file before releasing its URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadRows = (rows, columns, filename, type = 'csv') => {
  const extension = type === 'excel' ? 'xls' : 'csv';
  const mimeType = type === 'excel'
    ? 'application/vnd.ms-excel;charset=utf-8;'
    : 'text/csv;charset=utf-8;';

  const escapeValue = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const content = [
    columns.map(column => escapeValue(column.label)).join(','),
    ...rows.map(row => columns.map(column => escapeValue(column.value(row))).join(','))
  ].join('\n');

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
