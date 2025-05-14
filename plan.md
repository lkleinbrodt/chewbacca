# Chewy - AI Task Management Assistant

## Design Document & Implementation Plan

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Technical Architecture](#technical-architecture)
4. [Core Components](#core-components)
   - [Task Management System](#task-management-system)
   - [Calendar Integration](#calendar-integration)
   - [Scheduling Algorithm](#scheduling-algorithm)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [User Interface Design](#user-interface-design)
8. [Implementation Plan](#implementation-plan)
9. [Testing Strategy](#testing-strategy)
10. [Future Enhancements](#future-enhancements)

## Introduction

Chewy is a personal time/task management application designed to intelligently schedule tasks around existing calendar commitments. The app's primary function is to optimize the user's schedule by placing tasks in available time slots while respecting dependencies, time windows, and due dates.

### Key Features

- Task management with dependencies and time constraints
- Calendar integration with work schedule
- Intelligent task scheduling with constraint satisfaction
- Support for one-off and recurring tasks
- Clean, intuitive user interface for managing tasks and viewing schedules

## System Overview

Chewy integrates two primary components:

1. **Task List Management**: For creating, editing, and tracking tasks with their attributes
2. **Calendar Integration & Scheduling**: For syncing with the user's work calendar and intelligently scheduling tasks

The system uses Flask for the backend API and React with Vite for the frontend. Data is stored in a database for tasks, while the existing calendar is synchronized from local JSON files.

## Technical Architecture

### Stack Overview

- **Backend**: Flask (Python)
- **Frontend**: React with Vite
- **Database**: SQLite (for personal use simplicity)
- **API**: RESTful endpoints

### System Architecture Diagram

```
┌─────────────┐     ┌────────────────┐     ┌───────────────┐
│             │     │                │     │               │
│ React       │◄───►│ Flask Backend  │◄───►│ SQLite DB     │
│ Frontend    │     │ API            │     │               │
│             │     │                │     │               │
└─────────────┘     └────────────────┘     └───────────────┘
                           ▲
                           │
                           ▼
                    ┌────────────────┐
                    │                │
                    │ Calendar JSON  │
                    │ Files          │
                    │                │
                    └────────────────┘
```

## Core Components

### Task Management System

#### One-off Tasks

Attributes:

- `id`: Unique identifier
- `content`: Description of the task
- `dependencies`: Array of task IDs that must be completed before this task
- `due_by`: Deadline date/time
- `duration`: Length in minutes
- `is_completed`: Boolean status flag

#### Recurring Tasks

Attributes:

- `id`: Unique identifier
- `content`: Description of the task
- `duration`: Length in minutes
- `recurrence`: Pattern (daily, weekly, custom days pattern)
- `time_window`: Optional restriction for when the task can be scheduled (start and end times)
- `is_active`: Boolean status flag

#### Task Operations

- Create new tasks (one-off and recurring)
- Edit existing tasks
- Delete tasks
- Mark tasks as complete
- View tasks (filtered by status, due date, etc.)

### Calendar Integration

#### Source Synchronization

- Regular polling of the local JSON folder containing calendar events
- Parse JSON files to extract event details
- Update the application's calendar representation
- Remove any events in the database that are not present in the JSON files

#### Event Types

- **Work Events**: Events from the work calendar (without "Chewy" in categories)
- **Chewy Events**: Events managed by the application (with "Chewy" in categories)

#### Synchronization Logic

1. Read all JSON files in the designated folder
2. Parse each file to extract event details
3. Compare with existing events in the database
4. Add new events, update changed events, remove deleted events
5. Flag events by source (Work vs. Chewy)

### Scheduling Algorithm

The scheduling algorithm is the core intelligence of Chewy. It must:

1. Respect work calendar events as immutable constraints
2. Schedule tasks according to their constraints:
   - Dependencies
   - Due dates
   - Time windows for recurring tasks
   - Recurrence patterns
3. Optimize for efficiency (minimize gaps while preventing overloaded days)

#### Algorithm Approach

We'll implement a constraint satisfaction algorithm with these steps:

1. **Calendar Preparation**:

   - Import work calendar events
   - Mark all existing time slots with work events as unavailable
   - Identify all available time slots

2. **Task Priority Sorting**:

   - Tasks with earlier due dates get higher priority
   - Tasks with dependencies get priority over dependent tasks
   - Tasks with time window constraints get consideration for their limited scheduling options

3. **Scheduling Process**:

   - For each task in priority order:
     - Find suitable time slots that satisfy all constraints
     - Place the task in the earliest suitable slot
     - Mark that time slot as occupied
     - Update available slots list

4. **Recurring Task Handling**:

   - Generate occurrences based on recurrence pattern
   - Find suitable slots within time windows (if specified)
   - Schedule each occurrence independently to allow flexibility within constraints

5. **Validation**:
   - Ensure all constraints are satisfied
   - Check for any unscheduled tasks and report them

## Data Models

### Task

```python
class Task:
    id: str  # UUID
    content: str
    duration: int  # minutes
    is_completed: bool
    task_type: str  # "one-off" or "recurring"

    # For one-off tasks
    dependencies: List[str]  # task IDs
    due_by: datetime

    # For recurring tasks
    recurrence: dict  # pattern specification
    time_window: dict  # optional { start_time, end_time }
    is_active: bool
```

### CalendarEvent

```python
class CalendarEvent:
    id: str  # UUID
    subject: str
    start: datetime
    end: datetime
    is_chewy_managed: bool  # True if "Chewy" in categories
    source_file: str  # Original JSON file path
    categories: List[str]
    # Additional fields from JSON as needed
```

### ScheduledTask

```python
class ScheduledTask:
    id: str  # UUID
    task_id: str  # Reference to Task
    start: datetime
    end: datetime
    status: str  # "scheduled", "completed", "rescheduled"
```

## API Endpoints

### Task Management

- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/<task_id>` - Get task details
- `PUT /api/tasks/<task_id>` - Update a task
- `DELETE /api/tasks/<task_id>` - Delete a task
- `POST /api/tasks/<task_id>/complete` - Mark task as complete

### Calendar Integration

- `GET /api/calendar` - Get current calendar (start_date, end_date)
- `POST /api/calendar/sync` - Trigger calendar sync from JSON files
- `GET /api/calendar/events` - Get all calendar events
- `PUT /api/calendar/events/<event_id>` - Update a Chewy-managed event

### Scheduling

- `POST /api/schedule/generate` - Generate a new schedule
- `GET /api/schedule` - Get current schedule
- `PUT /api/schedule/tasks/<scheduled_task_id>` - Manually update a scheduled task

## User Interface Design

### Task List Page

The Task List page provides a complete view of all tasks with filtering and sorting capabilities.

**Features**:

- Toggle between one-off and recurring tasks views
- Create new task button (+)
- Search and filter options
- Sort by various attributes (due date, duration, etc.)
- Edit/delete actions for each task
- Task dependency visualization

**Layout**:

```
┌─────────────────────────────────────────────────────────┐
│ CHEWY - TASK MANAGER                         [+ NEW TASK]│
├─────────────────────────────────────────────────────────┤
│ [ONE-OFF] [RECURRING] [COMPLETED]       [SEARCH ▼]      │
├─────────────────────────────────────────────────────────┤
│ ☐ Write project proposal                               │
│   Due: May 15, 2025 | Duration: 120 min                │
│   Dependencies: Research competitor products           │
│                                           [EDIT][DELETE]│
├─────────────────────────────────────────────────────────┤
│ ☐ Research competitor products                         │
│   Due: May 14, 2025 | Duration: 60 min                 │
│                                           [EDIT][DELETE]│
├─────────────────────────────────────────────────────────┤
│ ◷ Lunch                                                │
│   Duration: 30 min | Daily | 11:00 AM - 1:00 PM        │
│                                           [EDIT][DELETE]│
└─────────────────────────────────────────────────────────┘
```

### Schedule Page

The Schedule page displays a calendar view with work events and scheduled tasks, allowing for timeline visualization and manual adjustments.

**Features**:

- Week view
- Color-coded events (work vs. Chewy-managed)
- Drag-and-drop rescheduling for Chewy events
- Click to edit functionality
- Timeline visualization with clear time blocks

**Layout**:

```
┌─────────────────────────────────────────────────────────┐
│ CHEWY - SCHEDULE                     [WEEK▼] [< MAY 12-18, 2025 >]│
├─────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│     │ MONDAY  │ TUESDAY │WEDNESDAY│THURSDAY │ FRIDAY  │SATURDAY │
├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│8:00 │         │         │         │         │         │         │
├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│9:00 │[TEAM MTG]│         │[TEAM MTG]│         │         │         │
├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│10:00│         │[RESEARCH]│         │         │[PROJECT]│         │
├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│11:00│         │         │         │         │         │         │
├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│12:00│[LUNCH]  │[LUNCH]  │[LUNCH]  │[LUNCH]  │[LUNCH]  │         │
└─────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Task Creation/Edit Modal

**Features**:

- Form for all task attributes
- Dynamic fields based on task type
- Dependency selector
- Time window selection (for recurring tasks)
- Recurrence pattern builder

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. Set up Flask backend with database models
2. Implement basic API endpoints for tasks and calendar
3. Create React frontend scaffolding with routing
4. Implement calendar JSON file parsing

### Phase 2: Basic Task Management (Week 2)

1. Complete Task List UI with CRUD operations
2. Implement task creation/editing forms
3. Build API endpoints for task management
4. Create task dependency logic

### Phase 3: Calendar Integration (Week 3)

1. Implement calendar sync from JSON files
2. Build calendar visualization components
3. Create event differentiation (work vs. Chewy)
4. Implement basic event editing for Chewy events

### Phase 4: Scheduling Algorithm (Week 4)

1. Develop core scheduling algorithm
2. Implement constraint satisfaction logic
3. Build recurring task handling
4. Create validation and error reporting

### Phase 5: Integration and Polish (Week 5)

1. Connect scheduling algorithm to UI
2. Implement drag-and-drop rescheduling
3. Add validation and error handling
4. Polish UI and improve user experience

## Testing Strategy

### Unit Tests

- Task model validation
- Calendar event parsing
- Scheduling algorithm components
- API endpoint functionality

### Integration Tests

- End-to-end task creation to scheduling
- Calendar synchronization process
- Constraint validation across the system

### Manual Testing Scenarios

1. Create tasks with various constraints and verify schedule generation
2. Import calendar changes and verify proper synchronization
3. Test edge cases for scheduling (conflicts, impossible constraints)
4. Verify recurring task behavior with different patterns

## Future Enhancements

For future versions of Chewy, consider:

1. **Task Splitting**: Allow long tasks to be split across multiple time slots
2. **Smart Suggestions**: Machine learning to suggest optimal task times based on user patterns
3. **Mobile App Version**: Extend to iOS/Android
4. **Direct Calendar Integration**: Connect to Google Calendar, Outlook, etc.
5. **Notification System**: Reminders and alerts for upcoming tasks
6. **Collaborative Features**: Share and assign tasks with others
7. **Analytics Dashboard**: Visualize time usage and productivity

---

This document serves as the foundation for implementing the Chewy AI Assistant app. It outlines the core functionality, technical approach, and implementation plan to guide development e
