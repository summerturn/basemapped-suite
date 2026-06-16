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

"""Cloud dashboard client for uploading geospatial reports."""

from __future__ import annotations

import asyncio
from pathlib import Path

import httpx


class CloudClient:
    """Async HTTP client for uploading reports to a cloud dashboard."""

    def __init__(
        self,
        base_url: str,
        api_token: str,
        *,
        max_retries: int = 3,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_token = api_token
        self.max_retries = max_retries
        self.timeout = timeout

    async def upload_report(self, report_path: str) -> dict:
        """Upload a report file to the cloud dashboard.

        Parameters
        ----------
        report_path:
            Path to the report file on disk.

        Returns
        -------
        dict
            Parsed JSON response from the server.

        Raises
        ------
        FileNotFoundError
            If *report_path* does not exist.
        RuntimeError
            If the upload fails after all retries.
        """
        path = Path(report_path)
        if not path.exists():
            raise FileNotFoundError(f"Report not found: {report_path}")

        url = f"{self.base_url}/api/v1/reports"
        headers = {"Authorization": f"Bearer {self.api_token}"}

        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    with path.open("rb") as f:
                        files = {"file": (path.name, f, "application/json")}
                        response = await client.post(url, files=files, headers=headers)
                    response.raise_for_status()
                    return response.json()
            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                if attempt == self.max_retries:
                    raise RuntimeError(
                        f"Upload failed after {self.max_retries} attempts: {exc}"
                    ) from exc
                await asyncio.sleep(2 ** attempt)

        # Unreachable, but satisfies type checkers.
        raise RuntimeError("Upload failed unexpectedly.")
