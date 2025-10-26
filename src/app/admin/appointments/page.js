'use client';

import { useState, useEffect } from 'react';
import { get, put, post } from '@/utils/api';

export default function AppointmentManagement() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch appointments from database
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const result = await get('/appointments');
      setAppointments(result.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + last).toUpperCase();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatDateTime = (isoDate, time) => `${formatDate(isoDate)} • ${time || formatTime(isoDate)}`;

  const formatCompactDateTime = (appointment) => {
    const date = formatDate(appointment.date);
    const time = appointment.time || formatTime(appointment.date);
    return { date, time };
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReschedule = (appointment) => {
    setAppointmentToReschedule(appointment);
    setIsRescheduleModalOpen(true);
  };

  const handleStatusChange = (appointmentId, newStatus) => {
    // This will be handled by the update function
    handleUpdateAppointment(appointmentId, { status: newStatus });
  };

  // Handle view appointment details
  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  // Handle delete appointment - show modal


  // Handle update appointment
  const handleUpdateAppointment = async (appointmentId, updateData) => {
    try {
      await put(`/appointments/${appointmentId}`, updateData);
      
      // Refresh appointments to get latest data with proper population
      await fetchAppointments();
      
      setSuccessMessage('Appointment updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Close modal if open
      if (isDetailsModalOpen) {
        setIsDetailsModalOpen(false);
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Failed to update appointment');
    }
  };

  // Handle reschedule appointment
  const handleRescheduleAppointment = async (appointmentId, rescheduleData) => {
    try {
      console.log('handleRescheduleAppointment called with:', { appointmentId, rescheduleData });
      
      // Validate input data
      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }
      
      if (!rescheduleData || (typeof rescheduleData !== 'object')) {
        throw new Error('Invalid reschedule data provided');
      }
      
      // Get current appointment to preserve original date
      const currentAppointment = appointments.find(app => app._id === appointmentId);
      if (!currentAppointment) {
        throw new Error(`Appointment with ID ${appointmentId} not found in current list`);
      }
      
      const updateData = {
        status: 'confirmed',
        isRescheduled: true,
        originalDate: currentAppointment.originalDate || currentAppointment.date,
        rescheduleCount: (currentAppointment.rescheduleCount || 0) + 1
      };

      // Handle date/time change
      if (rescheduleData.dateTime) {
        updateData.date = rescheduleData.dateTime;
      }

      // Handle doctor change
      if (rescheduleData.doctorId) {
        updateData.doctor = rescheduleData.doctorId;
      }
      
      console.log('Sending update data:', updateData);
      
      const result = await put(`/appointments/${appointmentId}`, updateData);
      
      // Send notification to patient (don't let this block the reschedule)
      try {
        await sendRescheduleNotification(appointmentId, rescheduleData.dateTime || currentAppointment.date);
      } catch (notificationError) {
        console.warn('Notification failed but reschedule succeeded:', notificationError);
      }
      
      // Update local state with the actual response data from API
      if (result && result.data) {
        setAppointments(appointments.map(app => 
          app._id === appointmentId ? result.data : app
        ));
      } else {
        // Fallback to manual update if no result data
        setAppointments(appointments.map(app => 
          app._id === appointmentId ? { 
            ...app, 
            ...updateData,
            date: rescheduleData.dateTime || app.date,
            doctor: rescheduleData.doctorId ? 
              doctors.find(d => d._id === rescheduleData.doctorId)?.user || app.doctor : 
              app.doctor
          } : app
        ));
      }
      
      let message = 'Appointment updated successfully';
      const changes = [];
      if (rescheduleData.dateTime) {
        changes.push('time/date');
      }
      if (rescheduleData.doctorId) {
        changes.push('doctor');
      }
      if (changes.length > 0) {
        message += ` (${changes.join(' and ')} changed)`;
      }
      message += ' and patient notified';
      
      // Refresh appointments to get latest data FIRST
      await fetchAppointments();
      
      // Then show success message and close modals
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Close modals after refresh
      setIsDetailsModalOpen(false);
      setIsRescheduleModalOpen(false);
      setAppointmentToReschedule(null);
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      
      let errorMessage = 'Failed to reschedule appointment';
      if (err.message) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to server';
        } else if (err.message.includes('HTTP 400')) {
          errorMessage = 'Invalid data provided for rescheduling';
        } else if (err.message.includes('HTTP 404')) {
          errorMessage = 'Appointment not found';
        } else if (err.message.includes('HTTP 500')) {
          errorMessage = 'Server error occurred during rescheduling';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Send reschedule notification to patient
  const sendRescheduleNotification = async (appointmentId, newDateTime) => {
    try {
      const appointment = appointments.find(app => app._id === appointmentId);
      if (!appointment) {
        console.warn('Appointment not found for notification');
        return;
      }

      const notificationData = {
        patientId: appointment.patient._id,
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled',
        message: `Your appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName} has been rescheduled to ${new Date(newDateTime).toLocaleDateString()} at ${new Date(newDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
        appointmentId: appointmentId,
        newDateTime: newDateTime
      };

      console.log('Sending notification:', notificationData);

      await post('/notifications', notificationData);

      console.log('Reschedule notification sent to patient successfully');
    } catch (err) {
      console.warn('Error sending notification (non-critical):', err);
      // Don't throw error - notification failure shouldn't block reschedule
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 overflow-x-hidden">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
        {/* Header & Breadcrumbs */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <nav className="text-sm text-gray-600 mb-2" aria-label="Breadcrumb">
              <ol className="list-reset inline-flex">
                <li>Home</li>
                <li className="mx-2">›</li>
                <li>Admin</li>
                <li className="mx-2">›</li>
                <li className="text-gray-900 font-medium">Appointments</li>
              </ol>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
          </div>
          <div className="text-gray-600">
            {/* Current Date */}
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Table only layout — filters removed per refined prompt */}

        {/* Appointments Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Appointments List</h2>
          </div>
          
          <div className="overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Patient
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Doctor
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Date & Time
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Type
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Status
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading appointments...</span>
                      </div>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 rounded-full overflow-hidden">
                            {appointment.patient?.profilePicture ? (
                              <img 
                                src={appointment.patient.profilePicture} 
                                alt={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold ${appointment.patient?.profilePicture ? 'hidden' : ''}`}>
                              {getInitials(`${appointment.patient?.firstName} ${appointment.patient?.lastName}`)}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {appointment.patient?.firstName} {appointment.patient?.lastName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{appointment.patient?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-gray-900 truncate">
                          {appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'No doctor assigned'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{appointment.doctor?.specialty || 'General Medicine'}</div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-sm text-gray-900 truncate">
                          {formatCompactDateTime(appointment).date}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {formatCompactDateTime(appointment).time}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-gray-900 truncate">{appointment.reason || 'Consultation'}</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <select
                            value={appointment.status}
                            onChange={(e) => handleStatusChange(appointment._id, e.target.value)}
                            className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${getStatusBadgeColor(appointment.status)}`}
                          >
                            <option value="confirmed" className="bg-white text-black">Confirmed</option>
                            <option value="cancelled" className="bg-white text-black">Cancelled</option>
                          </select>
                          {appointment.isRescheduled && (
                            <span className="inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                              Rescheduled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => handleViewAppointment(appointment)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            aria-label="View appointment details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 100-6 3 3 0 000 6z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleReschedule(appointment)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                            aria-label="Reschedule appointment"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {isDetailsModalOpen && selectedAppointment && (
        <AppointmentDetailsModal 
          appointment={selectedAppointment}
          onClose={() => setIsDetailsModalOpen(false)}
          onReschedule={handleRescheduleAppointment}
        />
      )}



      {/* Reschedule Modal */}
      {isRescheduleModalOpen && appointmentToReschedule && (
        <RescheduleModal
          appointment={appointmentToReschedule}
          onClose={() => {
            setIsRescheduleModalOpen(false);
            setAppointmentToReschedule(null);
          }}
          onConfirm={handleRescheduleAppointment}
        />
      )}
    </div>
  );
}
// Appointment Details Modal Component
function AppointmentDetailsModal({ appointment, onClose, onReschedule }) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [showDoctorSelection, setShowDoctorSelection] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    if (appointment) {
      // Format date for input (YYYY-MM-DD)
      const date = new Date(appointment.date);
      const formattedDate = date.toISOString().split('T')[0];
      setNewDate(formattedDate);
      
      // Format time for input (HH:MM)
      const formattedTime = date.toTimeString().slice(0, 5);
      setNewTime(formattedTime);
      
      // Initialize selected doctor to current doctor (with null check)
      if (appointment.doctor && appointment.doctor._id) {
        setSelectedDoctor(appointment.doctor._id);
      }
    }
  }, [appointment]);

  // Helper function to safely get doctor ID
  const getCurrentDoctorId = () => {
    return appointment?.doctor?._id || null;
  };

  const handleReschedule = () => {
    console.log('handleReschedule called', { 
      showTimeSlots, 
      selectedTimeSlot, 
      newDate, 
      selectedDoctor, 
      currentDoctorId: getCurrentDoctorId() 
    });
    
    if (showTimeSlots) {
      const rescheduleData = {};
      
      // Handle time change if selected
      if (selectedTimeSlot && newDate) {
        const dateTime = new Date(`${newDate}T${selectedTimeSlot}:00`);
        console.log('Created dateTime:', dateTime, 'ISO:', dateTime.toISOString());
        rescheduleData.dateTime = dateTime.toISOString();
      }
      
      // Handle doctor change if selected
      if (selectedDoctor && selectedDoctor !== getCurrentDoctorId()) {
        rescheduleData.doctorId = selectedDoctor;
        console.log('Doctor change detected:', selectedDoctor);
      }
      
      // Must have at least one change (time or doctor)
      if (rescheduleData.dateTime || rescheduleData.doctorId) {
        console.log('Calling onReschedule with:', rescheduleData);
        onReschedule(appointment._id, rescheduleData);
      } else {
        console.warn('No changes detected - need to change time or doctor');
        alert('Please select a new time or doctor to reschedule.');
      }
    } else {
      console.log('Showing time slots and doctor selection');
      // Show time slots for selection
      setShowTimeSlots(true);
      // Also show doctor selection
      setShowDoctorSelection(true);
    }
  };

  // Fetch available doctors
  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const data = await get('/doctors');
      if (data.success) {
        setDoctors(data.data);
        // Set current doctor as default selection
        const currentDoctorId = getCurrentDoctorId();
        if (currentDoctorId) {
          setSelectedDoctor(currentDoctorId);
        }
      } else {
        console.error('Failed to fetch doctors:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Load doctors when doctor selection is shown
  useEffect(() => {
    if (showDoctorSelection && doctors.length === 0) {
      fetchDoctors();
    }
  }, [showDoctorSelection]);



  // Time slots array - same as used in doctor management
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };



  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Appointment Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <p className="text-sm text-gray-900">
                {appointment.patient ? (
                  `${appointment.patient.firstName} ${appointment.patient.lastName}`
                ) : (
                  <span className="text-red-600">No patient information</span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Email</label>
              <p className="text-sm text-gray-900">{appointment.patient?.email || 'N/A'}</p>
            </div>
            
            {/* Doctor Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Doctor Name</label>
              <p className="text-sm text-gray-900">
                {appointment.doctor ? (
                  `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
                ) : (
                  <span className="text-red-600">No doctor assigned</span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Specialization</label>
              <p className="text-sm text-gray-900">
                {appointment.doctor?.specialty || appointment.doctor?.specialization || 'General Medicine'}
              </p>
            </div>
            
            {/* Appointment Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Date</label>
              <p className="text-sm text-gray-900">{formatDate(appointment.date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Time</label>
              <p className="text-sm text-gray-900">{formatTime(appointment.date)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Appointment ID</label>
              <p className="text-sm text-gray-900">{appointment._id}</p>
            </div>
            
            {/* Update Date/Time Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {!showTimeSlots ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Time</label>
                <p className="text-sm text-gray-900 mt-1 p-2 bg-gray-50 rounded-md">{formatTime(appointment.date)}</p>
                <p className="text-xs text-gray-500 mt-1">Click "Reschedule" to select new time</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select New Time Slot</label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select a time slot...</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {selectedTimeSlot && (
                  <p className="text-sm text-green-600 mt-2">✓ Selected: {selectedTimeSlot}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Doctor Selection Section */}
          {showDoctorSelection && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Change Doctor (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Doctor</label>
                  <p className="text-sm text-gray-900 mt-1 p-2 bg-gray-50 rounded-md">
                    {appointment.doctor ? (
                      `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
                    ) : (
                      <span className="text-red-600">No doctor assigned</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{appointment.doctor?.specialty || appointment.doctor?.specialization || 'General Medicine'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select New Doctor</label>
                  {loadingDoctors ? (
                    <div className="mt-1 p-2 text-sm text-gray-500">Loading doctors...</div>
                  ) : (
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getCurrentDoctorId() && (
                        <option value={getCurrentDoctorId()}>Keep Current Doctor</option>
                      )}
                      {doctors.filter(doc => doc._id !== getCurrentDoctorId()).map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          Dr. {doctor.user?.firstName || 'Unknown'} {doctor.user?.lastName || ''} - {doctor.specialization || 'General Medicine'}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedDoctor && selectedDoctor !== getCurrentDoctorId() && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Will change to: {doctors.find(d => d._id === selectedDoctor)?.user?.firstName || 'Unknown'} {doctors.find(d => d._id === selectedDoctor)?.user?.lastName || ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Summary of Changes */}
          {showTimeSlots && (
            <div className="border-t pt-4 bg-blue-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Changes Summary:</h4>
              <div className="text-sm text-blue-800">
                {selectedTimeSlot && newDate ? (
                  <p>✓ Time will change to: {newDate} at {selectedTimeSlot}</p>
                ) : (
                  <p>• No time change</p>
                )}
                {selectedDoctor && selectedDoctor !== getCurrentDoctorId() ? (
                  <p>✓ Doctor will change to: {doctors.find(d => d._id === selectedDoctor)?.user?.firstName || 'Unknown'} {doctors.find(d => d._id === selectedDoctor)?.user?.lastName || ''}</p>
                ) : (
                  <p>• No doctor change</p>
                )}
                {(!selectedTimeSlot || !newDate) && selectedDoctor === getCurrentDoctorId() && (
                  <p className="text-red-600">⚠ Please make at least one change (time or doctor)</p>
                )}
              </div>
            </div>
          )}
          
          {/* Full-width fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Appointment Reason</label>
            <p className="text-sm text-gray-900">{appointment.reason}</p>
          </div>
          
          {appointment.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <p className="text-sm text-gray-900">{appointment.notes}</p>
            </div>
          )}
          
          {appointment.patient?.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Phone</label>
              <p className="text-sm text-gray-900">{appointment.patient.phone}</p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleReschedule}
                disabled={showTimeSlots && (!newDate || !selectedTimeSlot) && selectedDoctor === getCurrentDoctorId()}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showTimeSlots && (!newDate || !selectedTimeSlot) && selectedDoctor === getCurrentDoctorId()
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {showTimeSlots ? 'Confirm Reschedule' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate Reschedule Modal Component
function RescheduleModal({ appointment, onClose, onConfirm }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);


  
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  // Get current doctor ID safely
  const getCurrentDoctorId = () => {
    return appointment?.doctor?._id || null;
  };

  // Initialize form with current appointment data
  useEffect(() => {
    if (appointment) {
      const appointmentDate = new Date(appointment.date);
      const dateStr = appointmentDate.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      setSelectedTime(appointment.time || '');
      setSelectedDoctor(getCurrentDoctorId() || '');
    }
  }, [appointment]);

  // Fetch doctors when modal opens
  useEffect(() => {
    if (appointment) {
      fetchDoctors();
    }
  }, [appointment]);

  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const data = await get('/doctors');
      if (data.success) {
        setDoctors(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleConfirm = () => {
    const rescheduleData = {
      date: selectedDate,
      time: selectedTime,
      doctorId: selectedDoctor !== getCurrentDoctorId() ? selectedDoctor : null
    };
    onConfirm(appointment._id, rescheduleData);
  };

  if (!appointment) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Reschedule Appointment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Current Appointment Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Current Appointment</h4>
            <p className="text-sm text-gray-600">
              Patient: {appointment.patient?.firstName} {appointment.patient?.lastName}
            </p>
            <p className="text-sm text-gray-600">
              Date: {new Date(appointment.date).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              Time: {appointment.time}
            </p>
            <p className="text-sm text-gray-600">
              Doctor: {appointment.doctor ? (
                `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
              ) : (
                <span className="text-red-600">No doctor assigned</span>
              )}
            </p>
          </div>

          {/* New Appointment Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">New Appointment Details</h4>
            
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Doctor (Optional Change)</label>
              {loadingDoctors ? (
                <div className="mt-1 p-2 text-sm text-gray-500">Loading doctors...</div>
              ) : (
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {getCurrentDoctorId() && (
                    <option value={getCurrentDoctorId()}>Keep Current Doctor</option>
                  )}
                  {doctors.filter(doc => doc._id !== getCurrentDoctorId()).map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      Dr. {doctor.user?.firstName || 'Unknown'} {doctor.user?.lastName || ''} - {doctor.specialization || 'General Medicine'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
            className={`px-4 py-2 text-base font-medium rounded-md focus:outline-none focus:ring-2 ${
              !selectedDate || !selectedTime
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}