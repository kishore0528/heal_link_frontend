'use client';

import { useState, useEffect } from 'react';
import { get, post, put, del } from '@/utils/api';

// Add custom styles for animations
const styles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    specialization: '',
    gender: '',
    experience: '',
    phone: '',
    email: '',
    workingHours: '',
    address: ''
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Specialization options
  const specializationOptions = [
    'General Medicine',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Oncology',
    'Psychiatry',
    'Radiology',
    'Emergency Medicine',
    'Internal Medicine',
    'Surgery',
    'Gynecology',
    'Ophthalmology',
    'ENT',
    'Anesthesiology',
    'Pathology',
    'Gastroenterology',
    'Pulmonology',
    'Endocrinology'
  ];

  // Toast notification functions
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000); // 3 seconds for perfect timing
  };

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  };

  const hideConfirmDialog = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
  };

  // Fetch doctors from backend API (only database doctors, no defaults)
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      
      const result = await get('/doctors');
      
      // Only set doctors from database, ensure it's an array
      if (result.success && Array.isArray(result.data)) {
        setDoctors(result.data);
        console.log(`Loaded ${result.data.length} doctors from database`);
      } else {
        setDoctors([]);
        console.warn('No valid doctor data received from API');
        showToast('No doctors found in database', 'info');
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      
      let errorMessage = 'Failed to load doctors from database.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check if the backend server is running.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running on port 5000.';
      } else {
        errorMessage = err.message || 'Unknown error occurred while fetching doctors.';
      }
      
      showToast(errorMessage, 'error');
      setDoctors([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.specialization) errors.specialization = 'Specialization is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!formData.experience || formData.experience <= 0) errors.experience = 'Valid experience is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!formData.workingHours.trim()) errors.workingHours = 'Working hours are required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle add doctor form submission
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      console.log('Submitting doctor form with data:', formData);
      
      // Send data directly to backend API without authentication
      const result = await post('/doctors', formData);
      
      console.log('Doctor added successfully:', result);
      
      // Show success toast with default password info
      if (result.defaultPassword) {
        showToast(`Doctor added successfully! Default password: ${result.defaultPassword} (Please share this with the doctor)`, 'success');
      } else {
        showToast('Doctor added successfully!', 'success');
      }
      
      // Reset form and close modal
      setFormData({
        firstName: '',
        lastName: '',
        specialization: '',
        gender: '',
        experience: '',
        phone: '',
        email: '',
        workingHours: '',
        address: ''
      });
      setFormErrors({});
      setIsAddModalOpen(false);
      
      // Refresh the doctor list
      fetchDoctors();
      
    } catch (error) {
      console.error('Error adding doctor:', error);
      
      let errorMessage = 'Failed to add doctor';
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit doctor
  const handleEditDoctor = (doctor) => {
    setEditFormData({
      firstName: doctor.user?.firstName || '',
      lastName: doctor.user?.lastName || '',
      specialization: doctor.specialization || '',
      experience: doctor.experience || '',
      phone: doctor.user?.phone || '',
      email: doctor.user?.email || '',
      address: doctor.hospital?.address || '',
      isActive: doctor.isActive,
      availabilityDays: doctor.availability?.days || [],
      timeSlots: doctor.availability?.timeSlots || []
    });
    setIsEditMode(true);
  };

  // Helper functions for time slot management
  const addTimeSlot = () => {
    const newTimeSlot = { startTime: '09:00', endTime: '17:00' }; // 9:00 AM - 5:00 PM
    setEditFormData({
      ...editFormData,
      timeSlots: [...(editFormData.timeSlots || []), newTimeSlot]
    });
  };

  const removeTimeSlot = (index) => {
    const updatedTimeSlots = editFormData.timeSlots.filter((_, i) => i !== index);
    setEditFormData({
      ...editFormData,
      timeSlots: updatedTimeSlots
    });
  };

  const updateTimeSlot = (index, field, value) => {
    const updatedTimeSlots = editFormData.timeSlots.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    );
    setEditFormData({
      ...editFormData,
      timeSlots: updatedTimeSlots
    });
  };

  const toggleAvailabilityDay = (day) => {
    const currentDays = editFormData.availabilityDays || [];
    const updatedDays = currentDays.includes(day) 
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    setEditFormData({
      ...editFormData,
      availabilityDays: updatedDays
    });
  };

  // Available days and time options
  const availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Helper function to convert 24-hour to 12-hour AM/PM format
  const formatTimeTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to convert 12-hour AM/PM to 24-hour format
  const formatTimeTo24Hour = (time12) => {
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = time12.match(timeRegex);
    if (!match) return time12; // Return as-is if format doesn't match
    
    let [, hours, minutes, ampm] = match;
    hours = parseInt(hours);
    ampm = ampm.toUpperCase();
    
    if (ampm === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const time12 = formatTimeTo12Hour(time24);
      timeOptions.push({ value: time24, label: time12 });
    }
  }

  // Handle update doctor
  const handleUpdateDoctor = async (doctorId, updateData) => {
    try {
      setLoading(true);
      
      await put(`/doctors/${doctorId}`, updateData);

      showToast('Doctor updated successfully!', 'info');
      
      // Close modals and refresh
      setIsDetailsModalOpen(false);
      setIsEditMode(false);
      setEditFormData({});
      fetchDoctors();

    } catch (error) {
      console.error('Error updating doctor:', error);
      
      let errorMessage = 'Failed to update doctor';
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete doctor
  const handleDeleteDoctor = async (doctorId) => {
    const confirmDelete = () => {
      performDelete(doctorId);
      hideConfirmDialog();
    };

    showConfirmDialog(
      'Delete Doctor',
      'Are you sure you want to delete this doctor? This action cannot be undone.',
      confirmDelete
    );
  };

  const performDelete = async (doctorId) => {
    try {
      setLoading(true);
      
      await del(`/doctors/${doctorId}`);

      showToast('Doctor deleted successfully!', 'error');
      
      // Close modal and refresh
      setIsDetailsModalOpen(false);
      fetchDoctors();

    } catch (error) {
      console.error('Error deleting doctor:', error);
      
      let errorMessage = 'Failed to delete doctor';
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const filteredDoctors = doctors.filter(doctor => {
    const searchTerm = search.toLowerCase();
    const doctorName = doctor.user ? 
      `${doctor.user.firstName} ${doctor.user.lastName}`.toLowerCase() : 
      '';
    const specialization = doctor.specialization ? doctor.specialization.toLowerCase() : '';
    
    return doctorName.includes(searchTerm) || specialization.includes(searchTerm);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <style jsx>{styles}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Doctor Management</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Doctor
            </button>
            <span className="text-sm text-gray-500">{today}</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search doctors by name or specialization"
            className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      <span className="ml-3 text-gray-500">Loading doctors from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4m0 0V24a6 6 0 1112 0v12m-6-16a4 4 0 100-8 4 4 0 000 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="mb-2">No doctors found</div>
                      <div className="text-sm text-gray-400 mb-4">
                        {doctors.length === 0 ? 'There are no doctors in the database or server may be unavailable.' : 'No doctors match your search criteria.'}
                      </div>
                      {doctors.length === 0 && (
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Retry Loading
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => (
                  <tr key={doctor._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {doctor.firstName} {doctor.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctor.specialization}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctor.experience || 'N/A'} years
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctor.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Doctor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Doctor</h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    specialization: '',
                    gender: '',
                    experience: '',
                    phone: '',
                    email: '',
                    workingHours: '',
                    address: ''
                  });
                  setFormErrors({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddDoctor} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter first name"
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter last name"
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Specialization and Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization *
                  </label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.specialization ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select specialization</option>
                    {specializationOptions.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  {formErrors.specialization && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.specialization}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.gender ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.gender && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.gender}</p>
                  )}
                </div>
              </div>

              {/* Experience and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (years) *
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.experience ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter years of experience"
                  />
                  {formErrors.experience && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.experience}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>

              {/* Working Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Hours *
                </label>
                <input
                  type="text"
                  name="workingHours"
                  value={formData.workingHours}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.workingHours ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Mon-Fri: 9AM-5PM"
                />
                {formErrors.workingHours && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.workingHours}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter full address"
                />
                {formErrors.address && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.address}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormData({
                      firstName: '',
                      lastName: '',
                      specialization: '',
                      gender: '',
                      experience: '',
                      phone: '',
                      email: '',
                      workingHours: '',
                      address: ''
                    });
                    setFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Details Modal */}
      {isDetailsModalOpen && selectedDoctor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Doctor Details</h3>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">
                    Dr. {selectedDoctor.user ? `${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}` : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor ID</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.doctorId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialization</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.specialization}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Experience</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.experience} years</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.user?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rating</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.rating}/5 ({selectedDoctor.totalReviews} reviews)</p>
                </div>
              </div>
              
              {selectedDoctor.hospital?.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-sm text-gray-900">{selectedDoctor.hospital.address}</p>
                </div>
              )}
              
              {selectedDoctor.availability && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Availability</label>
                  <p className="text-sm text-gray-900">
                    {selectedDoctor.availability.days?.join(', ') || 'Not set'}
                  </p>
                  {selectedDoctor.availability.timeSlots && selectedDoctor.availability.timeSlots.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Time Slots ({selectedDoctor.availability.timeSlots.length})
                        </label>
                        <button
                          onClick={() => setShowTimeSlots(!showTimeSlots)}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {showTimeSlots ? 'Hide' : 'Show'} Slots
                          <svg 
                            className={`w-4 h-4 ml-1 transition-transform ${showTimeSlots ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {showTimeSlots && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                          <div className="grid grid-cols-2 gap-2">
                            {selectedDoctor.availability.timeSlots.map((slot, index) => (
                              <div 
                                key={index} 
                                className="flex items-center justify-between bg-white px-3 py-2 rounded border text-sm"
                              >
                                <span className="font-medium text-gray-700">
                                  {formatTimeTo12Hour(slot.startTime)} - {formatTimeTo12Hour(slot.endTime)}
                                </span>
                                {slot.date && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {new Date(slot.date).toLocaleDateString()}
                                  </span>
                                )}
                                {slot.appointmentId && (
                                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    Booked
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {selectedDoctor.availability.timeSlots.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">No time slots available</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => handleDeleteDoctor(selectedDoctor._id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Doctor
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleEditDoctor(selectedDoctor)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {isEditMode && selectedDoctor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Update Doctor</h3>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setEditFormData({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateDoctor(selectedDoctor._id, editFormData);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    value={editFormData.firstName || ''}
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    value={editFormData.lastName || ''}
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialization *</label>
                  <select
                    value={editFormData.specialization || ''}
                    onChange={(e) => setEditFormData({...editFormData, specialization: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Specialization</option>
                    {specializationOptions.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Experience (years) *</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editFormData.experience || ''}
                    onChange={(e) => setEditFormData({...editFormData, experience: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone *</label>
                  <input
                    type="tel"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Availability Days */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                  <div className="grid grid-cols-7 gap-2">
                    {availableDays.map(day => (
                      <label key={day} className="flex flex-col items-center">
                        <input
                          type="checkbox"
                          checked={editFormData.availabilityDays?.includes(day) || false}
                          onChange={() => toggleAvailabilityDay(day)}
                          className="mb-1"
                        />
                        <span className="text-xs text-center">{day.substring(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Slots Management */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Time Slots ({editFormData.timeSlots?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={addTimeSlot}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      + Add Slot
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editFormData.timeSlots?.map((slot, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                        <div className="flex-1">
                          <label className="text-xs text-gray-600">Start Time</label>
                          <select
                            value={slot.startTime || '09:00'}
                            onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            {timeOptions.map(time => (
                              <option key={time.value} value={time.value}>{time.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-600">End Time</label>
                          <select
                            value={slot.endTime || '10:00'}
                            onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            {timeOptions.map(time => (
                              <option key={time.value} value={time.value}>{time.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Remove time slot"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {(!editFormData.timeSlots || editFormData.timeSlots.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">No time slots added. Click "Add Slot" to add working hours.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editFormData.isActive || false}
                      onChange={(e) => setEditFormData({...editFormData, isActive: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Status</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    setEditFormData({});
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}