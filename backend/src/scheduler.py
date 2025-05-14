from datetime import datetime, timedelta

from backend.extensions import create_logger, db
from backend.models import CalendarEvent, ScheduledTask, Task, TaskDependency

logger = create_logger(__name__)


def generate_schedule(start_date, end_date):
    """
    Generate a schedule by placing tasks in available time slots

    This is a placeholder implementation of the scheduling algorithm.
    The full implementation will need to:
    1. Respect work calendar events as immutable constraints
    2. Schedule tasks according to dependencies, due dates, and time windows
    3. Optimize for efficiency

    Args:
        start_date (datetime): Start date for the scheduling period
        end_date (datetime): End date for the scheduling period

    Returns:
        list: List of scheduled task dictionaries with task_id, start, and end
    """
    logger.info(f"Generating schedule from {start_date} to {end_date}")

    # Get calendar events for the period (these are the constraints)
    calendar_events = (
        CalendarEvent.query.filter(
            CalendarEvent.end >= start_date, CalendarEvent.start <= end_date
        )
        .order_by(CalendarEvent.start)
        .all()
    )

    # Get incomplete one-off tasks with due dates in this period or earlier
    one_off_tasks = (
        Task.query.filter(
            Task.task_type == "one-off",
            Task.is_completed == False,
            db.or_(Task.due_by <= end_date, Task.due_by == None),
        )
        .order_by(Task.due_by.asc().nullslast())
        .all()
    )

    # Get active recurring tasks
    recurring_tasks = Task.query.filter(
        Task.task_type == "recurring", Task.is_active == True
    ).all()

    # Collect task dependencies
    task_dependencies = {}
    for task in one_off_tasks:
        deps = (
            db.session.query(TaskDependency.dependency_id)
            .filter_by(task_id=task.id)
            .all()
        )
        task_dependencies[task.id] = [dep[0] for dep in deps]

    # Find available time slots (for a real implementation, this would be more sophisticated)
    available_slots = find_available_slots(calendar_events, start_date, end_date)

    # Schedule one-off tasks based on priority
    scheduled_tasks = []

    # Simple topological sort for dependency resolution
    scheduled_task_ids = set()
    to_schedule = []

    # Process tasks with dependencies first
    while one_off_tasks:
        scheduled_this_round = False
        for i, task in enumerate(one_off_tasks):
            # Check if all dependencies are scheduled
            deps = task_dependencies.get(task.id, [])
            if all(dep_id in scheduled_task_ids for dep_id in deps):
                # This task's dependencies are satisfied
                to_schedule.append(task)
                scheduled_task_ids.add(task.id)
                one_off_tasks.pop(i)
                scheduled_this_round = True
                break

        if not scheduled_this_round and one_off_tasks:
            # There must be a circular dependency or unresolvable constraint
            # For simplicity, just add the first task and move on
            to_schedule.append(one_off_tasks[0])
            scheduled_task_ids.add(one_off_tasks[0].id)
            one_off_tasks.pop(0)

    # Schedule the sorted tasks
    for task in to_schedule:
        # Find an appropriate slot for this task
        for slot_start, slot_end in available_slots:
            slot_duration = (slot_end - slot_start).total_seconds() / 60
            if slot_duration >= task.duration:
                # This slot fits the task
                task_end = slot_start + timedelta(minutes=task.duration)

                scheduled_tasks.append(
                    {"task_id": task.id, "start": slot_start, "end": task_end}
                )

                # Update available slots
                available_slots.remove((slot_start, slot_end))
                if task_end < slot_end:
                    available_slots.append((task_end, slot_end))

                break

    # Schedule recurring tasks (simplified implementation)
    for task in recurring_tasks:
        recurrence_pattern = task.recurrence
        if not recurrence_pattern:
            continue

        # Extract recurrence pattern (simplified for placeholder)
        # In reality, this would parse complex recurrence patterns
        if "daily" in recurrence_pattern:
            # Schedule it once each day
            current_date = start_date.replace(
                hour=9, minute=0, second=0
            )  # Default to 9 AM

            # Adjust for time window if specified
            if task.time_window_start:
                current_date = current_date.replace(
                    hour=task.time_window_start.hour,
                    minute=task.time_window_start.minute,
                )

            while current_date < end_date:
                # Check if this time works with the task's time window
                in_time_window = True
                if task.time_window_start and task.time_window_end:
                    current_time = current_date.time()
                    in_time_window = (
                        task.time_window_start <= current_time <= task.time_window_end
                    )

                if in_time_window:
                    # Find an available slot that contains this time
                    for slot_start, slot_end in available_slots:
                        if slot_start <= current_date < slot_end:
                            task_end = current_date + timedelta(minutes=task.duration)
                            if task_end <= slot_end:
                                scheduled_tasks.append(
                                    {
                                        "task_id": task.id,
                                        "start": current_date,
                                        "end": task_end,
                                    }
                                )

                                # Update available slots
                                available_slots.remove((slot_start, slot_end))
                                if slot_start < current_date:
                                    available_slots.append((slot_start, current_date))
                                if task_end < slot_end:
                                    available_slots.append((task_end, slot_end))

                                break

                # Move to next day
                current_date = current_date + timedelta(days=1)

    logger.info(f"Scheduled {len(scheduled_tasks)} tasks")
    return scheduled_tasks


def find_available_slots(calendar_events, start_date, end_date):
    """
    Find available time slots between calendar events

    This is a simplified implementation that:
    1. Assumes a standard 8 AM - 4 PM workday
    2. Treats all calendar events as blocking
    3. Finds continuous available slots between events

    Args:
        calendar_events (list): List of CalendarEvent objects
        start_date (datetime): Start date for the scheduling period
        end_date (datetime): End date for the scheduling period

    Returns:
        list: List of tuples (start_time, end_time) representing available slots
    """
    # Create a list of busy slots from calendar events
    busy_slots = [(event.start, event.end) for event in calendar_events]

    # Assume workday is 8 AM - 4 PM
    work_start_hour = 8
    work_end_hour = 16

    # Initialize available slots with work hours for each day
    available_slots = []
    current_date = start_date.replace(
        hour=work_start_hour, minute=0, second=0, microsecond=0
    )

    while current_date.date() <= end_date.date():
        # Skip weekends (0 = Monday, 6 = Sunday in Python's datetime)
        if current_date.weekday() < 5:  # Weekday
            day_start = current_date.replace(hour=work_start_hour, minute=0)
            day_end = current_date.replace(hour=work_end_hour, minute=0)
            available_slots.append((day_start, day_end))

        # Move to next day
        current_date = current_date + timedelta(days=1)

    # Remove busy times from available slots
    result_slots = []

    for avail_start, avail_end in available_slots:
        # Check each busy slot against this available slot
        current_start = avail_start

        for busy_start, busy_end in sorted(busy_slots):
            # Skip busy slots that don't overlap with this available slot
            if busy_end <= avail_start or busy_start >= avail_end:
                continue

            # If there's time before the busy slot, add it as available
            if current_start < busy_start:
                result_slots.append((current_start, busy_start))

            # Move current_start to end of this busy period
            current_start = max(current_start, busy_end)

            # If we've consumed the entire available slot, break
            if current_start >= avail_end:
                break

        # Add any remaining time as available
        if current_start < avail_end:
            result_slots.append((current_start, avail_end))

    return result_slots
