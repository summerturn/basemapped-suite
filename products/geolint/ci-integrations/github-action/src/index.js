const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.GEOLINT_API_URL || 'https://api.geolint.io/api/v1';
const API_KEY = process.env.GEOLINT_API_KEY;
const FILES_PATTERN = process.env.GEOLINT_FILES || '**/*.geojson';
const RULE_SET = process.env.GEOLINT_RULE_SET || 'standard';
const FAIL_THRESHOLD = parseInt(process.env.GEOLINT_FAIL_THRESHOLD || '80', 10);
const ANNOTATE = (process.env.GEOLINT_ANNOTATE || 'true') === 'true';
const COMMENT_ON_PR = (process.env.GEOLINT_COMMENT_ON_PR || 'true') === 'true';

const client = axios.create({
  baseURL: API_BASE,
  headers: { Authorization: `Bearer ${API_KEY}` },
});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  try {
    const globber = await glob.create(FILES_PATTERN, { followSymbolicLinks: false });
    const files = await globber.glob();

    if (files.length === 0) {
      core.warning('No files matched the provided pattern.');
      return;
    }

    core.info(`Found ${files.length} file(s) to validate.`);

    const annotations = [];
    let overallPassed = true;
    const results = [];

    for (const filePath of files) {
      core.info(`Uploading ${filePath}...`);
      const form = new FormData();
      const blob = new Blob([fs.readFileSync(filePath)]);
      form.append('file', blob, path.basename(filePath));
      form.append('project_id', '00000000-0000-0000-0000-000000000000');

      const uploadRes = await client.post('/datasets', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const datasetId = uploadRes.data.id;

      core.info(`Creating validation job for ${path.basename(filePath)}...`);
      const jobRes = await client.post('/validations', {
        dataset_id: datasetId,
        rule_set: RULE_SET,
      });
      const jobId = jobRes.data.id;

      // Poll for completion
      let job = jobRes.data;
      const maxAttempts = 120;
      for (let i = 0; i < maxAttempts; i++) {
        await sleep(3000);
        const pollRes = await client.get(`/validations/${jobId}`);
        job = pollRes.data;
        core.info(`  Status: ${job.status} (${job.progress_pct}%)`);
        if (job.status === 'completed' || job.status === 'failed') break;
      }

      if (job.status !== 'completed') {
        core.error(`Validation failed for ${path.basename(filePath)}`);
        overallPassed = false;
        results.push({ file: path.basename(filePath), passed: false, score: 0, grade: 'F' });
        continue;
      }

      const passed = (job.overall_score || 0) >= FAIL_THRESHOLD;
      if (!passed) overallPassed = false;

      results.push({
        file: path.basename(filePath),
        passed,
        score: job.overall_score,
        grade: job.grade,
      });

      // Fetch report for annotations
      if (ANNOTATE) {
        try {
          const reportRes = await client.get(`/validations/${jobId}/report`);
          const report = reportRes.data;
          for (const result of report.results || []) {
            // In a real implementation we'd fetch issues per result
          }
        } catch (e) {
          core.warning(`Could not fetch report for annotations: ${e.message}`);
        }
      }
    }

    // Create check-run annotations
    if (ANNOTATE && github.context.payload.pull_request) {
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN || '');
      await octokit.rest.checks.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        name: 'GeoLint',
        head_sha: github.context.sha,
        status: 'completed',
        conclusion: overallPassed ? 'success' : 'failure',
        output: {
          title: 'GeoLint Results',
          summary: results.map((r) => `- **${r.file}**: ${r.grade} (${r.score})`).join('\n'),
          annotations: annotations.map((a) => ({
            path: a.path,
            start_line: a.start_line,
            end_line: a.end_line,
            annotation_level: a.annotation_level,
            message: a.message,
          })),
        },
      });
    }

    // PR comment
    if (COMMENT_ON_PR && github.context.payload.pull_request) {
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN || '');
      const body = `## GeoLint Results\n\n| File | Grade | Score | Status |\n|------|-------|-------|--------|\n${results
        .map((r) => `| ${r.file} | ${r.grade} | ${r.score} | ${r.passed ? 'PASS' : 'FAIL'} |`)
        .join('\n')}`;

      await octokit.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.issue.number,
        body,
      });
    }

    if (!overallPassed) {
      core.setFailed('One or more validations did not meet the fail threshold.');
    } else {
      core.info('All validations passed!');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
