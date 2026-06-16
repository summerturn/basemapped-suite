# GeoLint GitLab CI Integration

## Usage

Include the template in your `.gitlab-ci.yml`:

```yaml
include:
  - template: geolint.yml

stages:
  - validate

geolint:
  extends: .geolint_validate
  stage: validate
  variables:
    GEOLINT_RULE_SET: "strict"
    GEOLINT_FAIL_THRESHOLD: "90"
```

## Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEOLINT_API_KEY` | *(required)* | Your GeoLint API key |
| `GEOLINT_RULE_SET` | `standard` | Rule set to apply |
| `GEOLINT_FAIL_THRESHOLD` | `80` | Minimum score to pass |
| `GEOLINT_FILES` | `**/*.geojson` | File glob pattern |

## Artifacts

The job produces:
- `geolint-report.json` — Full JSON report
- `geolint-report.html` — Human-readable HTML report
- `geolint-junit.xml` — JUnit XML for GitLab test reports
