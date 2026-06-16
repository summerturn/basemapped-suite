.PHONY: setup start stop logs backup migrate status

setup:
	@bash scripts/setup.sh

start:
	docker compose up -d

stop:
	docker compose down

logs:
	docker compose logs -f

backup:
	@bash scripts/backup.sh

migrate:
	docker compose exec backend npm run migrate

status:
	docker compose ps
