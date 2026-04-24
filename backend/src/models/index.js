import { query } from '../config/database.js';

// Generic CRUD operations for all tables
export const createModel = (tableName) => ({
  async findAll() {
    const result = await query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
    return result.rows;
  },

  async findAllPaginated({ page = 1, limit = 20, search = '', searchFields = ['title'], sort = 'created_at', order = 'DESC', filters = {} } = {}) {
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    // Search across specified fields
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => {
        params.push(`%${search}%`);
        return `${field}::text ILIKE $${paramIndex++}`;
      });
      conditions.push(`(${searchConditions.join(' OR ')})`);
    }

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.push(value);
        conditions.push(`${key} = $${paramIndex++}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sort columns - only allow alphanumeric and underscore
    const safeSort = /^[a-zA-Z_]+$/.test(sort) ? sort : 'created_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(`SELECT COUNT(*) FROM ${tableName} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const offset = (page - 1) * limit;
    const dataParams = [...params, limit, offset];
    const dataResult = await query(
      `SELECT * FROM ${tableName} ${whereClause} ORDER BY ${safeSort} ${safeOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

    return {
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findById(id) {
    const result = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
    return result.rows[0];
  },

  async findOne(conditions) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    const result = await query(`SELECT * FROM ${tableName} WHERE ${whereClause}`, values);
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

  async bulkDelete(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(`DELETE FROM ${tableName} WHERE id IN (${placeholders}) RETURNING *`, ids);
    return result.rows;
  },

  async bulkUpdate(ids, data) {
    if (!ids || ids.length === 0) return [];
    const columns = Object.keys(data);
    const values = Object.values(data);
    let paramIndex = 1;
    const setClause = columns.map((col) => `${col} = $${paramIndex++}`).join(', ');
    const placeholders = ids.map(() => `$${paramIndex++}`).join(', ');
    const result = await query(
      `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) RETURNING *`,
      [...values, ...ids]
    );
    return result.rows;
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

// New models for additional features
export const ReviewIssue = createModel('review_issues');
export const GitHubIntegration = createModel('github_integrations');
export const PullRequest = createModel('pull_requests');
export const Team = createModel('teams');
export const TeamMember = createModel('team_members');
export const ReviewAssignment = createModel('review_assignments');
export const Webhook = createModel('webhooks');
export const WebhookEvent = createModel('webhook_events');
export const ReviewMetric = createModel('review_metrics');

// New AI feature models
export const BugPrediction = createModel('bug_predictions');
export const CodeExplanation = createModel('code_explanations');
export const TechDebtItem = createModel('tech_debt_items');
export const ArchitectureReview = createModel('architecture_reviews');
export const DependencyAudit = createModel('dependency_audits');
export const DeploymentAdvice = createModel('deployment_advices');

// Auth models
export const User = createModel('users');
export const ApiKey = createModel('api_keys');
export const AuditLog = createModel('audit_logs');
