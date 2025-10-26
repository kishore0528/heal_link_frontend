'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toTitleCase } from '../../../utils/text';
import usePatient from '../../../hooks/usePatient';
import { patientApi } from '../../../utils/api';

export default function ViewProfile() {
  const router = useRouter();
  const { patient, loading, error } = usePatient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/v1", "");
  


  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    if (patient) {
      try {
        setProfileData({
          firstName: patient.user?.firstName || '',
          lastName: patient.user?.lastName || '',
          email: patient.user?.email || '', 
          phone: patient.user?.phone || '',
          dateOfBirth: patient.dateOfBirth ? (() => {
            try {
              return new Date(patient.dateOfBirth).toISOString().split('T')[0];
            } catch (e) {
              console.error('Date parsing error:', e);
              return '';
            }
          })() : '',
          gender: patient.gender || '',
          bloodType: patient.bloodType || '',
          height: patient.height?.value || patient.height || '',
          weight: patient.weight?.value || patient.weight || '',
          address: patient.address?.street || '',
          city: patient.address?.city || '',
          state: patient.address?.state || '',
          zipCode: patient.address?.zipCode || '',
          emergencyContactName: patient.emergencyContact?.name || '',
          emergencyContactPhone: patient.emergencyContact?.phone || '',
          emergencyContactRelationship: patient.emergencyContact?.relationship || '',
          emergencyContactEmail: patient.emergencyContact?.email || '',
          allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : (patient.allergies || ''),
          medicalConditions: Array.isArray(patient.medicalConditions) ? patient.medicalConditions.join(', ') : (patient.medicalConditions || ''),
          medications: Array.isArray(patient.medications) ? patient.medications.join(', ') : (patient.medications || ''),
          insuranceProvider: patient.insuranceInfo?.provider || '',
          insurancePolicyNumber: patient.insuranceInfo?.policyNumber || '',
          insuranceGroupNumber: patient.insuranceInfo?.groupNumber || '',
          maritalStatus: patient.maritalStatus || '',
          occupation: patient.occupation || '',
          preferredLanguage: patient.preferredLanguage || '',
          smokingStatus: patient.smokingStatus || '',
          alcoholUse: patient.alcoholUse || ''
        });
      } catch (error) {
        console.error('Error setting profile data:', error);
      }
    }
  }, [patient]);



  const formatDate = (date) => {
    if (!date) return 'Not provided';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date format error';
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      let requestData;
      
      if (profileImage) {
        // Use FormData for file upload
        requestData = new FormData();
        requestData.append('profilePhoto', profileImage);
        requestData.append('firstName', profileData.firstName);
        requestData.append('lastName', profileData.lastName);
        requestData.append('phone', profileData.phone);
        requestData.append('dateOfBirth', profileData.dateOfBirth);
        if (profileData.gender) requestData.append('gender', profileData.gender);
        if (profileData.bloodType) requestData.append('bloodType', profileData.bloodType);
        
        // Handle nested objects as JSON strings
        if (profileData.height) {
          requestData.append('height', JSON.stringify({
            value: Number(profileData.height),
            unit: 'cm'
          }));
        }
        if (profileData.weight) {
          requestData.append('weight', JSON.stringify({
            value: Number(profileData.weight),
            unit: 'kg'
          }));
        }
        
        requestData.append('address', JSON.stringify({
          street: profileData.address,
          city: profileData.city,
          state: profileData.state,
          zipCode: profileData.zipCode
        }));
        
        requestData.append('emergencyContact', JSON.stringify({
          name: profileData.emergencyContactName,
          phone: profileData.emergencyContactPhone,
          relationship: profileData.emergencyContactRelationship,
          email: profileData.emergencyContactEmail
        }));
        
        if (profileData.allergies) {
          requestData.append('allergies', JSON.stringify(profileData.allergies.split(',').map(item => item.trim()).filter(item => item)));
        }
        if (profileData.medicalConditions) {
          requestData.append('medicalConditions', JSON.stringify(profileData.medicalConditions.split(',').map(item => item.trim()).filter(item => item)));
        }
        if (profileData.medications) {
          requestData.append('medications', JSON.stringify(profileData.medications.split(',').map(item => item.trim()).filter(item => item)));
        }
        
        requestData.append('insuranceInfo', JSON.stringify({
          provider: profileData.insuranceProvider,
          policyNumber: profileData.insurancePolicyNumber,
          groupNumber: profileData.insuranceGroupNumber
        }));
        
        if (profileData.maritalStatus) requestData.append('maritalStatus', profileData.maritalStatus);
        if (profileData.occupation) requestData.append('occupation', profileData.occupation);
        if (profileData.preferredLanguage) requestData.append('preferredLanguage', profileData.preferredLanguage);
        if (profileData.smokingStatus) requestData.append('smokingStatus', profileData.smokingStatus);
        if (profileData.alcoholUse) requestData.append('alcoholUse', profileData.alcoholUse);
      } else {
        // Use JSON for regular updates
        requestData = {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          dateOfBirth: profileData.dateOfBirth,
          gender: profileData.gender || undefined,
          bloodType: profileData.bloodType || undefined,
          height: {
            value: profileData.height ? Number(profileData.height) : null,
            unit: 'cm'
          },
          weight: {
            value: profileData.weight ? Number(profileData.weight) : null,
            unit: 'kg'
          },
          address: {
            street: profileData.address,
            city: profileData.city,
            state: profileData.state,
            zipCode: profileData.zipCode
          },
          emergencyContact: {
            name: profileData.emergencyContactName,
            phone: profileData.emergencyContactPhone,
            relationship: profileData.emergencyContactRelationship,
            email: profileData.emergencyContactEmail
          },
          allergies: profileData.allergies ? profileData.allergies.split(',').map(item => item.trim()).filter(item => item) : [],
          medicalConditions: profileData.medicalConditions ? profileData.medicalConditions.split(',').map(item => item.trim()).filter(item => item) : [],
          medications: profileData.medications ? profileData.medications.split(',').map(item => item.trim()).filter(item => item) : [],
          insuranceInfo: {
            provider: profileData.insuranceProvider,
            policyNumber: profileData.insurancePolicyNumber,
            groupNumber: profileData.insuranceGroupNumber
          },
          maritalStatus: profileData.maritalStatus || undefined,
          occupation: profileData.occupation,
          preferredLanguage: profileData.preferredLanguage,
          smokingStatus: profileData.smokingStatus || undefined,
          alcoholUse: profileData.alcoholUse || undefined
        };
      }

      console.log('Sending update data:', requestData instanceof FormData ? 'FormData with file' : requestData);
      const response = await patientApi.updateMyProfile(requestData);
      console.log('Update response:', response);
      
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully! Changes have been saved to the database.');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 5000);
      
      // Refresh the patient data without full page reload  
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update profile. Please try again.';
      setSuccessMessage(`Error: ${errorMessage}`);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 5000);
    } finally {
      setIsSaving(false);
    }
  };



  const handleCancelEdit = () => {
    setIsEditing(false);
    setImagePreview(null);
    setProfileImage(null);
    if (patient) {
      setProfileData({
        firstName: patient.user?.firstName || '',
        lastName: patient.user?.lastName || '',
        email: patient.user?.email || '', 
        phone: patient.user?.phone || '',
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
        gender: patient.gender || '',
        bloodType: patient.bloodType || '',
        height: patient.height?.value || patient.height || '',
        weight: patient.weight?.value || patient.weight || '',
        address: patient.address?.street || '',
        city: patient.address?.city || '',
        state: patient.address?.state || '',
        zipCode: patient.address?.zipCode || '',
        emergencyContactName: patient.emergencyContact?.name || '',
        emergencyContactPhone: patient.emergencyContact?.phone || '',
        emergencyContactRelationship: patient.emergencyContact?.relationship || '',
        emergencyContactEmail: patient.emergencyContact?.email || '',
        allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : (patient.allergies || ''),
        medicalConditions: Array.isArray(patient.medicalConditions) ? patient.medicalConditions.join(', ') : (patient.medicalConditions || ''),
        medications: Array.isArray(patient.medications) ? patient.medications.join(', ') : (patient.medications || ''),
        insuranceProvider: patient.insuranceInfo?.provider || '',
        insurancePolicyNumber: patient.insuranceInfo?.policyNumber || '',
        insuranceGroupNumber: patient.insuranceInfo?.groupNumber || '',
        maritalStatus: patient.maritalStatus || '',
        occupation: patient.occupation || '',
        preferredLanguage: patient.preferredLanguage || '',
        smokingStatus: patient.smokingStatus || '',
        alcoholUse: patient.alcoholUse || ''
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
        <p className="text-gray-600 mb-4">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-4"
        >
          Retry
        </button>
        <button 
          onClick={() => router.push('/patient/dashboard')} 
          className="text-blue-600 hover:text-blue-800"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
        <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-4"
        >
          Retry
        </button>
        <button 
          onClick={() => router.push('/patient/dashboard')} 
          className="text-blue-600 hover:text-blue-800"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {showSuccessAlert && (
        <div className={`${
          successMessage.startsWith('Error:') 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-green-50 border border-green-200 text-green-800'
        } px-4 py-3 rounded-lg`}>
          <div className="flex items-center">
            {successMessage.startsWith('Error:') ? (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {successMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-400 to-pink-300 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              {/* Profile Image with Default Avatar */}
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold mr-6 overflow-hidden ring-4 ring-white ring-opacity-50 shadow-lg">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : patient?.user?.profilePicture ? (
                  <img 
                    src={`${API_BASE}/${patient.user.profilePicture}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {/* Default placeholder - shown when no image or on image error */}
                <div 
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white to-blue-100 text-blue-600"
                  style={{ display: (imagePreview || patient?.user?.profilePicture) ? 'none' : 'flex' }}
                >
                  {patient?.user ? (
                    `${patient.user.firstName.charAt(0)}${patient.user.lastName.charAt(0)}`
                  ) : (
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 bg-white hover:bg-blue-50 text-blue-600 p-2 rounded-full cursor-pointer shadow-lg border-2 border-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {patient?.user ? (
                  `${toTitleCase(patient.user.firstName)} ${toTitleCase(patient.user.lastName)}`
                ) : (
                  'Patient Profile'
                )}
              </h1>
              <div className="flex items-center space-x-4 text-blue-100">
                <span>Patient ID: {patient?.patientId || 'N/A'}</span>
                <span>{patient?.user?.email}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-lg transition-all duration-200 flex items-center text-white shadow-lg font-medium border-2 border-orange-400 hover:border-orange-500"
              >
                <svg className="w-4 h-4 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="bg-red-500 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg transition-colors flex items-center text-white"
                >
                  <svg className="w-4 h-4 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-green-500 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center text-white"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          </div>
          <div className="p-6 space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={profileData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                    <select
                      value={profileData.bloodType}
                      onChange={(e) => handleInputChange('bloodType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Blood Type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Full Name:</span>
                  <span className="text-gray-900">
                    {patient?.user ? `${toTitleCase(patient.user.firstName)} ${toTitleCase(patient.user.lastName)}` : 'Not provided'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{patient?.user?.email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900">{patient?.user?.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date of Birth:</span>
                  <span className="text-gray-900">{formatDate(patient?.dateOfBirth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="text-gray-900">{toTitleCase(patient?.gender) || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blood Type:</span>
                  <span className="text-gray-900">{patient?.bloodType || 'Not provided'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
          </div>
          <div className="p-6 space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={profileData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={profileData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                  <textarea
                    value={profileData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    placeholder="Separate multiple allergies with commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
                  <textarea
                    value={profileData.medicalConditions}
                    onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
                    placeholder="Separate multiple conditions with commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                  <textarea
                    value={profileData.medications}
                    onChange={(e) => handleInputChange('medications', e.target.value)}
                    placeholder="Separate multiple medications with commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Smoking Status</label>
                    <select
                      value={profileData.smokingStatus}
                      onChange={(e) => handleInputChange('smokingStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Status</option>
                      <option value="Never">Never</option>
                      <option value="Former">Former</option>
                      <option value="Current">Current</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alcohol Use</label>
                    <select
                      value={profileData.alcoholUse}
                      onChange={(e) => handleInputChange('alcoholUse', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Usage</option>
                      <option value="Never">Never</option>
                      <option value="Occasionally">Occasionally</option>
                      <option value="Regularly">Regularly</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Height:</span>
                  <span className="text-gray-900">{patient?.height?.value ? `${patient.height.value} ${patient.height.unit || 'cm'}` : 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span className="text-gray-900">{patient?.weight?.value ? `${patient.weight.value} ${patient.weight.unit || 'kg'}` : 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Allergies:</span>
                  <span className="text-gray-900">{
                    Array.isArray(patient?.allergies) 
                      ? patient.allergies.join(', ') || 'None' 
                      : patient?.allergies || 'None'
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medical Conditions:</span>
                  <span className="text-gray-900">{
                    Array.isArray(patient?.medicalConditions) 
                      ? patient.medicalConditions.join(', ') || 'None' 
                      : patient?.medicalConditions || 'None'
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Medications:</span>
                  <span className="text-gray-900">{
                    Array.isArray(patient?.medications) 
                      ? patient.medications.join(', ') || 'None' 
                      : patient?.medications || 'None'
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Smoking Status:</span>
                  <span className="text-gray-900">{patient?.smokingStatus || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Alcohol Use:</span>
                  <span className="text-gray-900">{patient?.alcoholUse || 'Not provided'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contact & Address */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emergency Contact */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
          </div>
          <div className="p-6 space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={profileData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={profileData.emergencyContactPhone}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={profileData.emergencyContactRelationship}
                    onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={profileData.emergencyContactEmail}
                    onChange={(e) => handleInputChange('emergencyContactEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="text-gray-900">{patient?.emergencyContact?.name || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900">{patient?.emergencyContact?.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Relationship:</span>
                  <span className="text-gray-900">{patient?.emergencyContact?.relationship || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{patient?.emergencyContact?.email || 'Not provided'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
          </div>
          <div className="p-6 space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={profileData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={profileData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="text-gray-900">{patient?.address?.street || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">City:</span>
                  <span className="text-gray-900">{patient?.address?.city || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">State:</span>
                  <span className="text-gray-900">{patient?.address?.state || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ZIP Code:</span>
                  <span className="text-gray-900">{patient?.address?.zipCode || 'Not provided'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Book Appointment */}
            <button
              onClick={() => router.push('/patient/appointments')}
              className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Appointments</span>
            </button>

            {/* Medications */}
            <button
              onClick={() => router.push('/patient/medications')}
              className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Medications</span>
            </button>

            {/* Medical Reports */}
            <button
              onClick={() => router.push('/patient/reports')}
              className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-purple-100 group-hover:bg-purple-200 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Reports</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => router.push('/patient/settings')}
              className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 group-hover:bg-orange-200 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Settings</span>
            </button>
          </div>
        </div>
      </div>


    </div>
  );
}