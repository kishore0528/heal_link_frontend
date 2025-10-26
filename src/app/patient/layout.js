'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toTitleCase } from '../../utils/text';
import usePatient from '../../hooks/usePatient';

export default function PatientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { patient, loading: patientLoading, error: patientError } = usePatient();
  const [loading, setLoading] = useState(true);

  // Refs for click-outside functionality
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Sample notifications - in a real app, these would come from an API
  const notifications = [
    { id: 1, message: 'Your appointment with Dr. Smith is confirmed', time: '10 mins ago', read: false },
    { id: 2, message: 'New lab report available', time: '1 hour ago', read: false },
    { id: 3, message: 'Reminder: Take your medication', time: '3 hours ago', read: true },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'patient') {
      router.push('/login');
      return;
    }
    
    setLoading(false);
    
    // Check if mobile on initial load
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    setProfileOpen(false);
  };

  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
    setNotificationsOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/patient/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Appointments', path: '/patient/appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Book Appointment', path: '/patient/dashboard/book', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
    { name: 'Feedback', path: '/patient/feedback', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { name: 'Reports', path: '/patient/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Medications', path: '/patient/medications', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Fixed */}
      <nav className="bg-white shadow-md border-b border-gray-200 fixed top-0 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Logo */}
                            {/* Logo */}
              <Link href="/patient/dashboard" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-xl font-bold sm:text-2xl bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Heal Link
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={toggleNotifications}
                  className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  aria-label="Notifications"
                >
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
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-sm">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                    <div className="p-4">
                      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Notifications
                        </h3>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <button
                            onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}                            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 mb-2 rounded-md ${
                                notification.read ? "bg-white" : "bg-blue-50"
                              } hover:bg-gray-50 transition-colors duration-150`}
                            >
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center">
                                <svg
                                  className="h-3 w-3 mr-1"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {notification.time}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <svg
                              className="mx-auto h-10 w-10 text-gray-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">
                              No notifications
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {notifications.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                          <Link 
                            href="/patient/notifications" 
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            View all notifications
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative ml-3" ref={profileRef}>
                <button
                  onClick={toggleProfile}
                  className="flex items-center space-x-2 max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1"
                >
                  <span className="sr-only">Open user menu</span>
                  {/* Patient Name - visible on larger screens */}
                  <div className="hidden sm:block text-right mr-2">
                    <div className="text-sm font-medium text-gray-700">
                      {patient?.user ? (
                        `${toTitleCase(patient.user.firstName)} ${toTitleCase(patient.user.lastName)}`
                      ) : (
                        'Loading...'
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {patient?.patientId || 'Patient'}
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    {loading ? (
                      <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse"></div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    )}
                  </div>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                    {/* User Info Header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-100 to-purple-100">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg mr-4 shadow-md">
                          {patient?.user ? (
                            `${patient.user.firstName.charAt(0)}${patient.user.lastName.charAt(0)}`
                          ) : (
                            'P'
                          )}
                        </div>
                        <div>
                          {patient?.user ? (
                            <>
                              <p className="text-base font-semibold text-gray-800">
                                {toTitleCase(patient.user.firstName)} {toTitleCase(patient.user.lastName)}
                              </p>
                              <p className="text-sm text-gray-500">{patient.user.email}</p>
                              {patient.patientId && (
                                <p className="text-xs text-purple-600 font-medium">ID: {patient.patientId}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-base font-semibold text-gray-800">Loading...</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        href="/patient/profile"
                        className="flex items-center px-6 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View Profile
                      </Link>
                      
                      <Link
                        href="/patient/settings"
                        className="flex items-center px-6 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        </svg>
                        Settings
                      </Link>
                    </div>
                    
                    {/* Logout Section */}
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-6 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar and Main Content */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 bg-white shadow-md transform transition-transform duration-300 ease-in-out z-10 w-64 pt-20 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="h-full flex flex-col justify-between">
            <nav className="mt-5 px-4 flex-grow">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                      pathname === item.path
                        ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`mr-3 h-5 w-5 transition-colors ${
                        pathname === item.path
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-blue-600"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={item.icon}
                      />
                    </svg>
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
            
            <div className="p-4 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Need help?</h3>
                    <p className="text-xs text-blue-600 mt-1">Contact our support team</p>
                  </div>
                </div>
                <Link href="/patient/support" className="mt-2 block text-center text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-md transition-colors">
                  Get Support
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "md:ml-64" : ""
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
