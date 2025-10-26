import useSWR from 'swr';
import { get } from '../utils/api';

export default function usePatientDashboard(refreshKey = 0) {
    const { data, error, mutate } = useSWR(['/patients/dashboard-data', refreshKey], ([url]) => get(url));

    return {
        data,
        isLoading: !error && !data,
        isError: error,
        refresh: mutate
    };
}
