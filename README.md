# Basemapped Suite

Monorepo of Basemapped geospatial products and shared integrations.

## Products

| Product | Folder | Status | Description |
|---------|--------|--------|-------------|
| **MapDrop** | [`products/mapdrop`](products/mapdrop) | Live | Spreadsheet → interactive map in seconds. |
| **GeoLint** | [`products/geolint`](products/geolint) | Beta | Automated geospatial data quality & validation. |
| **GeoVerify** | [`products/geoverify`](products/geoverify) | Beta | Pytest plugin for geospatial testing. |
| **AquaMap** | [`products/aquamap`](products/aquamap) | Beta | GIS built for water & wastewater utilities. |
| **EternalMap** | [`products/eternalmap`](products/eternalmap) | Beta | Digital cemetery management. |

## Shared Code

- [`integrations/`](integrations) — Cross-product API clients, OpenAPI specs, and integration tests.

## Marketing Site

The public site lives in its own repo: [`BaseMapped-site`](https://github.com/summerturn/BaseMapped-site).

## Getting Started

Each product is self-contained. See the README inside each product folder for local setup.

```bash
cd products/mapdrop
npm install
npm run dev
```

## Deployment

- Static products are deployed to Cloudflare Pages.
- MapDrop (full-stack Next.js + Docker) is deployed to a DigitalOcean droplet.
