console.log("API Base URL from env:", process.env.NEXT_PUBLIC_API_BASE_URL);
const API_BASE_URL =process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Helper function to get auth headers
const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem("token");
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}, isFormData = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(isFormData),
      ...options,
    });

    // Network error handling
    if (!response) {
      throw new Error("Network error: No response received");
    }

    let data = null;

    // Only try to parse JSON if response has content
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        data = null;
      }
    }

    if (!response.ok) {
      console.log('API Response Details:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        data: data,
        dataType: typeof data,
        errorField: data?.error,
        messageField: data?.message
      });
      
      // Handle authorization errors specially
      if (response.status === 401 || response.status === 403) {
        const authErrorMessage = data?.error || "Authentication failed";
        const safeAuthErrorMessage = typeof authErrorMessage === 'string' ? authErrorMessage : 'Authentication failed';
        console.error("Authorization error:", safeAuthErrorMessage);
        // Clear invalid token
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");

        // Redirect to login if not authorized
        if (
          window.location.pathname.includes("/admin") ||
          window.location.pathname.includes("/doctor") ||
          window.location.pathname.includes("/patient")
        ) {
          window.location.href = "/login";
        }
        
        throw new Error(safeAuthErrorMessage);
      }
      
      // For server errors (5xx), return a structured error response instead of throwing
      if (response.status >= 500) {
        const errorMessage = data?.error || data?.message || `Server error (${response.status})`;
        console.error("Server error for", response.url, ":", errorMessage);
        console.error("Full response data:", data);
        return {
          success: false,
          error: errorMessage,
          data: null
        };
      }
      
      // For other client errors (4xx), throw as before
      const errorMessage = data?.error || data?.message || `API request failed with status ${response.status}`;
      const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : 'Unknown API error';
      throw new Error(safeErrorMessage);
    }

    return data;
  } catch (error) {
    // Provide a clearer error message for network errors
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      console.error("API Error: Network error or server is unreachable");
      throw new Error(
        "Network error: Unable to reach the server. Please check your connection or server status."
      );
    }
    
    // Log more details about the error for debugging
    console.error("API Error Details:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    throw error;
  }
};

export const get = (endpoint) => apiRequest(endpoint);

export const post = (endpoint, body) =>
  apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const put = (endpoint, body, isFormData = false) =>
  apiRequest(
    endpoint,
    {
      method: "PUT",
      body: isFormData ? body : JSON.stringify(body),
    },
    isFormData
  );

export const del = (endpoint) =>
  apiRequest(endpoint, {
    method: "DELETE",
  });

// Patient API functions
export const patientApi = {
  // Get current patient profile
  getMyProfile: () => apiRequest("/patients/me"),

  // Update current patient profile
  updateMyProfile: (profileData) =>
    put("/patients/me", profileData, profileData instanceof FormData),

  // Get patient dashboard data
  getDashboard: () => apiRequest("/patients/dashboard"),

  // Get patient appointments
  getAppointments: () => apiRequest("/appointments"),

  // Get all patients
  getPatients: () => apiRequest("/patients"),

  // Get patient medical records
  getMedicalRecords: () => apiRequest("/medicalRecords"),

  // Get patient medications
  getMedications: () => apiRequest("/medications"),
};

// Auth API functions
export const authApi = {
  login: (credentials) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  googleLogin: (tokenId) =>
    apiRequest("/auth/google", {
      method: "POST",
      body: JSON.stringify({ tokenId }),
    }),

  changePassword: (passwordData) =>
    apiRequest("/auth/changepassword", {
      method: "PUT",
      body: JSON.stringify(passwordData),
    }),

  // 2FA functions
  enable2FA: () =>
    apiRequest("/auth/2fa/enable", {
      method: "POST",
    }),

  disable2FA: () =>
    apiRequest("/auth/2fa/disable", {
      method: "POST",
    }),

  verify2FA: (data) =>
    apiRequest("/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get2FAStatus: () => apiRequest("/auth/2fa/status"),
};

// Doctor API functions
export const doctorApi = {
  // Get current doctor profile
  getMyProfile: () => apiRequest("/doctors/me"),

  // Update current doctor profile
  updateMyProfile: (profileData) => put("/doctors/me", profileData, true),

  // Get all doctors
  getDoctors: () => apiRequest("/doctors"),

  // Get available doctors for appointments
  getAvailableDoctors: async (filters = {}) => {
    const qs = new URLSearchParams();
    if (filters.date) qs.set("date", filters.date);
    if (filters.startTime) qs.set("startTime", filters.startTime);
    if (filters.endTime) qs.set("endTime", filters.endTime);
    if (filters.specialization) qs.set("specialization", filters.specialization);

    // Do NOT pass filters in the path; use query string
    return apiRequest(`/doctors/available?${qs.toString()}`, { method: "GET" });
  },

  // Get doctors by specialization
  getDoctorsBySpecialization: (specialization) =>
    apiRequest(`/doctors/specialization/${specialization}`),

  // Get single doctor
  getDoctor: (id) => apiRequest(`/doctors/${id}`),

  // Create doctor (admin only)
  createDoctor: (doctorData) =>
    apiRequest("/doctors", {
      method: "POST",
      body: JSON.stringify(doctorData),
    }),

  // Update doctor
  updateDoctor: (id, doctorData) =>
    apiRequest(`/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(doctorData),
    }),
};

// Appointment API functions
export const appointmentApi = {
  // Get patient appointments
  getMyAppointments: () => apiRequest("/appointments"),

  // Get doctor appointments - use the correct endpoint
  getDoctorAppointments: async () => {
    try {
      return await apiRequest("/doctor/appointments");
    } catch (error) {
      console.error("Error fetching doctor appointments:", error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get all appointments (for the current user based on role)
  getAppointments: () => {
    const role = localStorage.getItem("role");
    if (role === "doctor") {
      return appointmentApi.getDoctorAppointments();
    }
    return apiRequest("/appointments");
  },

  // Book new appointment
  bookAppointment: (appointmentData) => {
    // Ensure doctor and patient IDs are sent correctly
    // doctor: current user (doctor), patient: selected patient
    // appointmentData should include patient, date, reason, notes
    return apiRequest("/appointments/book", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    });
  },

  // Cancel appointment
  cancelAppointment: (id, data = {}) =>
    apiRequest(`/appointments/${id}/cancel`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Update appointment
  updateAppointment: (id, appointmentData) =>
    apiRequest(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(appointmentData),
    }),

  // Confirm appointment (for doctors)
  confirmAppointment: (id) =>
    apiRequest(`/appointments/${id}/confirm`, {
      method: "PUT",
    }),

  // Update expired appointments to completed status (admin only)
  updateExpiredAppointments: () =>
    apiRequest("/appointments/update-status", {
      method: "PUT",
    }),

  // Doctor-specific functions
  updateAppointmentStatus: (id, status) =>
    apiRequest(`/appointments/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // Get appointment details
  getAppointment: (id) => apiRequest(`/appointments/${id}`),

  // Mark appointment as completed (for doctors)
  markCompleted: (id) =>
    apiRequest(`/appointments/${id}/complete`, {
      method: "PUT",
    }),
};

// Medication API functions
export const medicationApi = {
  // Get all my medications
  getMyMedications: (query = "") => apiRequest(`/medications/my${query}`),

  // Get my active medications
  getMyActiveMedications: () => apiRequest("/medications/my/active"),

  // Get medication reminders for today
  getMyMedicationReminders: () => apiRequest("/medications/my/reminders"),

  // Get single medication
  getMedication: (id) => apiRequest(`/medications/${id}`),

  // Update medication reminders
  updateMedicationReminders: (id, reminderData) =>
    apiRequest(`/medications/${id}/reminders`, {
      method: "PUT",
      body: JSON.stringify(reminderData),
    }),

  // Add medication note
  addMedicationNote: (id, noteData) =>
    apiRequest(`/medications/${id}/notes`, {
      method: "PUT",
      body: JSON.stringify(noteData),
    }),

  // Update medication status
  updateMedicationStatus: (id, statusData) =>
    apiRequest(`/medications/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    }),
};

// Feedback API functions
export const feedbackApi = {
  // Get appointments that need feedback (completed appointments without feedback)
  getAppointmentsNeedingFeedback: () => apiRequest("/feedback/patient/appointments"),

  // Get all feedback for the current patient
  getMyFeedback: () => apiRequest("/feedback/me"),

  // Get all feedback for a specific doctor
  getDoctorFeedback: (doctorId) => apiRequest(`/feedback/doctor/${doctorId}`),

  // Get all feedback (admin view)
  getAllFeedback: () => apiRequest("/feedback"),

  // Submit new feedback
  submitFeedback: (feedbackData) =>
    apiRequest("/feedback", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    }),

  // Update existing feedback
  updateFeedback: (id, feedbackData) =>
    apiRequest(`/feedback/${id}`, {
      method: "PUT",
      body: JSON.stringify(feedbackData),
    }),

  // Delete feedback
  deleteFeedback: (id) =>
    apiRequest(`/feedback/${id}`, {
      method: "DELETE",
    }),
};

// Notification preferences API functions
export const notificationApi = {
  // Get notification preferences
  getNotificationPreferences: () => apiRequest("/patients/me/notifications"),

  // Update notification preferences
  updateNotificationPreferences: (preferences) =>
    apiRequest("/patients/me/notifications", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),
};

// Medical Reports API functions
export const reportsApi = {
  // Upload medical report with files
  uploadReport: (formData) => {
    // For file uploads, we need to use fetch directly with FormData
    const token = localStorage.getItem("token");
    return fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
      }/records/patient/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    ).then((response) => response.json());
  },

  // Get patient's own medical records
  getMyReports: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.recordType) queryParams.append("recordType", params.recordType);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);

    const queryString = queryParams.toString();
    return apiRequest(
      `/records/patient/my-records${queryString ? `?${queryString}` : ""}`
    );
  },

  // Update medical record
  updateReport: (id, data) =>
    apiRequest(`/records/patient/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete medical record
  deleteReport: (id) =>
    apiRequest(`/records/patient/${id}`, {
      method: "DELETE",
    }),

  // Get single medical record
  getReport: (id) => apiRequest(`/records/${id}`),

  // Download medical record file
  downloadReport: (id) => {
    const token = localStorage.getItem("token");
    return fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
      }/records/${id}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

export default apiRequest;
