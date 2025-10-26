"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

import { get, post } from '@/utils/api';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function FeedbackPage() {
  const router = useRouter();
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [error, setError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [activeFilter, setActiveFilter] = useState("available");

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    feedbackType: "compliment",
    comment: "",
  });

  // Fetch completed appointments
  const fetchCompletedAppointments = async () => {
    try {
      const data = await get("/feedback/patient/appointments");
      setCompletedAppointments(data.data || []);
    } catch (error) {
      console.error("Error fetching completed appointments:", error);
      setError("Failed to load completed appointments");
    }
  };

  // Fetch submitted feedback history
  const fetchFeedbackHistory = async () => {
    try {
      const data = await get("/feedback/patient/history");
      setSubmittedFeedbacks(data.data || []);
    } catch (error) {
      console.error("Error fetching feedback history:", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.push("/login");
      return;
    }

    if (role !== "patient") {
      alert("Access denied. Please login as a patient.");
      router.push("/login");
      return;
    }

    fetchCompletedAppointments();
    fetchFeedbackHistory();
    setIsLoading(false);
  }, [router]);

  // Submit feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    try {
      await post("/feedback", {
        appointment: selectedAppointment._id,
        appointmentType: selectedAppointment.appointmentType || "consultation",
        feedbackType: feedbackForm.feedbackType,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment,
      });

      setShowFeedbackModal(false);
      setFeedbackForm({ rating: 5, feedbackType: "compliment", comment: "" });
      setSelectedAppointment(null);
      setShowSuccessPopup(true);
      
      // Auto-hide success popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
      
      fetchCompletedAppointments();
      fetchFeedbackHistory();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback");
    }
  };

  // Open feedback modal
  const openFeedbackModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowFeedbackModal(true);
  };

  // Render star rating
  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl ${
              star <= rating ? "text-yellow-400" : "text-gray-300"
            } ${interactive ? "hover:text-yellow-400 cursor-pointer" : ""}`}
            onClick={interactive ? () => onRatingChange(star) : undefined}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if feedback already submitted for appointment
  const isFeedbackSubmitted = (appointmentId) => {
    return submittedFeedbacks.some(feedback => 
      feedback.appointment && feedback.appointment._id === appointmentId
    );
  };

  // Filter appointments based on active filter
  const getFilteredAppointments = () => {
    switch (activeFilter) {
      case "available":
        return completedAppointments.filter(apt => !isFeedbackSubmitted(apt._id));
      case "completed":
        return completedAppointments.filter(apt => isFeedbackSubmitted(apt._id));
      default:
        return completedAppointments;
    }
  };

  // Generate pie chart data for feedback ratings
  const getPieChartData = () => {
    const ratings = submittedFeedbacks.map(feedback => feedback.rating);
    const ratingCounts = {
      "5 Stars (Excellent)": ratings.filter(r => r === 5).length,
      "4 Stars (Good)": ratings.filter(r => r === 4).length,
      "3 Stars (Average)": ratings.filter(r => r === 3).length,
      "2 Stars (Poor)": ratings.filter(r => r === 2).length,
      "1 Star (Very Poor)": ratings.filter(r => r === 1).length,
    };

    return {
      labels: Object.keys(ratingCounts).filter(key => ratingCounts[key] > 0),
      datasets: [
        {
          data: Object.values(ratingCounts).filter(count => count > 0),
          backgroundColor: [
            '#10B981', // Green for 5 stars
            '#3B82F6', // Blue for 4 stars
            '#F59E0B', // Yellow for 3 stars
            '#F97316', // Orange for 2 stars
            '#EF4444', // Red for 1 star
          ],
          borderColor: [
            '#065F46',
            '#1E40AF',
            '#92400E',
            '#C2410C',
            '#B91C1C',
          ],
          borderWidth: 2,
          hoverBackgroundColor: [
            '#34D399',
            '#60A5FA',
            '#FBBF24',
            '#FB923C',
            '#F87171',
          ],
        },
      ],
    };
  };

  // Calculate average rating
  const getAverageRating = () => {
    if (submittedFeedbacks.length === 0) return 0;
    const total = submittedFeedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    return (total / submittedFeedbacks.length).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading feedback page...</p>
        </div>
      </div>
    );
  }

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Feedback</h1>
              <p className="text-gray-600">Share your experience with completed appointments</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{submittedFeedbacks.length}</div>
              <div className="text-sm text-gray-500">Total Feedback</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {submittedFeedbacks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Average Rating</h3>
                  <p className="text-2xl font-bold text-yellow-600">{getAverageRating()}/5</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Feedback Given</h3>
                  <p className="text-2xl font-bold text-green-600">{submittedFeedbacks.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Feedback</h3>
                  <p className="text-2xl font-bold text-blue-600">{completedAppointments.filter(apt => !isFeedbackSubmitted(apt._id)).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointments Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header with Filter Tabs */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Completed Appointments</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage your appointment feedback</p>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setActiveFilter("available")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeFilter === "available"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Available ({completedAppointments.filter(apt => !isFeedbackSubmitted(apt._id)).length})
                      </button>
                      <button
                        onClick={() => setActiveFilter("completed")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeFilter === "completed"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Completed ({completedAppointments.filter(apt => isFeedbackSubmitted(apt._id)).length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Content */}
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {activeFilter === "available" ? "No appointments available for feedback" : "No feedback submitted yet"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeFilter === "available" 
                      ? "Once you have completed appointments, you can give feedback here."
                      : "Your submitted feedback will appear here."
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doctor
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Appointment Details
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {activeFilter === "completed" ? "Rating" : "Status"}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                            <div className="mt-2">Loading appointments...</div>
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appointment) => {
                          const feedback = submittedFeedbacks.find(f => 
                            f.appointment && f.appointment._id === appointment._id
                          );
                          return (
                            <tr 
                              key={appointment._id} 
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-blue-600 font-medium text-sm">
                                        {appointment.doctor ? 
                                          `${appointment.doctor.firstName?.[0] || ''}${appointment.doctor.lastName?.[0] || ''}` : 
                                          'Dr'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      Dr. {appointment.doctor ? 
                                        `${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 
                                        'Unknown Doctor'
                                      }
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {appointment.doctor?.specialty || 'General Medicine'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {appointment.reason || 'General consultation'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Appointment completed
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(appointment.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {activeFilter === "completed" && feedback ? (
                                  <div className="flex items-center">
                                    {renderStars(feedback.rating)}
                                    <span className="ml-2 text-sm text-gray-600">({feedback.rating}/5)</span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Completed
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {activeFilter === "completed" && feedback ? (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-600 flex items-center text-sm">
                                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Submitted
                                    </span>
                                    {feedback.comment && (
                                      <button
                                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                        title="View Comment"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openFeedbackModal(appointment)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                  >
                                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Give Feedback
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Pie Chart Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback Overview</h3>
              {submittedFeedbacks.length > 0 ? (
                <div className="space-y-4">
                  <div className="w-full h-64 flex items-center justify-center">
                    <Pie 
                      data={getPieChartData()} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              padding: 20,
                              usePointStyle: true,
                              font: {
                                size: 12
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{getAverageRating()}</div>
                    <div className="text-sm text-gray-500">Average Rating</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">No Data Yet</h4>
                  <p className="text-sm text-gray-500 mt-1">Submit some feedback to see your rating distribution.</p>
                </div>
              )}
            </div>
          </div>
        </div>

          {submittedFeedbacks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback submitted yet</h3>
              <p className="mt-1 text-sm text-gray-500">Your feedback history will appear here once you submit feedback.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor & Specialty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comment
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submittedFeedbacks.map((feedback) => (
                    <tr key={feedback._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Dr. {feedback.doctor ? 
                              `${feedback.doctor.firstName} ${feedback.doctor.lastName}` : 
                              'Unknown Doctor'
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {feedback.doctor?.specialty || 'General'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStars(feedback.rating)}
                        <div className="text-xs text-gray-500 mt-1">{feedback.rating}/5</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                          {feedback.appointmentType || 'consultation'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(feedback.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={feedback.comment}>
                          {feedback.comment || 'No comment provided'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
            <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 transform transition-all duration-300 scale-100">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback Submitted Successfully!</h3>
                <p className="text-sm text-gray-600">Thank you for sharing your experience.</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Feedback Modal */}
        {showFeedbackModal && selectedAppointment && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Share Your Experience</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Appointment with Dr. {selectedAppointment.doctor?.firstName} {selectedAppointment.doctor?.lastName}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmitFeedback} className="space-y-6">
                  {/* Rating Section */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How would you rate your experience? *
                    </label>
                    <div className="flex justify-center mb-3">
                      {renderStars(feedbackForm.rating, true, (rating) => 
                        setFeedbackForm({ ...feedbackForm, rating })
                      )}
                    </div>
                    <div className="text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        feedbackForm.rating === 5 ? "bg-green-100 text-green-800" :
                        feedbackForm.rating === 4 ? "bg-blue-100 text-blue-800" :
                        feedbackForm.rating === 3 ? "bg-yellow-100 text-yellow-800" :
                        feedbackForm.rating === 2 ? "bg-orange-100 text-orange-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {feedbackForm.rating === 5 ? "Excellent!" :
                         feedbackForm.rating === 4 ? "Good" :
                         feedbackForm.rating === 3 ? "Average" :
                         feedbackForm.rating === 2 ? "Poor" :
                         "Very Poor"}
                      </span>
                    </div>
                  </div>

                  {/* Feedback Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Type of feedback
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <label className="flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="feedbackType"
                          value="compliment"
                          checked={feedbackForm.feedbackType === "compliment"}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackType: e.target.value })}
                          className="sr-only"
                        />
                        <div className={`text-center ${feedbackForm.feedbackType === "compliment" ? "text-green-600" : "text-gray-500"}`}>
                          <div className="text-2xl mb-1">😊</div>
                          <div className="text-sm font-medium">Compliment</div>
                        </div>
                      </label>
                      <label className="flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="feedbackType"
                          value="complaint"
                          checked={feedbackForm.feedbackType === "complaint"}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackType: e.target.value })}
                          className="sr-only"
                        />
                        <div className={`text-center ${feedbackForm.feedbackType === "complaint" ? "text-red-600" : "text-gray-500"}`}>
                          <div className="text-2xl mb-1">😞</div>
                          <div className="text-sm font-medium">Complaint</div>
                        </div>
                      </label>
                      <label className="flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="feedbackType"
                          value="suggestion"
                          checked={feedbackForm.feedbackType === "suggestion"}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackType: e.target.value })}
                          className="sr-only"
                        />
                        <div className={`text-center ${feedbackForm.feedbackType === "suggestion" ? "text-blue-600" : "text-gray-500"}`}>
                          <div className="text-2xl mb-1">💡</div>
                          <div className="text-sm font-medium">Suggestion</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Comment Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {feedbackForm.feedbackType === "complaint" ? "What went wrong?" : 
                       feedbackForm.feedbackType === "suggestion" ? "Your suggestion:" : 
                       "What did you like?"}
                    </label>
                    <textarea
                      value={feedbackForm.comment}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder={
                        feedbackForm.feedbackType === "complaint" ? "Please describe the issue you experienced..." :
                        feedbackForm.feedbackType === "suggestion" ? "How can we improve your experience?" :
                        "Share what made your visit great..."
                      }
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Feedback
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}