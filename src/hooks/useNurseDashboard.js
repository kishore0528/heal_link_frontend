'use client';

import useSWR from 'swr';
import { get } from '../utils/api';

const useNurseDashboard = (refreshKey = 0) => {
    const { data, error, mutate } = useSWR(['/nurse/dashboard-data', refreshKey], ([url]) => get(url));

    return {
        data,
        isLoading: !error && !data,
        isError: error,
        refresh: mutate
    };
};

export default useNurseDashboard;
