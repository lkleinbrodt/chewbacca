import json
import os
import re
from datetime import datetime, timedelta

import pytz
from flask import Blueprint, current_app, jsonify, make_response, redirect, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
    set_refresh_cookies,
    unset_jwt_cookies,
)

from backend.extensions import create_logger, db
from backend.models import CalendarEvent, ScheduledTask, Task, TaskDependency
from backend.src.OAuthSignIn import OAuthSignIn
from backend.src.scheduler import generate_schedule

logger = create_logger(__name__, level="DEBUG")

base_bp = Blueprint("base", __name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
task_bp = Blueprint("task", __name__, url_prefix="/api/tasks")
calendar_bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")
schedule_bp = Blueprint("schedule", __name__, url_prefix="/api/schedule")

# Default timezone for the application
LOCAL_TIMEZONE = pytz.timezone("America/Los_Angeles")


# Helper functions
def parse_iso_datetime(datetime_str, convert_to_local=False):
    if not datetime_str:
        return None

    # Handle the specific format with 7 decimal places
    if re.match(r"\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\.\d{7}", datetime_str):
        # Convert from filename format to ISO format
        datetime_str = datetime_str.replace("_", ":")

    # Handle the format with 7 decimal places in the fractional seconds
    if re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}", datetime_str):
        # Truncate to 6 decimal places which is the maximum Python's fromisoformat can handle
        datetime_str = datetime_str[:-1]

    dt = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))

    # Convert from UTC to local timezone if requested
    if convert_to_local and dt.tzinfo is not None:
        dt = dt.astimezone(LOCAL_TIMEZONE)
        # Remove timezone info for database storage, but keep the converted time
        dt = dt.replace(tzinfo=None)

    return dt


@base_bp.route("/")
def index():
    """API root endpoint - returns API status and basic information"""
    logger.info("Root endpoint accessed")
    return (
        jsonify(
            {
                "status": "healthy",
            }
        ),
        200,
    )


# Task routes
@task_bp.route("", methods=["GET"])
def get_tasks():
    """Get all tasks with optional filtering"""
    task_type = request.args.get("type")
    is_completed = request.args.get("is_completed")

    query = Task.query

    if task_type:
        query = query.filter(Task.task_type == task_type)

    if is_completed is not None:
        is_completed = is_completed.lower() == "true"
        query = query.filter(Task.is_completed == is_completed)

    tasks = query.all()

    result = []
    for task in tasks:
        task_data = {
            "id": task.id,
            "content": task.content,
            "duration": task.duration,
            "is_completed": task.is_completed,
            "task_type": task.task_type,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
        }

        if task.task_type == "one-off":
            task_data["due_by"] = task.due_by.isoformat() if task.due_by else None
            # Get dependencies
            dependencies = (
                db.session.query(TaskDependency.dependency_id)
                .filter_by(task_id=task.id)
                .all()
            )
            task_data["dependencies"] = [dep[0] for dep in dependencies]
        else:  # recurring
            task_data["recurrence"] = task.recurrence
            task_data["time_window"] = {
                "start": (
                    task.time_window_start.isoformat()
                    if task.time_window_start
                    else None
                ),
                "end": (
                    task.time_window_end.isoformat() if task.time_window_end else None
                ),
            }
            task_data["is_active"] = task.is_active

        result.append(task_data)

    return jsonify(result)


@task_bp.route("", methods=["POST"])
def create_task():
    """Create a new task"""
    data = request.json

    if (
        not data
        or not data.get("content")
        or not data.get("duration")
        or not data.get("task_type")
    ):
        return jsonify({"error": "Missing required fields"}), 400

    task = Task(
        content=data["content"], duration=data["duration"], task_type=data["task_type"]
    )

    if task.task_type == "one-off":
        task.due_by = parse_iso_datetime(data.get("due_by"))
    else:  # recurring
        task.recurrence = data.get("recurrence")
        time_window = data.get("time_window", {})
        if time_window.get("start"):
            task.time_window_start = datetime.strptime(
                time_window["start"], "%H:%M"
            ).time()
        if time_window.get("end"):
            task.time_window_end = datetime.strptime(time_window["end"], "%H:%M").time()
        task.is_active = data.get("is_active", True)

    db.session.add(task)
    db.session.commit()

    # Handle dependencies for one-off tasks
    if task.task_type == "one-off" and data.get("dependencies"):
        for dep_id in data["dependencies"]:
            dependency = TaskDependency(task_id=task.id, dependency_id=dep_id)
            db.session.add(dependency)
        db.session.commit()

    return (
        jsonify(
            {
                "id": task.id,
                "content": task.content,
                "message": "Task created successfully",
            }
        ),
        201,
    )


@task_bp.route("/<task_id>", methods=["GET"])
def get_task(task_id):
    """Get task details"""
    task = Task.query.get_or_404(task_id)

    result = {
        "id": task.id,
        "content": task.content,
        "duration": task.duration,
        "is_completed": task.is_completed,
        "task_type": task.task_type,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }

    if task.task_type == "one-off":
        result["due_by"] = task.due_by.isoformat() if task.due_by else None
        # Get dependencies
        dependencies = (
            db.session.query(TaskDependency.dependency_id)
            .filter_by(task_id=task.id)
            .all()
        )
        result["dependencies"] = [dep[0] for dep in dependencies]
    else:  # recurring
        result["recurrence"] = task.recurrence
        result["time_window"] = {
            "start": (
                task.time_window_start.isoformat() if task.time_window_start else None
            ),
            "end": task.time_window_end.isoformat() if task.time_window_end else None,
        }
        result["is_active"] = task.is_active

    return jsonify(result)


@task_bp.route("/<task_id>", methods=["PUT"])
def update_task(task_id):
    """Update a task"""
    task = Task.query.get_or_404(task_id)
    data = request.json

    if "content" in data:
        task.content = data["content"]
    if "duration" in data:
        task.duration = data["duration"]
    if "is_completed" in data:
        task.is_completed = data["is_completed"]

    if task.task_type == "one-off":
        if "due_by" in data:
            task.due_by = parse_iso_datetime(data.get("due_by"))

        # Update dependencies
        if "dependencies" in data:
            # Remove all existing dependencies
            TaskDependency.query.filter_by(task_id=task.id).delete()

            # Add new dependencies
            for dep_id in data["dependencies"]:
                dependency = TaskDependency(task_id=task.id, dependency_id=dep_id)
                db.session.add(dependency)
    else:  # recurring
        if "recurrence" in data:
            task.recurrence = data["recurrence"]

        if "time_window" in data:
            time_window = data["time_window"]
            if time_window.get("start"):
                task.time_window_start = datetime.strptime(
                    time_window["start"], "%H:%M"
                ).time()
            else:
                task.time_window_start = None

            if time_window.get("end"):
                task.time_window_end = datetime.strptime(
                    time_window["end"], "%H:%M"
                ).time()
            else:
                task.time_window_end = None

        if "is_active" in data:
            task.is_active = data["is_active"]

    db.session.commit()

    return jsonify({"message": "Task updated successfully"})


@task_bp.route("/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    """Delete a task"""
    task = Task.query.get_or_404(task_id)

    # Delete related dependencies
    TaskDependency.query.filter_by(task_id=task.id).delete()
    TaskDependency.query.filter_by(dependency_id=task.id).delete()

    db.session.delete(task)
    db.session.commit()

    return jsonify({"message": "Task deleted successfully"})


@task_bp.route("/<task_id>/complete", methods=["POST"])
def complete_task(task_id):
    """Mark task as complete"""
    task = Task.query.get_or_404(task_id)

    task.is_completed = True
    db.session.commit()

    # Also mark scheduled instances as completed
    if task.scheduled_instances:
        for scheduled in task.scheduled_instances:
            scheduled.status = "completed"
        db.session.commit()

    return jsonify({"message": "Task marked as complete"})


# Calendar routes
@calendar_bp.route("", methods=["GET"])
def get_calendar():
    """Get current calendar events within a date range"""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not start_date or not end_date:
        return jsonify({"error": "Missing start_date or end_date parameters"}), 400

    try:
        start = parse_iso_datetime(start_date)
        end = parse_iso_datetime(end_date)
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    events = CalendarEvent.query.filter(
        CalendarEvent.end >= start, CalendarEvent.start <= end
    ).all()

    result = []
    for event in events:
        result.append(
            {
                "id": event.id,
                "subject": event.subject,
                "start": event.start.isoformat(),
                "end": event.end.isoformat(),
                "is_chewy_managed": event.is_chewy_managed,
                "categories": event.categories,
            }
        )

    return jsonify(result)


@calendar_bp.route("/sync", methods=["POST"])
def sync_calendar():
    """Sync calendar events from JSON files"""
    calendar_dir = current_app.config.get("CALENDAR_JSON_DIR")

    if not calendar_dir or not os.path.exists(calendar_dir):
        return (
            jsonify({"error": "Calendar directory not configured or does not exist"}),
            500,
        )

    # Track files processed and events synced
    processed_files = []
    events_synced = 0

    # List all JSON files in the directory
    json_files = [f for f in os.listdir(calendar_dir) if f.endswith(".json")]

    # Get all current event IDs in database to track removed events
    current_event_ids = set(event.id for event in CalendarEvent.query.all())
    synced_event_ids = set()

    for json_file in json_files:
        file_path = os.path.join(calendar_dir, json_file)
        processed_files.append(json_file)

        try:
            with open(file_path, "r") as f:
                events_data = json.load(f)

                if not isinstance(events_data, list):
                    events_data = [events_data]

                for event_data in events_data:
                    # Check for required fields
                    if not all(
                        key in event_data for key in ["id", "subject", "start", "end"]
                    ):
                        continue

                    # Parse dates with timezone conversion
                    # Prioritize using the fields with timezone information
                    if "startWithTimeZone" in event_data:
                        start_time = parse_iso_datetime(
                            event_data["startWithTimeZone"], convert_to_local=True
                        )
                    else:
                        start_time = parse_iso_datetime(
                            event_data["start"], convert_to_local=True
                        )

                    if "endWithTimeZone" in event_data:
                        end_time = parse_iso_datetime(
                            event_data["endWithTimeZone"], convert_to_local=True
                        )
                    else:
                        end_time = parse_iso_datetime(
                            event_data["end"], convert_to_local=True
                        )

                    if not start_time or not end_time:
                        continue

                    # Check if the event has "Chewy" in categories
                    categories = event_data.get("categories", [])
                    is_chewy_managed = any("chewy" in cat.lower() for cat in categories)

                    # Check if event already exists
                    event = CalendarEvent.query.get(event_data["id"])

                    if event:
                        # Update existing event
                        event.subject = event_data["subject"]
                        event.start = start_time
                        event.end = end_time
                        event.is_chewy_managed = is_chewy_managed
                        event.source_file = json_file
                        event.categories = categories
                        event.raw_data = event_data
                    else:
                        # Create new event
                        event = CalendarEvent(
                            id=event_data["id"],
                            subject=event_data["subject"],
                            start=start_time,
                            end=end_time,
                            is_chewy_managed=is_chewy_managed,
                            source_file=json_file,
                            categories=categories,
                            raw_data=event_data,
                        )
                        db.session.add(event)

                    events_synced += 1
                    synced_event_ids.add(event_data["id"])

        except Exception as e:
            logger.error(f"Error processing file {json_file}: {str(e)}")
            # Log more detailed error information
            import traceback

            logger.error(traceback.format_exc())

    # Delete events that are no longer present in the JSON files
    events_to_delete = current_event_ids - synced_event_ids
    if events_to_delete:
        CalendarEvent.query.filter(CalendarEvent.id.in_(events_to_delete)).delete(
            synchronize_session="fetch"
        )

    db.session.commit()

    return jsonify(
        {
            "message": "Calendar synced successfully",
            "files_processed": processed_files,
            "events_synced": events_synced,
            "events_deleted": len(events_to_delete),
        }
    )


@calendar_bp.route("/events", methods=["GET"])
def get_all_events():
    """Get all calendar events"""
    events = CalendarEvent.query.all()

    result = []
    for event in events:
        result.append(
            {
                "id": event.id,
                "subject": event.subject,
                "start": event.start.isoformat(),
                "end": event.end.isoformat(),
                "is_chewy_managed": event.is_chewy_managed,
                "categories": event.categories,
            }
        )

    return jsonify(result)


@calendar_bp.route("/events/<event_id>", methods=["PUT"])
def update_event(event_id):
    """Update a Chewy-managed event"""
    event = CalendarEvent.query.get_or_404(event_id)

    # Only allow updating Chewy-managed events
    if not event.is_chewy_managed:
        return jsonify({"error": "Cannot update events not managed by Chewy"}), 403

    data = request.json

    if "subject" in data:
        event.subject = data["subject"]
    if "start" in data:
        event.start = parse_iso_datetime(data["start"])
    if "end" in data:
        event.end = parse_iso_datetime(data["end"])

    db.session.commit()

    return jsonify({"message": "Event updated successfully"})


@calendar_bp.route("/events/clear", methods=["DELETE"])
def clear_all_events():
    """Clear all calendar events - for testing purposes"""
    try:
        CalendarEvent.query.delete()
        db.session.commit()
        return jsonify({"message": "All calendar events cleared successfully"})
    except Exception as e:
        logger.error(f"Error clearing calendar events: {str(e)}")
        return jsonify({"error": f"Failed to clear events: {str(e)}"}), 500


# Schedule routes
@schedule_bp.route("/generate", methods=["POST"])
def generate_new_schedule():
    """Generate a new schedule"""
    data = request.json or {}

    # Get date range for scheduling
    start_date = parse_iso_datetime(
        data.get("start_date", datetime.utcnow().isoformat())
    )
    end_date = parse_iso_datetime(
        data.get("end_date", (datetime.utcnow() + timedelta(days=7)).isoformat())
    )

    if not start_date or not end_date:
        return jsonify({"error": "Invalid date range"}), 400

    # Clear existing scheduled tasks in the date range
    ScheduledTask.query.filter(
        ScheduledTask.start >= start_date, ScheduledTask.start <= end_date
    ).delete()

    # Generate new schedule
    try:
        scheduled_tasks = generate_schedule(start_date, end_date)

        # Save scheduled tasks to database
        for task_data in scheduled_tasks:
            scheduled_task = ScheduledTask(
                task_id=task_data["task_id"],
                start=task_data["start"],
                end=task_data["end"],
                status="scheduled",
            )
            db.session.add(scheduled_task)

        db.session.commit()

        return jsonify(
            {
                "message": "Schedule generated successfully",
                "tasks_scheduled": len(scheduled_tasks),
            }
        )
    except Exception as e:
        logger.error(f"Error generating schedule: {str(e)}")
        return jsonify({"error": f"Failed to generate schedule: {str(e)}"}), 500


@schedule_bp.route("", methods=["GET"])
def get_schedule():
    """Get current schedule"""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not start_date or not end_date:
        return jsonify({"error": "Missing start_date or end_date parameters"}), 400

    try:
        start = parse_iso_datetime(start_date)
        end = parse_iso_datetime(end_date)
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    scheduled_tasks = ScheduledTask.query.filter(
        ScheduledTask.start >= start, ScheduledTask.start <= end
    ).all()

    result = []
    for st in scheduled_tasks:
        task = Task.query.get(st.task_id)
        if not task:
            continue

        result.append(
            {
                "id": st.id,
                "task_id": st.task_id,
                "task_content": task.content,
                "start": st.start.isoformat(),
                "end": st.end.isoformat(),
                "status": st.status,
                "duration": task.duration,
            }
        )

    return jsonify(result)


@schedule_bp.route("/tasks/<scheduled_task_id>", methods=["PUT"])
def update_scheduled_task(scheduled_task_id):
    """Manually update a scheduled task"""
    scheduled_task = ScheduledTask.query.get_or_404(scheduled_task_id)
    data = request.json

    if "start" in data:
        scheduled_task.start = parse_iso_datetime(data["start"])
    if "end" in data:
        scheduled_task.end = parse_iso_datetime(data["end"])
    if "status" in data:
        scheduled_task.status = data["status"]

    db.session.commit()

    return jsonify({"message": "Scheduled task updated successfully"})
