import { apiClient } from "./client";
import type {
  SchedulesOverviewResponse,
  ScheduleEvent,
  ScheduleFormData,
  EventType,
  CreateEventTypeFormData,
} from "../types";

export const scheduleService = {
  getSchedules: async (eventType?: string, search?: string): Promise<SchedulesOverviewResponse> => {
    const params = new URLSearchParams();
    if (eventType && eventType !== "ALL") params.append("eventType", eventType);
    if (search) params.append("search", search);
    const queryString = params.toString();
    return apiClient<SchedulesOverviewResponse>(`/api/schedules${queryString ? `?${queryString}` : ""}`);
  },

  createSchedule: async (data: ScheduleFormData): Promise<{ message?: string; data?: ScheduleEvent }> => {
    return apiClient<{ message?: string; data?: ScheduleEvent }>("/api/schedules", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  updateSchedule: async (id: number, data: ScheduleFormData): Promise<{ message?: string; data?: ScheduleEvent }> => {
    return apiClient<{ message?: string; data?: ScheduleEvent }>(`/api/schedules/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteSchedule: async (id: number): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/schedules/${id}`, {
      method: "DELETE",
    });
  },

  getEventTypes: async (): Promise<EventType[]> => {
    return apiClient<EventType[]>("/api/schedules/types");
  },

  createEventType: async (data: CreateEventTypeFormData): Promise<{ message?: string; data?: EventType }> => {
    return apiClient<{ message?: string; data?: EventType }>("/api/schedules/types", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteEventType: async (id: number): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/schedules/types/${id}`, {
      method: "DELETE",
    });
  },
};

