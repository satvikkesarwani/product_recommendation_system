export function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (character === "\n" && !inQuotes) {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    if (character !== "\r") {
      currentValue += character;
    }
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  const nonEmptyRows = rows.filter((row) => row.some((value) => value.trim() !== ""));
  const [headers = [], ...dataRows] = nonEmptyRows;

  return dataRows.map((row) =>
    headers.reduce((record, header, columnIndex) => {
      record[header || `column_${columnIndex}`] = row[columnIndex] ?? "";
      return record;
    }, {}),
  );
}
