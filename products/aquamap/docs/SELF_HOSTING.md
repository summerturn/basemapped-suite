# AquaMap Self-Hosting Guide

## Requirements

- **OS**: Ubuntu 22.04 LTS (recommended)
- **CPU**: 2 cores minimum
- **RAM**: 4 GB minimum
- **Disk**: 20 GB SSD minimum
- **Software**: Docker Engine 24.x, Docker Compose 2.x

## DNS & SSL

1. Point your domain (e.g., `aquamap.yourdomain.com`) to the server IP.
2. Install Certbot or use a reverse proxy with Let's Encrypt support.
3. Update `nginx/nginx.conf` to listen on 443 and provide certificate paths.

## Firewall

Open the following ports:

- `80/tcp` (HTTP)
- `443/tcp` (HTTPS)
- `22/tcp` (SSH)

## Installation

```bash
git clone https://github.com/your-org/aquamap.git
cd aquamap
cp .env.example .env
# Edit .env with your secrets and domain
make setup
```

## Backup Verification

Run a test backup and restore:

```bash
make backup
# To restore:
gunzip -c backups/aquamap_YYYYMMDD_HHMMSS.sql.gz | docker compose exec -T db psql -U aquamap -d aquamap
```

## Updates

```bash
docker compose pull
docker compose up -d
```

## Support

For issues, contact your system administrator or open an issue in the repository.
