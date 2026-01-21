import { query } from '../config/database.js';

// Generic CRUD operations for all tables
export const createModel = (tableName) => ({
  async findAll() {
    const result = await query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
    return result.rows;
  },

  async findById(id) {
    const result = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
    return result.rows[0];
  },

  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await query(sql, values);
    return result.rows[0];
  },

  async update(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const sql = `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${columns.length + 1} RETURNING *`;
    const result = await query(sql, [...values, id]);
    return result.rows[0];
  },

  async delete(id) {
    const result = await query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
  },

  async count() {
    const result = await query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }
});

// Create models for each feature
export const CodeReview = createModel('code_reviews');
export const Documentation = createModel('documentation');
export const CodeAnalysis = createModel('code_analysis');
export const ApiDoc = createModel('api_docs');
export const ReadmeProject = createModel('readme_projects');
export const CodeComment = createModel('code_comments');
export const SecurityScan = createModel('security_scans');
export const PerformanceReport = createModel('performance_reports');
export const TestGeneration = createModel('test_generations');
export const RefactoringSuggestion = createModel('refactoring_suggestions');
