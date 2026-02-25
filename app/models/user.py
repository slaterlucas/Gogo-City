"""User model."""
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.route import RouteTemplate, RouteInstance
    from app.models.checkin import CheckIn


class User(Base, UUIDMixin, TimestampMixin):
    """Core user identity."""
    
    __tablename__ = "users"
    
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(100))
    avatar_url: Mapped[Optional[str]] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    
    # Relationships
    authored_templates: Mapped[list["RouteTemplate"]] = relationship(
        back_populates="author",
        cascade="all, delete-orphan",
    )
    route_instances: Mapped[list["RouteInstance"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    check_ins: Mapped[list["CheckIn"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
