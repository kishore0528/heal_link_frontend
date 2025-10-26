"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { patientApi, appointmentApi } from "@/utils/api";
import useUser from "../../../../hooks/useUser";

export default function NewAppointment() {
  const router = useRouter();
  const { user } = useUser();
  const [formData, setFormData] = useState({
    patient: "",
    date: "",
    reason: "",
    notes: "",
  });
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPatients, setIsFetchingPatients] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await patientApi.getPatients();
        if (data.success) {
          setPatients(data.data || []);
        } else {
          console.error("Failed to fetch patients");
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setIsFetchingPatients(false);
      }
    };

    fetchPatients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Submitting appointment data:", formData);
      console.log("Current user:", user);

      // Create appointment with the correct patient and doctor IDs
      const appointmentData = {
        patient: formData.patient, // This is the patient's user ID
        date: formData.date,
        reason: formData.reason || "General consultation",
        notes: formData.notes,
        // Note: Doctor bookings are automatically confirmed by backend
      };

      console.log("Sending appointment data:", appointmentData);

      const response = await appointmentApi.bookAppointment(appointmentData);

      console.log("Appointment response:", response);

      if (response.success) {
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('appointmentBooked', { 
          detail: response.data 
        }));
        
        alert("Appointment created successfully!");
        router.push("/doctor/appointments");
      } else {
        alert(response.error || "Something went wrong");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert(
        error.message || "An error occurred while creating the appointment."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Appointment</h1>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="patient"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Patient
            </label>
            {isFetchingPatients ? (
              <p>Loading patients...</p>
            ) : (
              <select
                id="patient"
                name="patient"
                value={formData.patient}
                onChange={handleInputChange}
                required
                className="w-full pl-3 pr-8 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="" disabled>
                  Select a patient
                </option>
                {patients
                  .filter((patient) => patient.user)
                  .map((patient) => (
                    <option key={patient._id} value={patient.user._id}>
                      {patient.user.firstName} {patient.user.lastName} -{" "}
                      {patient.user.email}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reason for Visit
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={3}
              placeholder="Enter reason for appointment"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Enter any additional notes"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date and Time
            </label>
            <input
              id="date"
              name="date"
              type="datetime-local"
              value={formData.date}
              onChange={handleInputChange}
              required
              min={new Date().toISOString().slice(0, 16)} // Prevent past dates
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isFetchingPatients}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
            >
              {isLoading ? "Creating..." : "Create Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
