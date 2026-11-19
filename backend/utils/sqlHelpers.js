/**
 * Builds a safe "col = ?, col2 = ?" SET clause from only whitelisted columns.
 * Column names never come from user input directly, preventing SQL injection.
 */
function buildUpdate(data, allowedColumns) {
  const columns = allowedColumns.filter((c) => data[c] !== undefined);
  return {
    setClause: columns.map((c) => `${c} = ?`).join(', '),
    values: columns.map((c) => (typeof data[c] === 'string' ? data[c].trim() : data[c])),
  };
}

module.exports = { buildUpdate };
