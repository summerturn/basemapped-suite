# MIT License
#
# Copyright (c) 2026 pytest-geospatial contributors
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

"""Test result reporters for pytest-geospatial."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class GeoJSONReporter:
    """Collect spatial test results and emit a structured JSON report."""

    def __init__(self, output_path: str = "geospatial-report.json") -> None:
        self.output_path = output_path
        self.results: list[dict[str, Any]] = []

    def append(self, report: Any) -> None:
        """Append a pytest test report to the internal collection."""
        spatial_markers = [m for m in ("geo", "slow_geo", "crs") if m in report.keywords]
        self.results.append(
            {
                "nodeid": report.nodeid,
                "outcome": report.outcome,
                "duration": getattr(report, "duration", 0.0),
                "markers": spatial_markers,
            }
        )

    def write_json_report(self, path: str | None = None) -> None:
        """Write collected results to *path* as structured JSON.

        Parameters
        ----------
        path:
            Destination file path. Defaults to :attr:`output_path`.
        """
        target = Path(path or self.output_path)
        summary = {
            "total": len(self.results),
            "passed": sum(1 for r in self.results if r["outcome"] == "passed"),
            "failed": sum(1 for r in self.results if r["outcome"] == "failed"),
            "skipped": sum(1 for r in self.results if r["outcome"] == "skipped"),
        }
        payload = {"summary": summary, "results": self.results}
        with target.open("w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
