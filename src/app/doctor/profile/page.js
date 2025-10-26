"use client";

import { useState, useEffect, useRef } from "react";
import { doctorApi } from "@/utils/api";
import useDoctor from "../../../hooks/useDoctor";
import useUser from "../../../hooks/useUser";

export default function DoctorProfilePage() {
  const { doctor, loading, error, refetchProfile } = useDoctor();
  const { refetch: refetchUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    firstName: "",
    lastName: "",
    displayName: "",
    age: "",
    gender: "",
    designation: "",
    mobileNumber: "",
    experience: "",
    about: "",
    qualification: "",
    speciality: "",
    availability: { days: [], timeSlots: [] },
    awards: [],
    profilePhoto: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState("overview");
  const fileInputRef = useRef(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/v1", "");

  useEffect(() => {
    if (doctor) {
      setFormData({
        title: doctor.title || "Dr",
        firstName: doctor.user?.firstName || "",
        lastName: doctor.user?.lastName || "",
        displayName: `${doctor.user?.firstName || ""} ${
          doctor.user?.lastName || ""
        }`,
        age: doctor.age || "",
        gender: doctor.gender || "",
        designation: doctor.specialization || "",
        mobileNumber: doctor.user?.phone || "",
        experience: doctor.experience || "",
        about: doctor.about || "",
        qualification: doctor.qualification || "",
        speciality: doctor.specialization || "",
        availability: doctor.availability || { days: [], timeSlots: [] },
        awards: doctor.awards || [],
        profilePhoto: doctor.user?.profilePicture || "",
      });
    }
  }, [doctor]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("profilePhoto", file);
      try {
        await doctorApi.updateMyProfile(formData);
        refetchProfile();
        refetchUser();
        setMessage({ type: "success", text: "Profile photo updated successfully!" });
      } catch (err) {
        setMessage({
          type: "error",
          text: err.message || "Failed to update profile photo.",
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    const profileData = new FormData();
    profileData.append("firstName", formData.firstName);
    profileData.append("lastName", formData.lastName);
    profileData.append("age", formData.age);
    profileData.append("gender", formData.gender);
    profileData.append("mobileNumber", formData.mobileNumber);
    profileData.append("specialization", formData.speciality);
    profileData.append("experience", formData.experience);
    profileData.append("qualification", formData.qualification);
    profileData.append("about", formData.about);
    profileData.append("availability", JSON.stringify(formData.availability));

    try {
      await doctorApi.updateMyProfile(profileData);
      refetchProfile();
      refetchUser();
      setIsEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update profile.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-600 font-semibold">
          Loading profile information...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-blue-500 via-purple-400 to-pink-300 rounded-xl p-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold mr-6 overflow-hidden ring-4 ring-white ring-opacity-50 shadow-lg">
                  <img
                    src={doctor?.user?.profilePicture ? `${API_BASE}/${doctor.user.profilePicture}` : "/default-avatar.png"}
                    alt="Profile Photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {doctor ? `${doctor.title || "Dr."} ${doctor.user?.firstName} ${doctor.user?.lastName}` : ""}
                </h1>
                <div className="flex items-center space-x-4 text-blue-100">
                    <span>Doctor ID: {doctor?.doctorId}</span>
                    <span>{doctor?.user?.email}</span>
                  </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>
        </div>

        {message.text && (
          <div
            className={`p-3 mb-6 rounded-md ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === "overview"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                }`}
              >
                Personal Information
              </button>
              <button
                onClick={() => setActiveTab("availability")}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === "availability"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                }`}
             >
                Availability
              </button>
              <button
                onClick={() => setActiveTab("credentials")}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === "credentials"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                }`}
              >
                Credentials & Awards
              </button>
            </div>
          </div>
          <div className="p-6">
            {activeTab === "overview" && (
              <div>
                {isEditing ? (
                  <div className="space-y-8">
                    {/* Form Fields in a Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Title
                        </label>
                        <select
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Dr">Dr</option>
                          <option value="Prof">Prof</option>
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Ms">Ms</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="Ruby"
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Perrin"
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Display Name
                        </label>
                        <input
                          type="text"
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          placeholder="Ruby Perrin"
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Designation
                        </label>
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation}
                          onChange={handleInputChange}
                          placeholder="Dentist"
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          name="mobileNumber"
                          value={formData.mobileNumber}
                          onChange={handleInputChange}
                          placeholder="9876543210"
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Doctor ID
                        </label>
                        <input
                          type="text"
                          name="doctorId"
                          value={doctor.doctorId}
                          disabled
                          className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          name="experience"
                          value={formData.experience}
                          onChange={handleInputChange}
                          placeholder="5"
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Profile Photo
                        </label>
                        <input
                          type="file"
                          name="profilePhoto"
                          onChange={(e) => setSelectedPhoto(e.target.files[0])}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        About
                      </label>
                      <textarea
                        name="about"
                        value={formData.about}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Write about yourself..."
                      ></textarea>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Title</p>
                      <p className="mt-1">{doctor?.title || "Dr"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        First Name
                      </p>
                      {doctor && <p className="mt-1">{doctor.user?.firstName || "N/A"}</p>}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Last Name
                      </p>
                      <p className="mt-1">{doctor.user?.lastName || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Display Name
                      </p>
                      <p className="mt-1">{`${doctor.user?.firstName || ""} ${
                        doctor.user?.lastName || ""
                      }`}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Gender
                      </p>
                      <p className="mt-1">{doctor.gender || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Designation
                      </p>
                      <p className="mt-1">{doctor.specialization || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Mobile Number
                      </p>
                      <p className="mt-1">{doctor.user?.phone || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Doctor ID
                      </p>
                      <p className="mt-1">{doctor.doctorId || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Years of Experience
                      </p>
                      <p className="mt-1">{doctor.experience || "N/A"}</p>
                    </div>

                    <div className="col-span-full">
                      <p className="text-sm font-medium text-gray-500">About</p>
                      <p className="mt-1">
                        {doctor.about || "No information provided."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Keep the existing availability and credentials tabs */}
            {activeTab === "availability" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Available Days
                    </h3>
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                          "Sunday",
                        ].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const newDays =
                                formData.availability.days.includes(day)
                                  ? formData.availability.days.filter(
                                      (d) => d !== day
                                    )
                                  : [...formData.availability.days, day];
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  days: newDays,
                                },
                              }));
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium ${
                              formData.availability.days.includes(day)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {doctor.availability?.days.length > 0 ? (
                          doctor.availability?.days.map((day) => (
                            <span
                              key={day}
                              className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {day}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500">No availability set</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Time Slots
                    </h3>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTimeSlots = [
                            ...formData.availability.timeSlots,
                            { startTime: "09:00", endTime: "17:00" },
                          ];
                          setFormData((prev) => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              timeSlots: newTimeSlots,
                            },
                          }));
                        }}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Add Time Slot
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-4">
                      {formData.availability.timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => {
                              const newTimeSlots = [
                                ...formData.availability.timeSlots,
                              ];
                              newTimeSlots[index].startTime = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  timeSlots: newTimeSlots,
                                },
                              }));
                            }}
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-md"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => {
                              const newTimeSlots = [
                                ...formData.availability.timeSlots,
                              ];
                              newTimeSlots[index].endTime = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  timeSlots: newTimeSlots,
                                },
                              }));
                            }}
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newTimeSlots =
                                formData.availability.timeSlots.filter(
                                  (_, i) => i !== index
                                );
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  timeSlots: newTimeSlots,
                                },
                              }));
                            }}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {doctor.availability?.timeSlots.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {doctor.availability.timeSlots.map((slot, index) => (
                            <div
                              key={index}
                              className="bg-gray-100 rounded-lg p-4 text-center"
                            >
                              <p className="font-medium">{`${slot.startTime} - ${slot.endTime}`}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No time slots specified</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "credentials" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Qualification</h3>
                  <p>
                    {doctor.qualification || "No qualification information available"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Awards</h3>
                  {doctor.awards?.length > 0 ? (
                    <ul className="space-y-1">
                      {doctor.awards.map((award, index) => (
                        <li key={index}>{award}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No awards listed</p>
                  )}
                </div>
                {isEditing && (
                  <div className="space-y-2 mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Qualification
                    </label>
                    <textarea
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-md"
                      placeholder="Your qualification..."
                    ></textarea>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
