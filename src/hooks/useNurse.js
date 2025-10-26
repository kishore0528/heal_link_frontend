'use client';

import { useState, useEffect } from 'react';
import { get } from '../utils/api';

const useNurse = () => {
  const [nurse, setNurse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNurse = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }

        const data = await get('/auth/me');
        console.log('Nurse API response:', data); // Debug log
        
        // Check if user is a nurse
        if (data.data && data.data.role === 'nurse') {
          setNurse(data.data);
        } else {
          console.log('User role:', data.data?.role); // Debug log
          setError(`Access denied: Nurse role required. Current role: ${data.data?.role}`);
        }
      } catch (err) {
        console.error('Error fetching nurse data:', err);
        setError('Failed to load nurse data');
      } finally {
        setLoading(false);
      }
    };

    fetchNurse();
  }, []);

  return { nurse, loading, error };
};

export default useNurse;