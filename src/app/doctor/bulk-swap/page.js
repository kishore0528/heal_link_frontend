"use client";

import { useEffect, useMemo, useState } from "react";
import { appointmentApi, doctorApi, get, post } from "@/utils/api";
import { useRouter } from "next/navigation";

export default function BulkSwapPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [sourceTimeRange, setSourceTimeRange] = useState({
    date: "",
    startTime: "",
    endTime: "",
  });
  const [targetTimeRange, setTargetTimeRange] = useState({
    date: "",
  });
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState("");

  const [filters, setFilters] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      date: `${yyyy}-${mm}-${dd}`,
      startTime: "09:00",
      endTime: "17:00",
    };
  });

  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [step, setStep] = useState(1);
  const [swapResult, setSwapResult] = useState(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.date) p.set("date", filters.date);
    if (filters.startTime) p.set("startTime", filters.startTime);
    if (filters.endTime) p.set("endTime", filters.endTime);
    return p.toString();
  }, [filters]);

  useEffect(() => {
    fetchAppointments();
    loadAvailableDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // Sync filters with user's target selection so the list updates as they change inputs
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      date: targetTimeRange.date || prev.date,
    }));
  }, [
    targetTimeRange.date,
  ]);

  // Helper: parse day name from date (e.g., Monday)
  const dayNameFromDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { weekday: "long" });
    } catch {
      return null;
    }
  };

  // Helper: test time range overlap
  const rangesOverlap = (startA, endA, startB, endB) => {
    if (!startA || !endA || !startB || !endB) return true; // lax if incomplete
    return !(endA <= startB || endB <= startA);
  };

  // Normalize doctor list from various API shapes
  const normalizeDoctors = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.doctors)) return data.doctors;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const clientFilterAvailableDoctors = (doctors) => {
    const dayName = dayNameFromDate(filters.date);
    if (!dayName) return doctors;

    // Convert HH:mm to minutes
    const toMinutes = (t) => {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const reqStart = toMinutes(filters.startTime);
    const reqEnd = toMinutes(filters.endTime);

    return doctors.filter((d) => {
      const days = d?.availability?.days || [];
      if (days.length && !days.includes(dayName)) return false;

      const slots = d?.availability?.timeSlots || [];
      if (!slots.length || reqStart == null || reqEnd == null) return true;

      // If any slot overlaps with requested range, include
      return slots.some((s) => {
        const sStart = toMinutes(s.startTime);
        const sEnd = toMinutes(s.endTime);
        if (sStart == null || sEnd == null) return true;
        return rangesOverlap(reqStart, reqEnd, sStart, sEnd);
      });
    });
  };

  const loadAvailableDoctors = async () => {
    setLoadingDoctors(true);
    setDoctorsError("");
    try {
      let data;

      // 1) Try API helper, but don't fail hard on 404/errors
      let primaryWorked = false;
      if (doctorApi?.getAvailableDoctors) {
        try {
          const res = await doctorApi.getAvailableDoctors(filters);
          data = res?.data ?? res;
          primaryWorked = true;
        } catch (e) {
          // swallow and fall back
          primaryWorked = false;
        }
      }

      // 2) If primary failed or returned nothing, try REST endpoints
      const noUsableData =
        !data ||
        (Array.isArray(data) && data.length === 0) ||
        (data &&
          !Array.isArray(data) &&
          !Array.isArray(data?.data) &&
          !Array.isArray(data?.doctors));

      if (!primaryWorked || noUsableData) {
        const endpoints = [
          `/doctors/available?${queryString}`,
          `/doctors/availability?${queryString}`,
          `/doctor/available?${queryString}`,
          `/doctors/find-available?${queryString}`,
        ];

        let ok = false;
        for (const url of endpoints) {
          try {
            data = await get(url);
            ok = true;
            break;
          } catch {
            // continue to next endpoint
          }
        }

        // 3) Final fallback: fetch all doctors and client-filter
        if (!ok) {
          let allDoctors;
          if (doctorApi?.getDoctors) {
            try {
              const res = await doctorApi.getDoctors();
              allDoctors = res?.data ?? res;
            } catch {
              allDoctors = null;
            }
          } else if (doctorApi?.getAllDoctors) {
            try {
              const res = await doctorApi.getAllDoctors();
              allDoctors = res?.data ?? res;
            } catch {
              allDoctors = null;
            }
          }
          if (!allDoctors) {
            allDoctors = await get('/doctors');
          }
          const normalized = normalizeDoctors(allDoctors);
          const filtered = clientFilterAvailableDoctors(normalized);
          setAvailableDoctors(filtered);
          return;
        }
      }

      const list = normalizeDoctors(data);
      setAvailableDoctors(list);
    } catch (err) {
      setDoctorsError(err?.message || "Unable to load available doctors.");
      setAvailableDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await appointmentApi.getDoctorAppointments();
      if (data.success && data.data) {
        const formattedAppointments = data.data
          .filter(
            (app) =>
              app.status === "pending" ||
              app.status === "confirmed" ||
              app.status === "scheduled"
          )
          .map((appointment) => ({
            id: appointment._id,
            patientName: `${appointment.patient?.firstName || ""} ${
              appointment.patient?.lastName || ""
            }`,
            patientId: appointment.patient?.patientInfo
              ? appointment.patient.patientInfo.patientId
              : "",
            fullDate: new Date(appointment.date),
            date: new Date(appointment.date).toISOString().split("T")[0],
            time: new Date(appointment.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: appointment.reason,
            status: appointment.status,
            notes: appointment.notes,
            contact: appointment.patient?.phone || "",
            doctor: appointment.doctor,
          }));
        setAppointments(formattedAppointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceTimeRangeChange = (e) => {
    setSourceTimeRange({
      ...sourceTimeRange,
      [e.target.name]: e.target.value,
    });
  };

  const handleTargetTimeRangeChange = (e) => {
    setTargetTimeRange((prev) => ({
      ...prev,
      date: e.target.value,
    }));
  };

  const filterAppointmentsBySourceTimeRange = () => {
    if (!sourceTimeRange.date) return [];

    const selectedDate = new Date(sourceTimeRange.date);
    const nextDay = new Date(sourceTimeRange.date);
    nextDay.setDate(nextDay.getDate() + 1);

    let filtered = appointments.filter((appointment) => {
      const appDate = new Date(appointment.fullDate);
      return (
        appDate.getDate() === selectedDate.getDate() &&
        appDate.getMonth() === selectedDate.getMonth() &&
        appDate.getFullYear() === selectedDate.getFullYear()
      );
    });

    if (sourceTimeRange.startTime && sourceTimeRange.endTime) {
      const [startHour, startMinute] = sourceTimeRange.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = sourceTimeRange.endTime
        .split(":")
        .map(Number);

      filtered = filtered.filter((appointment) => {
        const appHour = appointment.fullDate.getHours();
        const appMinute = appointment.fullDate.getMinutes();

        const appTimeInMinutes = appHour * 60 + appMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;

        return (
          appTimeInMinutes >= startTimeInMinutes &&
          appTimeInMinutes <= endTimeInMinutes
        );
      });
    }

    return filtered;
  };

  const handleAppointmentSelection = (appointmentId) => {
    setSelectedAppointments((prev) => {
      if (prev.includes(appointmentId)) {
        return prev.filter((id) => id !== appointmentId);
      } else {
        return [...prev, appointmentId];
      }
    });
  };

  const handleSelectAllAppointments = (e) => {
    if (e.target.checked) {
      const allAppointmentIds = filteredAppointments.map((app) => app.id);
      setSelectedAppointments(allAppointmentIds);
    } else {
      setSelectedAppointments([]);
    }
  };
  const handleBulkSwap = async () => {
    if (selectedAppointments.length === 0) {
      alert("Please select at least one appointment to swap");
      return;
    }

    if (!targetTimeRange.date) {
      alert("Please specify the target date");
      return;
    }

    if (!selectedDoctor) {
      alert("Please select a doctor for the swap");
      return;
    }

    setIsLoading(true);
    try {
      const response = await post("/appointments/bulk-swap", {
        appointmentIds: selectedAppointments,
        targetDate: targetTimeRange.date,
        doctorId: selectedDoctor,
      });

      if (response.success) {
        setSwapResult(response.data);
        setStep(3);
      } else {
        alert(response.message || "Failed to perform bulk swap");
      }
    } catch (error) {
      console.error("Error performing bulk swap:", error);
      alert("Failed to perform bulk swap");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAppointments = filterAppointmentsBySourceTimeRange();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Bulk Appointment Swap
        </h1>
        <button
          onClick={() => router.push("/doctor/appointments")}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-150 flex items-center"
        >
          Back to Appointments
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center w-full max-w-3xl">
          <div
            className={`flex-1 h-1 ${
              step >= 1 ? "bg-blue-500" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            1
          </div>
          <div
            className={`flex-1 h-1 ${
              step >= 2 ? "bg-blue-500" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
          <div
            className={`flex-1 h-1 ${
              step >= 3 ? "bg-blue-500" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 3 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            3
          </div>
          <div
            className={`flex-1 h-1 ${
              step >= 3 ? "bg-blue-500" : "bg-gray-200"
            }`}
          ></div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {step === 1 && (
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Step 1: Select Source Time Range
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={sourceTimeRange.date || ""}
                      onChange={handleSourceTimeRangeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time (Optional)
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={sourceTimeRange.startTime || ""}
                      onChange={handleSourceTimeRangeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time (Optional)
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={sourceTimeRange.endTime || ""}
                      onChange={handleSourceTimeRangeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-3">
                  Appointments in Selected Range
                </h3>
                {filteredAppointments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <input
                              type="checkbox"
                              onChange={handleSelectAllAppointments}
                              checked={
                                filteredAppointments.length > 0 &&
                                selectedAppointments.length === filteredAppointments.length
                              }
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2">Select All</span>
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Patient
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Date & Time
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Type
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAppointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedAppointments.includes(
                                  appointment.id
                                )}
                                onChange={() =>
                                  handleAppointmentSelection(appointment.id)
                                }
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {appointment.patientName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {appointment.patientId}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {appointment.date}
                              </div>
                              <div className="text-sm text-gray-500">
                                {appointment.time}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {appointment.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  appointment.status === "confirmed"
                                    ? "bg-green-100 text-green-800"
                                    : appointment.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {appointment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">
                      No appointments found in the selected time range
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedAppointments.length === 0}
                  className={`px-4 py-2 rounded-lg ${
                    selectedAppointments.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } transition-colors duration-150`}
                >
                  Next: Select Target Time
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Step 2: Select Target Time Range & Doctor
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={targetTimeRange.date}
                      onChange={handleTargetTimeRangeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Doctor
                    </label>
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a doctor</option>
                      {availableDoctors.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          Dr.{" "}
                          {d?.user
                            ? `${d.user.firstName || ""} ${
                                d.user.lastName || ""
                              }`.trim()
                            : `${d.firstName || ""} ${
                                d.lastName || ""
                              }`.trim()}{" "}
                          -{" "}
                          {d?.specialization ||
                            d?.speciality ||
                            d?.specialty ||
                            "General"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">
                    Selected Appointments
                  </h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700">
                      {selectedAppointments.length} appointment(s) selected for
                      swap
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-150"
                >
                  Back
                </button>
                <button
                  onClick={handleBulkSwap}
                  disabled={
                    !targetTimeRange.date ||
                    !selectedDoctor
                  }
                  className={`px-4 py-2 rounded-lg ${
                    (!targetTimeRange.date || !selectedDoctor)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } transition-colors duration-150`}
                >
                  Perform Bulk Swap
                </button>
              </div>
            </div>
          )}

          {step === 3 && swapResult && (
            <div className="bg-white shadow-md rounded-lg p-6">
              {console.log("swapResult in Step 3:", swapResult)}
              <h2 className="text-xl font-semibold mb-4">
                Step 3: Swap Results
              </h2>

              <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg
                    className="h-6 w-6 text-green-500 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-green-700 font-medium">
                    Bulk swap completed successfully!
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Summary</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-700">
                      Total appointments processed: {swapResult.total}
                    </p>
                    <p className="text-sm text-gray-700">
                      Successfully swapped: {swapResult.success}
                    </p>
                    {swapResult.failed > 0 && (
                      <p className="text-sm text-red-600">
                        Failed to swap: {swapResult.failed}
                      </p>
                    )}
                  </div>
                </div>

                {swapResult.swappedAppointments &&
                  swapResult.swappedAppointments.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium mb-2">
                        Swapped Appointments
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Patient
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Original Date & Time
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                New Date & Time
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {swapResult.swappedAppointments.map(
                              (appointment, index) => {
                                const originalAppointment = appointments.find(a => a.id === (appointment._id || appointment.id));
                                const patientName = originalAppointment ? originalAppointment.patientName : 'N/A';
                                return (
                                  <tr
                                    key={appointment._id || appointment.id || index}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {patientName}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {appointment.originalDate}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {appointment.originalTime}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {appointment.newDate}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {appointment.newTime}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {swapResult.failedAppointments &&
                  swapResult.failedAppointments.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium mb-2 text-red-600">
                        Failed Appointments
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Patient
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Date & Time
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Reason
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {swapResult.failedAppointments.map(
                              (appointment, index) => {
                                const originalAppointment = appointments.find(a => a.id === (appointment._id || appointment.id));
                                const patientName = originalAppointment ? originalAppointment.patientName : 'N/A';
                                return (
                                  <tr
                                    key={appointment._id || appointment.id || index}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {patientName}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {appointment.date}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {appointment.time}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-red-600">
                                        {appointment.reason}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedAppointments([]);
                    setSourceTimeRange({
                      startDate: "",
                      endDate: "",
                      startTime: "",
                      endTime: "",
                    });
                    setTargetTimeRange({
                      date: "",
                      startTime: "",
                      endTime: "",
                    });
                    setSelectedDoctor("");
                    setSwapResult(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-150"
                >
                  Start New Swap
                </button>
                <button
                  onClick={() => router.push("/doctor/appointments")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                >
                  Return to Appointments
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
