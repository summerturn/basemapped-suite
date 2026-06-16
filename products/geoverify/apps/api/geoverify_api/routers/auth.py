import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geoverify_api.config import settings
from geoverify_api.database import get_db
from geoverify_api.models.user import User
from geoverify_api.schemas.auth import GitHubAuthRequest, TokenResponse
from geoverify_api.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/github")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


@router.post("/github", response_model=TokenResponse)
async def github_auth(
    auth_data: GitHubAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": auth_data.code,
            },
        )
        token_data = token_resp.json()
        if "access_token" not in token_data:
            raise HTTPException(status_code=400, detail="Invalid GitHub code")
        github_token = token_data["access_token"]

        user_resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        user_data = user_resp.json()

        emails_resp = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        emails_data = emails_resp.json()
        primary_email = None
        for email in emails_data:
            if email.get("primary"):
                primary_email = email.get("email")
                break
        if not primary_email and emails_data:
            primary_email = emails_data[0].get("email")

    github_id = user_data.get("id")
    username = user_data.get("login")
    avatar_url = user_data.get("avatar_url")

    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            github_id=github_id,
            username=username,
            email=primary_email,
            avatar_url=avatar_url,
        )
        db.add(user)
    else:
        user.username = username
        user.email = primary_email
        user.avatar_url = avatar_url

    await db.commit()
    await db.refresh(user)

    access_token = jwt.encode(
        {"sub": str(user.id)},
        settings.SECRET_KEY,
        algorithm="HS256",
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
