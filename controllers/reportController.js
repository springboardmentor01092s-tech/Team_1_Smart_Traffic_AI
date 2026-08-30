const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const REPORTS_DIR = path.join(__dirname, '../reports');
const LATEST_REPORT_PATH = path.join(REPORTS_DIR, 'latest_report.json');

/**
 * Helper to determine python command/path
 */
function getPythonExecutable() {
  const venvPythonWin = path.join(__dirname, '../.venv/Scripts/python.exe');
  const venvPythonUnix = path.join(__dirname, '../.venv/bin/python');

  if (fs.existsSync(venvPythonWin)) {
    return `"${venvPythonWin}"`;
  }
  if (fs.existsSync(venvPythonUnix)) {
    return `"${venvPythonUnix}"`;
  }
  return 'python';
}

/**
 * GET /api/reports/traffic-prediction
 * Returns the latest JSON report summary.
 */
const getLatestReport = async (req, res) => {
  try {
    // 1. Try reading latest_report.json artifact first
    if (fs.existsSync(LATEST_REPORT_PATH)) {
      const fileData = fs.readFileSync(LATEST_REPORT_PATH, 'utf8');
      const parsed = JSON.parse(fileData);
      if (!parsed.plain_summary && parsed.summary?.plain_summary) {
        parsed.plain_summary = parsed.summary.plain_summary;
      }
      return res.json(parsed);
    }

    // 2. Fallback to querying reports table in PostgreSQL
    const result = await pool.query(
      `SELECT report_id, report_title, generated_at, pdf_filename, summary_json, plain_summary, status 
       FROM reports 
       ORDER BY generated_at DESC 
       LIMIT 1;`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No traffic reports found. Please generate a report first.',
        message: 'No reports in database or filesystem.'
      });
    }

    const row = result.rows[0];
    const summaryData = typeof row.summary_json === 'string' ? JSON.parse(row.summary_json) : row.summary_json;
    const plainSummaryData = row.plain_summary ? (typeof row.plain_summary === 'string' ? JSON.parse(row.plain_summary) : row.plain_summary) : (summaryData?.plain_summary || null);

    res.json({
      report_id: row.report_id,
      report_title: row.report_title,
      generated_at: row.generated_at,
      pdf_filename: row.pdf_filename,
      summary: summaryData,
      plain_summary: plainSummaryData
    });
  } catch (err) {
    console.error('Error fetching latest report:', err);
    res.status(500).json({ error: 'Failed to fetch latest traffic report' });
  }
};

/**
 * GET /api/reports/traffic-prediction/history?limit=N
 * Returns past report summaries from the reports table.
 */
const getReportHistory = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) {
      limit = 10;
    }
    limit = Math.min(limit, 100);

    const result = await pool.query(
      `SELECT report_id, report_title, generated_at, pdf_filename, summary_json, plain_summary, status, created_at
       FROM reports
       ORDER BY generated_at DESC
       LIMIT $1;`,
      [limit]
    );

    const reports = result.rows.map((row) => {
      const summaryData = typeof row.summary_json === 'string' ? JSON.parse(row.summary_json) : row.summary_json;
      const plainSummaryData = row.plain_summary ? (typeof row.plain_summary === 'string' ? JSON.parse(row.plain_summary) : row.plain_summary) : (summaryData?.plain_summary || null);
      return {
        report_id: row.report_id,
        report_title: row.report_title,
        generated_at: row.generated_at,
        pdf_filename: row.pdf_filename,
        status: row.status,
        created_at: row.created_at,
        summary: summaryData,
        plain_summary: plainSummaryData
      };
    });

    res.json({
      count: reports.length,
      limit: limit,
      reports: reports
    });
  } catch (err) {
    console.error('Error fetching report history:', err);
    res.status(500).json({ error: 'Failed to fetch traffic report history' });
  }
};

/**
 * GET /api/reports/traffic-prediction/pdf/:filename
 * Serves/downloads a specific PDF report.
 */
const downloadReportPdf = async (req, res) => {
  try {
    const filename = req.params.filename;

    // Security check to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename requested' });
    }

    const filePath = path.join(REPORTS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `PDF report file '${filename}' not found` });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error('Error serving PDF report:', err);
    res.status(500).json({ error: 'Failed to download PDF report' });
  }
};

/**
 * POST /api/reports/traffic-prediction/generate
 * Triggers the Python script generate_traffic_report.py on demand.
 */
const generateReportOnDemand = async (req, res) => {
  try {
    const pythonCmd = getPythonExecutable();
    const scriptPath = path.join(__dirname, '../generate_traffic_report.py');
    const backendDir = path.join(__dirname, '..');

    const command = `${pythonCmd} "${scriptPath}"`;
    console.log(`Executing report generation command: ${command}`);

    exec(command, { cwd: backendDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Report generation script error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({
          error: 'Failed to generate traffic report',
          details: stderr || error.message
        });
      }

      console.log(`Report script output: ${stdout}`);
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(stdout);
      } catch (e) {
        parsedOutput = { raw: stdout };
      }

      // Read fresh latest_report.json if available
      let latestReport = null;
      if (fs.existsSync(LATEST_REPORT_PATH)) {
        try {
          latestReport = JSON.parse(fs.readFileSync(LATEST_REPORT_PATH, 'utf8'));
        } catch (e) {
          console.error('Failed to parse latest_report.json:', e);
        }
      }

      return res.status(201).json({
        message: 'Traffic report generated successfully',
        scriptResult: parsedOutput,
        report: latestReport
      });
    });
  } catch (err) {
    console.error('Error triggering report generation:', err);
    res.status(500).json({ error: 'Internal server error triggering report generation' });
  }
};

module.exports = {
  getLatestReport,
  getReportHistory,
  downloadReportPdf,
  generateReportOnDemand
};
