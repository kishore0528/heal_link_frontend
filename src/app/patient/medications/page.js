"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import usePatient from "@/hooks/usePatient";
import { get, post } from "@/utils/api";

export default function MedicationsPage() {
  const router = useRouter();
  const { patient } = usePatient();
  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [activeFilter, setActiveFilter] = useState("active");
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [medicationForm, setMedicationForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    startDate: "",
    endDate: "",
    instructions: "",
    notes: "",
    reminders: {
      enabled: true,
      times: ["08:00"]
    }
  });

  useEffect(() => {
    const fetchMedications = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // Fetch real medications from API
        const result = await get("/medications/my");
        setMedications(result.data || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching medications:", error);
        // Fallback to empty array if there's an error
        setMedications([]);
        setIsLoading(false);
      }
    };

    fetchMedications();
  }, [router]);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value || "";
    setSearchTerm(value);
  };

  // Calculate days remaining for active medications
  const calculateDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Determine the actual status based on dates
  const getActualStatus = (medication) => {
    if (!medication.endDate) {
      return medication.status || "active"; // No end date means ongoing
    }
    
    const today = new Date();
    const endDate = new Date(medication.endDate);
    
    // If end date has passed, medication should be completed/expired
    if (endDate < today) {
      return "completed";
    }
    
    // If medication has an end date but hasn't reached it yet
    return medication.status || "active";
  };

  // Check if medication needs refill soon (within 7 days)
  const needsRefillSoon = (medication) => {
    const actualStatus = getActualStatus(medication);
    if (actualStatus !== "active") return false;
    if (medication.refillsRemaining <= 0) return false;

    const daysRemaining = calculateDaysRemaining(medication.endDate);
    return daysRemaining <= 7 && daysRemaining > 0;
  };

  // Filter medications based on search term and active filter
  const filteredMedications = medications.filter((medication) => {
    // First filter by status using actual status
    const actualStatus = getActualStatus(medication);
    const statusMatch = activeFilter === "all" || actualStatus === activeFilter;
    
    // Then filter by search term
    const search = (searchTerm || "").toLowerCase();
    const searchMatch = !search || 
      (medication.name && medication.name.toLowerCase().includes(search)) ||
      (medication.dosage && medication.dosage.toLowerCase().includes(search)) ||
      (medication.frequency && medication.frequency.toLowerCase().includes(search));
    
    return statusMatch && searchMatch;
  });

  const handleViewMedication = (medication) => {
    setSelectedMedication(medication);
    setShowMedicationModal(true);
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('reminders.')) {
      const reminderField = name.split('.')[1];
      setMedicationForm(prev => ({
        ...prev,
        reminders: {
          ...prev.reminders,
          [reminderField]: value
        }
      }));
    } else {
      setMedicationForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle reminder times
  const handleReminderTimeChange = (index, value) => {
    setMedicationForm(prev => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        times: prev.reminders.times.map((time, i) => i === index ? value : time)
      }
    }));
  };

  // Add new reminder time
  const addReminderTime = () => {
    setMedicationForm(prev => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        times: [...prev.reminders.times, "12:00"]
      }
    }));
  };

  // Remove reminder time
  const removeReminderTime = (index) => {
    if (medicationForm.reminders.times.length > 1) {
      setMedicationForm(prev => ({
        ...prev,
        reminders: {
          ...prev.reminders,
          times: prev.reminders.times.filter((_, i) => i !== index)
        }
      }));
    }
  };

  // Handle form submission
  const handleAddMedication = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const result = await post("/medications/my", medicationForm);

      // Add the new medication to the list
      setMedications(prev => [result.data, ...prev]);
      
      // Reset form and close modal
      setMedicationForm({
        name: "",
        dosage: "",
        frequency: "",
        startDate: "",
        endDate: "",
        instructions: "",
        notes: "",
        reminders: {
          enabled: true,
          times: ["08:00"]
        }
      });
      setShowAddMedicationModal(false);
      
      // Show success popup
      setShowSuccessPopup(true);
      
      // Dispatch event to notify dashboard of medication change
      window.dispatchEvent(new CustomEvent('medicationAdded', {
        detail: { medication: result.data }
      }));
      
      // Auto-hide success popup after 4 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 4000);
    } catch (error) {
      console.error("Error adding medication:", error);
      alert("Error adding medication. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Medications</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </span>
            <input
              type="search"
              value={searchTerm || ""}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search medications..."
            />
          </div>
          <button
            onClick={() => setShowAddMedicationModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            Add Medication
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {["active", "completed", "all"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeFilter === filter
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Medications Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Medication
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Dosage
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Frequency
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Start Date
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                End Date
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                  <div className="mt-2">Loading medications...</div>
                </td>
              </tr>
            ) : filteredMedications.length > 0 ? (
              filteredMedications.map((medication) => (
                <tr
                  key={medication._id}
                  className={`hover:bg-gray-50 transition-colors ${
                    needsRefillSoon(medication) ? "bg-yellow-50" : "bg-white"
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {medication.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {medication.doctor ? `Dr. ${medication.doctor.firstName} ${medication.doctor.lastName}` : 
                       patient?.user ? `Pt. ${patient.user.firstName} ${patient.user.lastName}` : 'Added by Me'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medication.dosage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medication.frequency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medication.startDate ? new Date(medication.startDate).toLocaleDateString() : 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medication.endDate ? new Date(medication.endDate).toLocaleDateString() : 'Ongoing'}
                    {getActualStatus(medication) === "active" && medication.endDate && (
                      <div className="text-xs text-blue-600">
                        {calculateDaysRemaining(medication.endDate)} days
                        remaining
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        getActualStatus(medication) === "active"
                          ? "bg-green-100 text-green-800"
                          : getActualStatus(medication) === "completed"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {getActualStatus(medication).charAt(0).toUpperCase() +
                        getActualStatus(medication).slice(1)}
                    </span>
                    {needsRefillSoon(medication) && (
                      <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Refill Soon
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewMedication(medication)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition-colors"
                      title="View Medication Details"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No medications found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Medication Detail Modal */}
      {showMedicationModal && selectedMedication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedMedication.name}
                  </h3>
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      getActualStatus(selectedMedication) === "active"
                        ? "bg-green-100 text-green-800"
                        : getActualStatus(selectedMedication) === "completed"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {getActualStatus(selectedMedication).charAt(0).toUpperCase() +
                      getActualStatus(selectedMedication).slice(1)}
                  </span>
                </div>
                <button
                  onClick={() => setShowMedicationModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Dosage</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedMedication.dosage}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Frequency</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedMedication.frequency}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Start Date
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(
                      selectedMedication.startDate
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedMedication.endDate).toLocaleDateString()}
                    {getActualStatus(selectedMedication) === "active" && (
                      <span className="ml-2 text-xs text-blue-600">
                        ({calculateDaysRemaining(selectedMedication.endDate)}{" "}
                        days remaining)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Added By
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedMedication.doctor ? `Dr. ${selectedMedication.doctor.firstName} ${selectedMedication.doctor.lastName}` : 
                     patient?.user ? `Pt. ${patient.user.firstName} ${patient.user.lastName}` : 'Added by Me'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Refills Remaining
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedMedication.refillsRemaining}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500">
                  Instructions
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedMedication.instructions}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500">
                  Possible Side Effects
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedMedication.sideEffects}
                </p>
              </div>

              {getActualStatus(selectedMedication) === "active" &&
                selectedMedication.refillsRemaining > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Refill Information
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            You have {selectedMedication.refillsRemaining}{" "}
                            refill(s) remaining.
                            {needsRefillSoon(selectedMedication) &&
                              " Consider requesting a refill soon."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              {getActualStatus(selectedMedication) === "active" &&
                selectedMedication.refillsRemaining > 0 && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300">
                    Request Refill
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddMedicationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add New Medication</h3>
                <button
                  onClick={() => setShowAddMedicationModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddMedication} className="px-6 py-4 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={medicationForm.name}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Aspirin"
                  />
                </div>

                <div>
                  <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-2">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    id="dosage"
                    name="dosage"
                    required
                    value={medicationForm.dosage}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 100mg"
                  />
                </div>

                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    required
                    value={medicationForm.frequency}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Four times daily">Four times daily</option>
                    <option value="Every other day">Every other day</option>
                    <option value="Weekly">Weekly</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={medicationForm.startDate}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={medicationForm.endDate}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  id="instructions"
                  name="instructions"
                  rows={3}
                  value={medicationForm.instructions}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Take with food, after meals..."
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  value={medicationForm.notes}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any personal notes about this medication..."
                />
              </div>

              {/* Reminders */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Medication Reminders
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={medicationForm.reminders.enabled}
                      onChange={(e) => setMedicationForm(prev => ({
                        ...prev,
                        reminders: {
                          ...prev.reminders,
                          enabled: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable reminders</span>
                  </label>
                </div>

                {medicationForm.reminders.enabled && (
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-600 mb-2">Reminder Times:</label>
                    {medicationForm.reminders.times.map((time, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => handleReminderTimeChange(index, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {medicationForm.reminders.times.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReminderTime(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addReminderTime}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add another time
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddMedicationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Add Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Medication Added Successfully!
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Your medication has been added to your list and is now active.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
