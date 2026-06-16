#!/usr/bin/env python3
"""GeoLint CLI for CI/CD integrations."""

import json
import os
import sys
import time
from pathlib import Path

import click
import requests
import yaml
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

DEFAULT_API_URL = "https://api.geolint.io/api/v1"


def load_config() -> dict:
    """Load .geolint.yml if present."""
    config_path = Path(".geolint.yml")
    if config_path.exists():
        with open(config_path, "r") as f:
            return yaml.safe_load(f) or {}
    return {}


def get_client():
    """Create an API client with auth."""
    config = load_config()
    api_key = os.environ.get("GEOLINT_API_KEY") or config.get("api_key", "")
    base_url = os.environ.get("GEOLINT_API_URL") or config.get("api_url", DEFAULT_API_URL)
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {api_key}"
    session.headers["Content-Type"] = "application/json"
    return session, base_url


@click.group()
@click.option("--output", type=click.Choice(["json", "table"]), default="table")
@click.pass_context
def cli(ctx, output):
    ctx.ensure_object(dict)
    ctx.obj["output"] = output


@cli.command()
@click.option("--files", default="**/*.geojson", help="Glob pattern for files to validate")
@click.option("--rule-set", default="standard", help="Rule set to use")
@click.option("--fail-threshold", default=80, type=int, help="Minimum score to pass")
@click.option("--project-id", default=None, help="Project ID")
@click.pass_context
def validate(ctx, files, rule_set, fail_threshold, project_id):
    """Upload and validate geospatial files."""
    session, base_url = get_client()
    config = load_config()
    project_id = project_id or config.get("project_id", "00000000-0000-0000-0000-000000000000")

    import glob as glob_module
    matched = glob_module.glob(files, recursive=True)
    if not matched:
        console.print("[red]No files matched.[/red]")
        sys.exit(1)

    all_passed = True
    results = []

    for file_path in matched:
        console.print(f"Validating {file_path}...")

        with open(file_path, "rb") as f:
            upload_res = session.post(
                f"{base_url}/datasets",
                data={"project_id": project_id},
                files={"file": (Path(file_path).name, f)},
            )
        upload_res.raise_for_status()
        dataset_id = upload_res.json()["id"]

        job_res = session.post(
            f"{base_url}/validations",
            json={"dataset_id": dataset_id, "rule_set": rule_set},
        )
        job_res.raise_for_status()
        job = job_res.json()

        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
            task = progress.add_task("Running validation...", total=None)
            for _ in range(120):
                time.sleep(3)
                poll = session.get(f"{base_url}/validations/{job['id']}")
                poll.raise_for_status()
                job = poll.json()
                if job["status"] in ("completed", "failed"):
                    break

        score = job.get("overall_score", 0) or 0
        passed = score >= fail_threshold
        if not passed:
            all_passed = False

        results.append({
            "file": file_path,
            "status": job["status"],
            "score": score,
            "grade": job.get("grade", "N/A"),
            "passed": passed,
        })

    if ctx.obj["output"] == "json":
        click.echo(json.dumps({"results": results, "passed": all_passed}, indent=2))
    else:
        table = Table(title="GeoLint Validation Results")
        table.add_column("File", style="cyan")
        table.add_column("Score", justify="right")
        table.add_column("Grade", justify="center")
        table.add_column("Status")
        for r in results:
            color = "green" if r["passed"] else "red"
            table.add_row(
                r["file"],
                str(r["score"]),
                r["grade"],
                f"[{color}]{'PASS' if r['passed'] else 'FAIL'}[/{color}]",
            )
        console.print(table)

    sys.exit(0 if all_passed else 1)


@cli.command()
@click.argument("job_id")
@click.option("--format", "fmt", default="json", type=click.Choice(["json", "html", "pdf"]))
@click.option("--output", "-o", default=None, help="Output file path")
@click.pass_context
def report(ctx, job_id, fmt, output):
    """Download a validation report."""
    session, base_url = get_client()
    res = session.get(f"{base_url}/validations/{job_id}/report.{fmt}")
    res.raise_for_status()

    data = res.content if fmt in ("pdf", "html") else res.json()
    if output:
        mode = "wb" if isinstance(data, bytes) else "w"
        with open(output, mode) as f:
            f.write(data)
        console.print(f"[green]Saved to {output}[/green]")
    else:
        if fmt == "json" and ctx.obj["output"] == "table":
            table = Table(title="Report Summary")
            table.add_column("Metric", style="cyan")
            table.add_column("Value")
            for k, v in data.items():
                if isinstance(v, (str, int, float)):
                    table.add_row(k, str(v))
            console.print(table)
        else:
            click.echo(data)


@cli.command()
@click.pass_context
def rules(ctx):
    """List available validation rules."""
    session, base_url = get_client()
    res = session.get(f"{base_url}/rules")
    res.raise_for_status()
    rules_list = res.json()

    if ctx.obj["output"] == "json":
        click.echo(json.dumps(rules_list, indent=2))
    else:
        table = Table(title="GeoLint Rules")
        table.add_column("ID", style="cyan")
        table.add_column("Name")
        table.add_column("Category")
        table.add_column("Description")
        for r in rules_list:
            table.add_row(r["id"], r["name"], r["category"], r["description"])
        console.print(table)


if __name__ == "__main__":
    cli()
