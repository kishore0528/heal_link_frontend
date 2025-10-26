'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPrescription() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    patient: '',
    medication: '',
    dosage: '',
    frequency: '',
    notes: '',
  });
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPatients, setIsFetchingPatients] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/api/v1/patients', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setPatients(data.data || []);
        } else {
          console.error('Failed to fetch patients');
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setIsFetchingPatients(false);
      }
    };

    fetchPatients();
  }, [router]);

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
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:5000/api/v1/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Prescription created successfully!');
        router.push('/doctor/dashboard/prescriptions');
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('An error occurred while creating the prescription.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Prescription</h1>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
              Patient
            </label>
            {isFetchingPatients ? (
              <p>Loading patients...</p>
            ) : (
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
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="medication" className="block text-sm font-medium text-gray-700 mb-2">
              Medication
            </label>
            <input
              id="medication"
              name="medication"
              type="text"
              value={formData.medication}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-2">
              Dosage
            </label>
            <input
              id="dosage"
              name="dosage"
              type="text"
              value={formData.dosage}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <input
              id="frequency"
              name="frequency"
              type="text"
              value={formData.frequency}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading || isFetchingPatients}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
            >
              {isLoading ? 'Creating...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
