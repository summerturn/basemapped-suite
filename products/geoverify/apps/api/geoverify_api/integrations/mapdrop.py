from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import httpx

router = APIRouter(prefix="/integrations/mapdrop", tags=["integrations"])

class MapDropAssertionRequest(BaseModel):
    mapId: str
    assertions: List[Dict[str, Any]]

@router.post("/assert")
async def assert_mapdrop_data(req: MapDropAssertionRequest):
    """Run spatial assertions on MapDrop map data."""
    mapdrop_url = f"{__import__('os').environ.get('MAPDROP_API_URL', 'http://mapdrop:3000')}/api/maps/{req.mapId}/export/geojson"

    async with httpx.AsyncClient(timeout=30.0) as client:
        map_resp = await client.get(mapdrop_url)
        if map_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch map data from MapDrop")
        geojson = map_resp.json()

    # Run assertions using the core assertion engine
    from ..assertions import assert_geometry_valid, assert_geometry_equals
    results = []
    for assertion in req.assertions:
        if assertion["type"] == "geometry_valid":
            try:
                for feat in geojson.get("features", []):
                    geom = feat.get("geometry")
                    if geom:
                        assert_geometry_valid(geom)
                results.append({"assertion": "geometry_valid", "passed": True})
            except Exception as e:
                results.append({"assertion": "geometry_valid", "passed": False, "error": str(e)})
        else:
            results.append({"assertion": assertion["type"], "passed": False, "error": "Unsupported assertion type"})

    return {"success": True, "data": {"passed": all(r["passed"] for r in results), "results": results}}
