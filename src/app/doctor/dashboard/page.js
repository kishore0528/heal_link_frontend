'use client';

import { useState, useEffect } from 'react';
import useUser from '../../../hooks/useUser';
import { toTitleCase } from '../../../utils/text';
import { get } from '@/utils/api';
import Link from 'next/link';

export default function DoctorDashboard() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    totalPatients: 0,
    pendingReviews: 0,
    upcomingAppointments: [],
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data } = await get('/doctor/dashboard-data');

        setStats({
          appointmentsToday: data.appointmentsToday,
          totalPatients: data.totalPatients,
          pendingReviews: data.pendingReviews,
          upcomingAppointments: data.upcomingAppointments.map((a) => ({
            id: a._id,
            patientName:
              a.patient?.firstName && a.patient?.lastName
                ? `${a.patient.firstName} ${a.patient.lastName}`
                : 'N/A',
            patientId: a.patient?.patientInfo?.patientId || 'N/A', // Added patientId
            date: new Date(a.date).toISOString().split('T')[0], // YYYY-MM-DD
            time: new Date(a.date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            type: a.reason, // Use appointment reason
            status: a.status,
          })),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, Dr. {toTitleCase(user?.firstName)}{' '}
            {toTitleCase(user?.lastName)}!
          </h1>
          <p className="text-sm text-gray-500">
            Here is a summary of your activities.
          </p>
        </div>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {isLoading || userLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Your Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="text-lg font-bold text-gray-900">
                  {toTitleCase(user?.firstName)} {toTitleCase(user?.lastName)}
                </p>
              </div>
            </div>
          </div>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-500">
                    Today&apos;s Appointments
                  </h2>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.appointmentsToday}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-500">
                    Total Patients
                  </h2>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalPatients}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-500">
                    Pending Reviews
                  </h2>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.pendingReviews}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900">
                Upcoming Appointments
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.upcomingAppointments.length > 0 ? (
                stats.upcomingAppointments.map((appointment, index) => (
                  <div
                    key={index}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
                        {appointment.patientName
                          .split(' ')
                          .map((name) => name[0])
                          .join('')}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          {appointment.patientName}
                        </h4>
                        <p className="text-sm text-gray-500">
                          ID: {appointment.patientId}
                        </p>
                        <p className="text-sm text-gray-500">
                          {appointment.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex flex-col text-sm text-gray-500">
                        <span>{appointment.date}</span>
                        <span>{appointment.time}</span>
                      </div>
                      <button className="ml-6 text-blue-600 hover:text-blue-800">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-4 text-center text-gray-500">
                  No upcoming appointments
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Link
                href="/doctor/dashboard/appointments"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View all appointments
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/doctor/appointments/new"
                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150 flex flex-col items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span className="mt-2 text-sm font-medium text-gray-700">
                  Book Appointment
                </span>
              </Link>

              <Link
                href="/doctor/bulk-swap"
                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150 flex flex-col items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="mt-2 text-sm font-medium text-gray-700">
                  Bulk Swap
                </span>
              </Link>

              <Link
                href="/doctor/appointments"
                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150 flex flex-col items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="mt-2 text-sm font-medium text-gray-700">
                  Schedule
                </span>
              </Link>
              <Link
                href="/doctor/feedback"
                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150 flex flex-col items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="mt-2 text-sm font-medium text-gray-700">
                  Feedback
                </span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
