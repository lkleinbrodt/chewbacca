import uuid
from datetime import datetime

from .extensions import db, jwt


def generate_uuid():
    return str(uuid.uuid4())


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    content = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # in minutes
    is_completed = db.Column(db.Boolean, default=False)
    task_type = db.Column(db.String(20), nullable=False)  # "one-off" or "recurring"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # One-off task specific fields
    due_by = db.Column(db.DateTime, nullable=True)

    # Recurring task specific fields
    recurrence = db.Column(db.JSON, nullable=True)  # pattern specification
    time_window_start = db.Column(db.Time, nullable=True)
    time_window_end = db.Column(db.Time, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f"<Task {self.id}: {self.content}>"


class TaskDependency(db.Model):
    __tablename__ = "task_dependencies"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(
        db.String(36), db.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    dependency_id = db.Column(
        db.String(36), db.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )

    task = db.relationship(
        "Task",
        foreign_keys=[task_id],
        backref=db.backref("dependencies_assoc", cascade="all, delete-orphan"),
    )
    dependency = db.relationship("Task", foreign_keys=[dependency_id])

    __table_args__ = (
        db.UniqueConstraint("task_id", "dependency_id", name="_task_dependency_uc"),
    )


class CalendarEvent(db.Model):
    __tablename__ = "calendar_events"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    subject = db.Column(db.String(255), nullable=False)
    start = db.Column(db.DateTime, nullable=False)
    end = db.Column(db.DateTime, nullable=False)
    is_chewy_managed = db.Column(db.Boolean, default=False)
    source_file = db.Column(db.String(255), nullable=True)  # Original JSON file path
    categories = db.Column(db.JSON, nullable=True)  # List of categories
    raw_data = db.Column(
        db.JSON, nullable=True
    )  # Additional fields from JSON as needed

    def __repr__(self):
        return f"<CalendarEvent {self.id}: {self.subject}>"


class ScheduledTask(db.Model):
    __tablename__ = "scheduled_tasks"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    task_id = db.Column(
        db.String(36), db.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    start = db.Column(db.DateTime, nullable=False)
    end = db.Column(db.DateTime, nullable=False)
    status = db.Column(
        db.String(20), default="scheduled"
    )  # "scheduled", "completed", "rescheduled"

    task = db.relationship(
        "Task", backref=db.backref("scheduled_instances", cascade="all, delete-orphan")
    )

    def __repr__(self):
        return f"<ScheduledTask {self.id}: for task {self.task_id}>"


# class User(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     google_id = db.Column(db.String(255), nullable=True)
#     apple_id = db.Column(db.String(255), nullable=True)
#     stripe_customer_id = db.Column(db.String(255), nullable=True)

#     name = db.Column(db.String(255), nullable=True)
#     image = db.Column(db.String(255), nullable=True)
#     email = db.Column(db.String(255), nullable=True, unique=True)
#     email_verified = db.Column("emailVerified", db.DateTime, nullable=True)

#     created_at = db.Column(
#         "createdAt", db.DateTime, nullable=False, default=db.func.now()
#     )
#     updated_at = db.Column(
#         "updatedAt", db.DateTime, nullable=False, default=db.func.now()
#     )

#     def __repr__(self):
#         return f"<User {self.id}>"

#     def __str__(self) -> str:
#         return f"<User {self.id}>"


# @jwt.user_lookup_loader
# def user_lookup_callback(_jwt_header, jwt_data):
#     # decode the jwt_data
#     identity = jwt_data["sub"]
#     return User.query.filter_by(id=identity).one_or_none()
