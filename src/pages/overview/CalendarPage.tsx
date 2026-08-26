import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  Today,
  Search,
  Add,
  DeleteOutline,
  EditOutlined,
  Refresh,
  LocationOnOutlined,
  PersonOutline,
  GroupOutlined,
  AccessTime,
  EventNoteOutlined,
  CheckCircleOutline,
  Close,
  ViewModule,
  ViewWeek,
  ViewList,
  CategoryOutlined,
  PaletteOutlined,
  LabelOutlined,
  LocalOfferOutlined,
  Check,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { scheduleService } from "../../api/schedule.service";
import { showConfirmDialog, showSuccessToast, showErrorToast } from "../../utils/alerts";
import type { ScheduleEvent, ScheduleFormData, EventType, CreateEventTypeFormData } from "../../types";

type ViewMode = "month" | "week" | "agenda";

// Helper to format date strings YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const PRESET_COLORS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Sky", hex: "#0ea5e9" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Orange", hex: "#f97316" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Fuchsia", hex: "#d946ef" },
  { name: "Slate", hex: "#64748b" },
];

// Color themes based on event type (supports both standard and dynamic DB types)
const getEventTypeTheme = (type: string, dynamicTypes: EventType[] = []) => {
  const matched = dynamicTypes.find((t) => t.name.toLowerCase() === type?.toLowerCase());
  const customColor = matched?.color;

  switch (type?.toLowerCase()) {
    case "audit":
      return {
        bg: "bg-indigo-50 dark:bg-indigo-950/60",
        border: "border-indigo-200 dark:border-indigo-800",
        text: "text-indigo-700 dark:text-indigo-300",
        badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-200",
        dot: "bg-indigo-500",
        color: customColor || "#6366f1",
      };
    case "training":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/60",
        border: "border-emerald-200 dark:border-emerald-800",
        text: "text-emerald-700 dark:text-emerald-300",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200",
        dot: "bg-emerald-500",
        color: customColor || "#10b981",
      };
    case "governance":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/60",
        border: "border-amber-200 dark:border-amber-800",
        text: "text-amber-700 dark:text-amber-300",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/80 dark:text-amber-200",
        dot: "bg-amber-500",
        color: customColor || "#f59e0b",
      };
    case "review":
      return {
        bg: "bg-sky-50 dark:bg-sky-950/60",
        border: "border-sky-200 dark:border-sky-800",
        text: "text-sky-700 dark:text-sky-300",
        badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/80 dark:text-sky-200",
        dot: "bg-sky-500",
        color: customColor || "#0ea5e9",
      };
    case "certification":
      return {
        bg: "bg-rose-50 dark:bg-rose-950/60",
        border: "border-rose-200 dark:border-rose-800",
        text: "text-rose-700 dark:text-rose-300",
        badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/80 dark:text-rose-200",
        dot: "bg-rose-500",
        color: customColor || "#f43f5e",
      };
    default:
      if (customColor) {
        return {
          bg: "bg-slate-50 dark:bg-slate-800/60",
          border: "border-slate-200 dark:border-slate-700",
          text: "text-slate-800 dark:text-slate-100",
          badge: "text-white shadow-2xs",
          dot: "bg-blue-500",
          color: customColor,
          badgeStyle: { backgroundColor: customColor },
          dotStyle: { backgroundColor: customColor },
          borderStyle: { borderLeftColor: customColor, borderLeftWidth: "3px" },
        };
      }
      return {
        bg: "bg-slate-50 dark:bg-slate-800/60",
        border: "border-slate-200 dark:border-slate-700",
        text: "text-slate-700 dark:text-slate-300",
        badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        dot: "bg-slate-500",
        color: "#64748b",
      };
  }
};

export const CalendarPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(true);
  const [stats, setStats] = useState({ upcomingReviews: 0, teamAvailability: "95%", dueThisWeek: 0 });
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Calendar Navigation State - Default view mode is "week" as requested
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  // Schedule modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: "",
    description: "",
    eventType: "Audit",
    eventDate: formatDateKey(new Date()),
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    location: "Virtual / Workspace",
    organizer: "",
    status: "Scheduled",
    priority: "Normal",
    attendeesCount: 5,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New Event Type modal state
  const [isTypeModalOpen, setIsTypeModalOpen] = useState<boolean>(false);
  const [typeFormData, setTypeFormData] = useState<CreateEventTypeFormData>({
    name: "",
    description: "",
    color: "#6366f1",
    icon: "Event",
  });
  const [submittingType, setSubmittingType] = useState<boolean>(false);

  // Fetch Event Types from Database
  const fetchEventTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const types = await scheduleService.getEventTypes();
      setEventTypes(types || []);
    } catch (err: any) {
      console.error("Failed to load event types from database:", err);
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scheduleService.getSchedules(selectedType, searchTerm);
      setSchedules(res.schedules || []);
      if (res.eventTypes && res.eventTypes.length > 0) {
        setEventTypes(res.eventTypes);
      }
      setStats({
        upcomingReviews: res.upcomingReviews,
        teamAvailability: res.teamAvailability,
        dueThisWeek: res.dueThisWeek,
      });
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to load scheduled events from database.");
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchTerm]);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Group events by normalized date YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    schedules.forEach((item) => {
      const dKey = item.eventDate ? item.eventDate.split("T")[0] : "";
      if (dKey) {
        if (!map[dKey]) map[dKey] = [];
        map[dKey].push(item);
      }
    });
    return map;
  }, [schedules]);

  // Events on the currently selected date
  const selectedDateEvents = useMemo(() => {
    return eventsByDate[selectedDate] || [];
  }, [eventsByDate, selectedDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 7);
      setCurrentDate(newD);
    } else {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 1);
      setCurrentDate(newD);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 7);
      setCurrentDate(newD);
    } else {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 1);
      setCurrentDate(newD);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(formatDateKey(now));
  };

  // Open modal to schedule new event (prefilled with selected date)
  const openCreateModal = (targetDate?: string) => {
    setEditingSchedule(null);
    const dateToUse = targetDate || selectedDate || formatDateKey(new Date());
    setFormData({
      title: "",
      description: "",
      eventType: selectedType !== "ALL" ? selectedType : "Audit",
      eventDate: dateToUse,
      startTime: "10:00 AM",
      endTime: "11:30 AM",
      location: "Conference Room A",
      organizer: "",
      status: "Scheduled",
      priority: "Normal",
      attendeesCount: 5,
    });
    setIsModalOpen(true);
  };

  // Open modal to edit existing event
  const openEditModal = (item: ScheduleEvent) => {
    setEditingSchedule(item);
    setFormData({
      title: item.title,
      description: item.description,
      eventType: item.eventType,
      eventDate: item.eventDate ? item.eventDate.split("T")[0] : "",
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
      organizer: item.organizer,
      status: item.status,
      priority: item.priority,
      attendeesCount: item.attendeesCount,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.eventDate) {
      showErrorToast("Event title and date are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSchedule) {
        await scheduleService.updateSchedule(editingSchedule.id, formData);
        showSuccessToast("Event updated successfully!");
      } else {
        await scheduleService.createSchedule(formData);
        showSuccessToast("Event scheduled successfully!");
      }
      setIsModalOpen(false);
      // Keep active date on edited date
      setSelectedDate(formData.eventDate);
      fetchSchedules();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to save scheduled event.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title?: string) => {
    const res = await showConfirmDialog(
      "Cancel Event?",
      `Are you sure you want to remove "${title || "this event"}" from schedule?`,
      "Cancel Event",
      "Keep",
      true
    );
    if (res.isConfirmed) {
      try {
        await scheduleService.deleteSchedule(id);
        showSuccessToast("Event cancelled and removed from schedule.");
        fetchSchedules();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to cancel event.");
      }
    }
  };

  // Month grid matrix computation
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      events: ScheduleEvent[];
    }> = [];

    const todayKey = formatDateKey(new Date());

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const key = formatDateKey(prevDate);
      cells.push({
        date: prevDate,
        dateKey: key,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === selectedDate,
        events: eventsByDate[key] || [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = formatDateKey(date);
      cells.push({
        date,
        dateKey: key,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: key === todayKey,
        isSelected: key === selectedDate,
        events: eventsByDate[key] || [],
      });
    }

    // Trailing days to complete the 35 or 42 grid
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - cells.length;
    for (let day = 1; day <= remainingSlots; day++) {
      const nextDate = new Date(year, month + 1, day);
      const key = formatDateKey(nextDate);
      cells.push({
        date: nextDate,
        dateKey: key,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === selectedDate,
        events: eventsByDate[key] || [],
      });
    }

    return cells;
  }, [currentDate, selectedDate, eventsByDate]);

  // Week View Days Matrix
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const todayKey = formatDateKey(new Date());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const key = formatDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayNumber: d.getDate(),
        dayName: WEEKDAY_NAMES[i],
        isToday: key === todayKey,
        isSelected: key === selectedDate,
        events: eventsByDate[key] || [],
      });
    }
    return days;
  }, [currentDate, selectedDate, eventsByDate]);

  // Header Title computed based on active view mode
  const headerDateTitle = useMemo(() => {
    if (viewMode === "week" && weekDays.length === 7) {
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      const startMonth = start.toLocaleDateString("en-US", { month: "short" });
      const endMonth = end.toLocaleDateString("en-US", { month: "short" });
      const year = end.getFullYear();
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
      }
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [viewMode, weekDays, currentDate]);

  // Human readable selected date
  const readableSelectedDate = useMemo(() => {
    if (!selectedDate) return "Selected Date";
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d) return selectedDate;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  // Save new event type handler
  const handleSaveEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeFormData.name.trim()) {
      showErrorToast("Event type name is required.");
      return;
    }

    setSubmittingType(true);
    try {
      const res = await scheduleService.createEventType(typeFormData);
      showSuccessToast(res.message || `Event type '${typeFormData.name}' created successfully!`);
      setIsTypeModalOpen(false);
      const createdName = res.data?.name || typeFormData.name.trim();
      setTypeFormData({ name: "", description: "", color: "#6366f1", icon: "Event" });
      await fetchEventTypes();
      // Auto-set the new type in the schedule form if open
      setFormData((prev) => ({ ...prev, eventType: createdName }));
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to create event type.");
    } finally {
      setSubmittingType(false);
    }
  };

  const handleDeleteEventType = async (id: number, name: string) => {
    const res = await showConfirmDialog(
      "Remove Event Type?",
      `Are you sure you want to remove '${name}'? Existing events will keep their type history.`,
      "Delete Type",
      "Keep",
      true
    );
    if (res.isConfirmed) {
      try {
        await scheduleService.deleteEventType(id);
        showSuccessToast(`Event type '${name}' removed successfully.`);
        if (selectedType.toLowerCase() === name.toLowerCase()) {
          setSelectedType("ALL");
        }
        await fetchEventTypes();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to delete event type.");
      }
    }
  };

  // Side Panel Component for Date Details & Event Updating
  const renderDaySchedulePanel = () => (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs sticky top-20">
      {/* Header for selected date */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Day Schedule
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {readableSelectedDate}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal(selectedDate)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
        >
          <Add sx={{ fontSize: 15 }} />
          <span>Add</span>
        </button>
      </div>

      {/* List of events on this date */}
      <div className="mt-4 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {selectedDateEvents.length > 0 ? (
          selectedDateEvents.map((event) => {
            const theme = getEventTypeTheme(event.eventType, eventTypes);
            return (
              <div
                key={event.id}
                style={theme.borderStyle}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 transition-all hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 space-y-2.5 group"
              >
                {/* Event Type & Priority Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      style={theme.badgeStyle}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${theme.badge}`}
                    >
                      {event.eventType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        event.priority === "Urgent" || event.priority === "High"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {event.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100/70 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {event.status}
                    </span>
                  </div>

                  {/* Action Buttons for updating/deleting event */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(event)}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                      title="Update Event"
                    >
                      <EditOutlined sx={{ fontSize: 16 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(event.id, event.title)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                      title="Cancel Event"
                    >
                      <DeleteOutline sx={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>

                {/* Event Title & Description */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {event.title}
                  </h4>
                  {event.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5">
                    <AccessTime sx={{ fontSize: 14, color: "#3b82f6" }} />
                    <span>{event.startTime} - {event.endTime}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1.5">
                      <LocationOnOutlined sx={{ fontSize: 14, color: "#64748b" }} />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.organizer && (
                    <div className="flex items-center gap-1.5">
                      <PersonOutline sx={{ fontSize: 14, color: "#64748b" }} />
                      <span>Org: {event.organizer}</span>
                    </div>
                  )}
                  {event.attendeesCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <GroupOutlined sx={{ fontSize: 14, color: "#64748b" }} />
                      <span>{event.attendeesCount} Attendees</span>
                    </div>
                  )}
                </div>

                {/* Instant Quick Update Button */}
                <button
                  type="button"
                  onClick={() => openEditModal(event)}
                  className="w-full py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <EditOutlined sx={{ fontSize: 14 }} />
                  <span>Update Details</span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="grid h-10 w-10 mx-auto place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
              <CalendarMonth sx={{ fontSize: 20 }} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No events on this day</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
              Schedule audits, training, or reviews for {readableSelectedDate}.
            </p>
            <button
              type="button"
              onClick={() => openCreateModal(selectedDate)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
            >
              <Add sx={{ fontSize: 15 }} />
              <span>Schedule Event</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <WorkspaceLayout permission="calendar.view" label="Schedule" icon="□" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* TOP METRICS & STATS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Upcoming Reviews */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Upcoming Reviews</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.upcomingReviews}</span>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">this quarter</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Scheduled audits & rhythm</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/25">
                <CalendarMonth sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>

          {/* Card 2: Team Availability */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Team Availability</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.teamAvailability}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">active now</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ready for review sessions</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                <CheckCircleOutline sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>

          {/* Card 3: High Priority / Due */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">High Priority / Due</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.dueThisWeek}</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">due this week</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Priority review events</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
                <EventNoteOutlined sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>
        </div>

        {/* CALENDAR TOOLBAR & FILTER CONTROLS */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Nav Controls & Period Title */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition-all cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft sx={{ fontSize: 20 }} />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg hover:shadow-xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Today sx={{ fontSize: 15 }} />
                  <span>Today</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition-all cursor-pointer"
                  title="Next"
                >
                  <ChevronRight sx={{ fontSize: 20 }} />
                </button>
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 ml-1">
                {headerDateTitle}
              </h2>
            </div>

            {/* View Switcher & Action Buttons */}
            <div className="flex items-center flex-wrap gap-2 justify-between lg:justify-end">
              {/* Mode toggle - Week is default */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewMode === "week"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ViewWeek sx={{ fontSize: 16 }} />
                  <span>Week</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewMode === "month"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ViewModule sx={{ fontSize: 16 }} />
                  <span>Month</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("agenda")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewMode === "agenda"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ViewList sx={{ fontSize: 16 }} />
                  <span>Agenda</span>
                </button>
              </div>

              {/* Refresh, Add Type & Add Event */}
              <button
                type="button"
                onClick={() => {
                  fetchSchedules();
                  fetchEventTypes();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Refresh sx={{ fontSize: 16 }} className={loading || loadingTypes ? "animate-spin text-blue-600" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTypeModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/50 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
              >
                <CategoryOutlined sx={{ fontSize: 16 }} />
                <span>New Event Type</span>
              </button>

              <button
                type="button"
                onClick={() => openCreateModal(selectedDate)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Add sx={{ fontSize: 16 }} />
                <span>Schedule Event</span>
              </button>
            </div>
          </div>

          {/* Dynamic Filter Chips & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {/* ALL types filter */}
              <button
                type="button"
                onClick={() => setSelectedType("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  selectedType === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>All Types</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedType === "ALL"
                      ? "bg-blue-800/60 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {schedules.length}
                </span>
              </button>

              {/* Dynamic Database Event Types */}
              {eventTypes.map((t) => {
                const isSelected = selectedType.toLowerCase() === t.name.toLowerCase();
                const count = schedules.filter((s) => s.eventType?.toLowerCase() === t.name.toLowerCase()).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(isSelected ? "ALL" : t.name)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.color || "#3b82f6" }}
                    />
                    <span>{t.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? "bg-blue-800/60 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Quick Inline New Type Shortcut */}
              <button
                type="button"
                onClick={() => setIsTypeModalOpen(true)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                title="Add new event type"
              >
                <Add sx={{ fontSize: 14 }} />
                <span>New Type</span>
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search event title, organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* WEEK VIEW (DEFAULT ON PAGE LOAD) */}
        {viewMode === "week" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* WEEK COLUMNS (8 Cols on large) */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
                {weekDays.map((day) => (
                  <div
                    key={day.dateKey}
                    onClick={() => setSelectedDate(day.dateKey)}
                    className={`p-2.5 sm:p-3 min-h-[160px] sm:min-h-[380px] flex flex-col transition-all cursor-pointer group ${
                      day.isSelected
                        ? "bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-inset"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          {day.dayName}
                        </span>
                        <span
                          className={`inline-flex items-center justify-center text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full mt-0.5 transition-colors ${
                            day.isToday
                              ? "bg-blue-600 text-white shadow-xs"
                              : day.isSelected
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(day.dateKey);
                          openCreateModal(day.dateKey);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        title="Add event on this day"
                      >
                        <Add sx={{ fontSize: 16 }} />
                      </button>
                    </div>

                    <div className="space-y-1.5 flex-1 overflow-y-auto">
                      {day.events.length > 0 ? (
                        day.events.map((event) => {
                          const theme = getEventTypeTheme(event.eventType, eventTypes);
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(day.dateKey);
                                openEditModal(event);
                              }}
                              style={theme.borderStyle}
                              className={`p-2 rounded-xl border text-xs space-y-1 cursor-pointer transition-all hover:scale-[1.02] ${theme.bg} ${theme.border}`}
                              title="Click to view/update details"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  style={theme.badgeStyle}
                                  className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${theme.badge}`}
                                >
                                  {event.eventType}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                  {event.startTime}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 text-[11px] leading-tight">
                                {event.title}
                              </div>
                              {event.location && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  📍 {event.location}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[11px] text-slate-400 text-center py-6">
                          No events
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DATE DETAIL & EVENT UPDATE PANEL (4 Cols on large) */}
            <div className="lg:col-span-4 space-y-4">
              {renderDaySchedulePanel()}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {viewMode === "month" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* MONTH CALENDAR GRID (8 Cols on large) */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-center py-2.5">
                {WEEKDAY_NAMES.map((d) => (
                  <div key={d} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* 35 or 42 Days Matrix */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
                {calendarCells.map((cell) => {
                  const hasEvents = cell.events.length > 0;
                  return (
                    <div
                      key={cell.dateKey}
                      onClick={() => setSelectedDate(cell.dateKey)}
                      className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all flex flex-col justify-between cursor-pointer group ${
                        !cell.isCurrentMonth
                          ? "bg-slate-50/40 dark:bg-slate-950/40 opacity-40 hover:opacity-75"
                          : cell.isSelected
                          ? "bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-inset"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      {/* Top Bar inside cell: Date number + Quick Add */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full transition-colors ${
                            cell.isToday
                              ? "bg-blue-600 text-white shadow-xs"
                              : cell.isSelected
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Hover Quick Add Action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.dateKey);
                            openCreateModal(cell.dateKey);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                          title={`Schedule event on ${cell.dateKey}`}
                        >
                          <Add sx={{ fontSize: 15 }} />
                        </button>
                      </div>

                      {/* Event Chips within Date Cell */}
                      <div className="space-y-1 overflow-hidden flex-1">
                        {cell.events.slice(0, 2).map((event) => {
                          const theme = getEventTypeTheme(event.eventType, eventTypes);
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(cell.dateKey);
                                openEditModal(event);
                              }}
                              style={theme.borderStyle}
                              className={`truncate px-1.5 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border cursor-pointer transition-all hover:scale-[1.02] ${theme.bg} ${theme.border} ${theme.text}`}
                              title={`${event.startTime} - ${event.title}`}
                            >
                              <span
                                style={theme.dotStyle}
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`}
                              />
                              <span className="truncate">{event.title}</span>
                            </div>
                          );
                        })}

                        {/* Overflow indicator if > 2 events */}
                        {cell.events.length > 2 && (
                          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-1 hover:underline">
                            +{cell.events.length - 2} more
                          </div>
                        )}
                      </div>

                      {/* Dot for mobile view if events exist */}
                      {hasEvents && (
                        <div className="sm:hidden flex items-center justify-center gap-0.5 mt-0.5">
                          {cell.events.slice(0, 3).map((_, i) => (
                            <span key={i} className="w-1 h-1 rounded-full bg-blue-600" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DATE DETAIL & EVENT UPDATE PANEL (4 Cols on large) */}
            <div className="lg:col-span-4 space-y-4">
              {renderDaySchedulePanel()}
            </div>
          </div>
        )}

        {/* AGENDA / LIST VIEW */}
        {viewMode === "agenda" && (
          <div className="space-y-3">
            {schedules.length > 0 ? (
              schedules.map((event) => {
                const theme = getEventTypeTheme(event.eventType, eventTypes);
                return (
                  <div
                    key={event.id}
                    style={theme.borderStyle}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300 font-bold text-xs text-center leading-tight">
                        <span>{event.eventDate ? event.eventDate.split("T")[0].split("-")[2] : "15"}</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          {event.eventDate ? MONTH_NAMES[parseInt(event.eventDate.split("T")[0].split("-")[1], 10) - 1]?.slice(0, 3) : "DAY"}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            style={theme.badgeStyle}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}
                          >
                            {event.eventType}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              event.priority === "Urgent" || event.priority === "High"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {event.priority}
                          </span>
                          <span className="rounded-md px-2 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                            {event.status}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{event.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.description}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <AccessTime sx={{ fontSize: 14 }} />
                            <span>{event.eventDate ? event.eventDate.split("T")[0] : ""} · {event.startTime} - {event.endTime}</span>
                          </span>
                          {event.location && (
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <LocationOnOutlined sx={{ fontSize: 14 }} />
                              <span>{event.location}</span>
                            </span>
                          )}
                          {event.organizer && (
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <PersonOutline sx={{ fontSize: 14 }} />
                              <span>Org: {event.organizer}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <GroupOutlined sx={{ fontSize: 14 }} />
                            <span>{event.attendeesCount} Attendees</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => openEditModal(event)}
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Update Event"
                      >
                        <EditOutlined sx={{ fontSize: 16 }} />
                        <span>Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(event.id, event.title)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Cancel Event"
                      >
                        <DeleteOutline sx={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center text-xs text-slate-400">
                {loading ? "Loading schedule from database..." : "No scheduled events found."}
              </div>
            )}
          </div>
        )}

      </div>

      {/* EVENT SCHEDULE / UPDATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {editingSchedule ? "Modify Schedule" : "New Event Entry"}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingSchedule ? "Update Scheduled Event" : "Schedule New Event / Audit"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarterly Role & Access Audit"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-850 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Event Type *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTypeModalOpen(true)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Add sx={{ fontSize: 13 }} />
                      <span>New Type</span>
                    </button>
                  </div>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    {eventTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                    {formData.eventType && !eventTypes.some((t) => t.name.toLowerCase() === formData.eventType.toLowerCase()) && (
                      <option value={formData.eventType}>{formData.eventType}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    placeholder="11:30 AM"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Location / Room
                  </label>
                  <input
                    type="text"
                    placeholder="Conference Room A / Virtual"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Organizer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vengadesh M"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Postponed">Postponed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Attendees Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={formData.attendeesCount}
                    onChange={(e) => setFormData({ ...formData, attendeesCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agenda & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain event agenda, review parameters, and required attendees..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {submitting ? "Saving..." : editingSchedule ? "Update Event" : "Schedule Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW EVENT TYPE MODAL */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <CategoryOutlined sx={{ fontSize: 20 }} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    Calendar Taxonomy
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Create New Event Type
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTypeModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSaveEventType} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Type Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Security Drill, Sprint Demo, Hackathon"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-850 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what kind of events belong to this type..."
                  value={typeFormData.description || ""}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <PaletteOutlined sx={{ fontSize: 15 }} />
                    <span>Theme Color</span>
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input
                      type="color"
                      id="custom-color-picker"
                      value={typeFormData.color || "#6366f1"}
                      onChange={(e) => setTypeFormData({ ...typeFormData, color: e.target.value })}
                      className="w-4 h-4 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300">
                      {typeFormData.color}
                    </span>
                  </div>
                </div>

                {/* Preset Swatches */}
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((c) => {
                    const isSelected = typeFormData.color?.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setTypeFormData({ ...typeFormData, color: c.hex })}
                        style={{ backgroundColor: c.hex }}
                        className={`h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center text-white shadow-xs hover:scale-105 ${
                          isSelected ? "ring-2 ring-offset-2 ring-blue-500 scale-105" : "opacity-90 hover:opacity-100"
                        }`}
                        title={c.name}
                      >
                        {isSelected && <Check sx={{ fontSize: 16 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <LocalOfferOutlined sx={{ fontSize: 13 }} />
                  <span>Live Badge Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: typeFormData.color || "#6366f1" }}
                    className="px-2.5 py-0.5 rounded-md text-xs font-bold text-white shadow-2xs"
                  >
                    {typeFormData.name.trim() || "Sample Event Type"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Preview in filters & calendar schedule
                  </span>
                </div>
              </div>

              {/* Active Types in Database */}
              {eventTypes.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Existing Types in Database ({eventTypes.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {eventTypes.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.color || "#3b82f6" }}
                        />
                        <span>{t.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingType}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {submittingType ? "Creating..." : "Create Event Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default CalendarPage;
