'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { get, put } from '@/utils/api';
import useUser from '../../../../../../hooks/useUser';

export default function EditAppointment() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user } = useUser();
  const [formData, setFormData] = useState({
    patient: '',
    date: '',
    status: 'pending',
  });
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const data = await get(`/api/v1/appointments/${id}`);
        if (data.success) {
          const appointment = data.data;
          setFormData({
            patient: appointment.patient._id,
            date: new Date(appointment.date).toISOString().slice(0, 16),
            status: appointment.status,
          });
        } else {
          console.error('Failed to fetch appointment');
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
      } finally {
        setIsFetching(false);
      }
    };

    const fetchPatients = async () => {
      try {
        const data = await get('/api/v1/patients');
        if (data.success) {
          setPatients(data.data || []);
        } else {
          console.error('Failed to fetch patients');
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };

    if (id) {
      fetchAppointment();
    }
    fetchPatients();
  }, [id]);

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
      const response = await put(`/api/v1/appointments/${id}`, {
        ...formData,
        doctor: user._id,
      });

      if (response.success) {
        alert('Appointment updated successfully!');
        router.push('/doctor/dashboard/appointments');
      } else {
        alert(response.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('An error occurred while updating the appointment.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Appointment</h1>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
              Patient
            </label>
            <select
              id="patient"
              name="patient"
              value={formData.patient}
              onChange={handleInputChange}
              required
              className="w-full pl-3 pr-8 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="" disabled>Select a patient</option>
              {patients.map((p) => (
                <option key={p._id} value={p.user._id}>
                  {p.user.firstName} {p.user.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date and Time
            </label>
            <input
              id="date"
              name="date"
              type="datetime-local"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full pl-3 pr-8 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
            >
              {isLoading ? 'Updating...' : 'Update Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
