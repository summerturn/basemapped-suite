"""Project business logic."""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from geoverify_api.models.project import Project


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, name: str, slug: str, repo_url: str | None = None, **kwargs) -> Project:
        project = Project(name=name, slug=slug, repo_url=repo_url, **kwargs)
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get(self, project_id: UUID) -> Project | None:
        result = await self.db.execute(select(Project).where(Project.id == project_id))
        return result.scalar_one_or_none()

    async def list_by_team(self, team_id: UUID | None = None) -> list[Project]:
        query = select(Project)
        if team_id:
            query = query.where(Project.team_id == team_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(self, project_id: UUID, **kwargs) -> Project | None:
        project = await self.get(project_id)
        if not project:
            return None
        for key, value in kwargs.items():
            setattr(project, key, value)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete(self, project_id: UUID) -> bool:
        project = await self.get(project_id)
        if not project:
            return False
        await self.db.delete(project)
        await self.db.commit()
        return True
