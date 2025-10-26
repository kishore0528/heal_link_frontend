
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { get } from '@/utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    totalFeedback: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [doctorsData, patientsData, appointmentsData, feedbackData] = await Promise.all([
        get('/doctors'),
        get('/patients/admin/patients'),
        get('/appointments'),
        get('/feedback')
      ]);

      // Calculate today's appointments if data is available
      let todayAppointments = 0;
      if (appointmentsData?.data && Array.isArray(appointmentsData.data)) {
        const today = new Date().toISOString().split('T')[0];
        todayAppointments = appointmentsData.data.filter(apt => 
          apt.date && apt.date.startsWith(today)
        ).length;
      }

      // Use real data from backend API (with proper data structure)
      const stats = {
        totalDoctors: doctorsData?.count || doctorsData?.data?.length || 0,
        totalPatients: patientsData?.count || patientsData?.data?.length || 0,
        totalAppointments: appointmentsData?.count || appointmentsData?.data?.length || 0,
        todayAppointments,
        totalFeedback: feedbackData?.count || feedbackData?.data?.length || 0
      };

      console.log('Final stats:', stats);
      setStats(stats);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      let errorMessage = 'Unable to connect to backend server.';
      
      if (error.message.includes('fetch')) {
        errorMessage = 'Backend server is not responding. Please check if it\\\'s running on port 5000.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error: Backend server configuration issue.';
      }
      
      setError(errorMessage);
      
      // Only use demo data as last resort
      setStats({
        totalDoctors: 0,
        totalPatients: 0,
        totalAppointments: 0,
        todayAppointments: 0,
        totalFeedback: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardStats}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Healthcare Management System Overview</p>
          
          {/* Show warning if using demo data */}
          {error && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-amber-600 mr-2">⚠️</div>
                <p className="text-sm text-amber-800">{error}</p>
              </div>
            </div>
          )}
          
          <button 
            onClick={fetchDashboardStats}
            className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Professional 4-Box Grid - Equal Sizes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Doctors Box */}
          <Link href="/admin/doctors" className="group">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 h-48 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalDoctors}</div>
              <div className="text-lg font-semibold text-gray-800 mb-1">Doctors</div>
              <div className="text-sm text-blue-700">Manage all doctors</div>
            </div>
          </Link>

          {/* Patients Box */}
          <Link href="/admin/patients" className="group">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6 h-48 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63c-.37-1.11-1.56-1.87-2.87-1.37L16 12l-1.99-2.03c-.47-.6-1.21-.97-2.01-.97h-1.09c-1.3 0-2.42.84-2.87 2.37L1.5 16H4v6h3v-6h2v6h3v-6h2v6h3z"/>
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalPatients}</div>
              <div className="text-lg font-semibold text-gray-800 mb-1">Patients</div>
              <div className="text-sm text-green-700">View patient records</div>
            </div>
          </Link>

          {/* Appointments Box */}
          <Link href="/admin/appointments" className="group">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 h-48 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalAppointments}</div>
              <div className="text-lg font-semibold text-gray-800 mb-1">Appointments</div>
              <div className="text-sm text-purple-700">Today: {stats.todayAppointments}</div>
            </div>
          </Link>

          {/* Feedback Box */}
          <Link href="/admin/feedback" className="group">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 h-48 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-105">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalFeedback}</div>
              <div className="text-lg font-semibold text-gray-800 mb-1">Feedback</div>
              <div className="text-sm text-orange-700">Review feedback</div>
            </div>
          </Link>
        </div>

        {/* Quick Stats Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalDoctors}</div>
              <div className="text-sm text-gray-600">Total Doctors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.totalPatients}</div>
              <div className="text-sm text-gray-600">Total Patients</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.todayAppointments}</div>
              <div className="text-sm text-gray-600">Today's Appointments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.totalFeedback}</div>
              <div className="text-sm text-gray-600">Total Feedback</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
