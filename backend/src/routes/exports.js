import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Valid tables for export
const VALID_TABLES = [
  'code_reviews', 'documentation', 'code_analysis', 'api_docs',
  'readme_projects', 'code_comments', 'security_scans', 'performance_reports',
  'test_generations', 'refactoring_suggestions', 'bug_predictions',
  'code_explanations', 'tech_debt_items', 'architecture_reviews',
  'dependency_audits', 'deployment_advices', 'teams', 'review_assignments',
  'webhooks', 'audit_logs'
];

// CSV Export
router.get('/csv/:resource', async (req, res) => {
  try {
    const { resource } = req.params;
    if (!VALID_TABLES.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }

    const result = await query(`SELECT * FROM ${resource} ORDER BY created_at DESC`);
    if (result.rows.length === 0) {
      return res.status(200).send('No data to export');
    }

    const headers = Object.keys(result.rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        // Escape CSV values
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${resource}_export.csv`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HTML/PDF-ready export
router.get('/html/:resource', async (req, res) => {
  try {
    const { resource } = req.params;
    if (!VALID_TABLES.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }

    const result = await query(`SELECT * FROM ${resource} ORDER BY created_at DESC`);
    if (result.rows.length === 0) {
      return res.status(200).send('<html><body><p>No data to export</p></body></html>');
    }

    const headers = Object.keys(result.rows[0]);
    const title = resource.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    let html = `<!DOCTYPE html><html><head><title>${title} Export</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { color: #333; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { background-color: #4a90d9; color: white; }
      tr:nth-child(even) { background-color: #f2f2f2; }
      .timestamp { font-size: 11px; color: #666; }
    </style></head><body>
    <h1>${title}</h1>
    <p class="timestamp">Exported on ${new Date().toLocaleString()}</p>
    <p>Total records: ${result.rows.length}</p>
    <table><thead><tr>`;

    for (const h of headers) {
      html += `<th>${h.replace(/_/g, ' ')}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (const row of result.rows) {
      html += '<tr>';
      for (const h of headers) {
        const val = row[h];
        let display = '';
        if (val === null || val === undefined) display = '-';
        else if (typeof val === 'object') display = JSON.stringify(val).substring(0, 100);
        else display = String(val).substring(0, 200);
        html += `<td>${display}</td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table></body></html>';

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
