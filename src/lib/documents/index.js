import pool from "@/lib/db";

export const getDocumentWhere = async (where) => {
  const values = [];
  const clauses = [];

  Object.entries(where).forEach(([table, attributes]) => {
    Object.entries(attributes).forEach(([attribute, value]) => {
      values.push(value);
      if (Array.isArray(value)) {
        clauses.push(`${table}.${attribute} = ANY($${values.length})`);
      } else {
        clauses.push(`${table}.${attribute} = $${values.length}`);
      }
    });
  });

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const query = `
    SELECT DISTINCT documents.*
    FROM documents
    JOIN fiches ON documents.fiche_id = fiches.id
    JOIN groups_sources gs ON fiches.source_id = gs.source_id
    JOIN users ON gs.group_id = users.group_id
    JOIN sources ON sources.id = fiches.source_id
    ${whereClause}
    `;

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};
