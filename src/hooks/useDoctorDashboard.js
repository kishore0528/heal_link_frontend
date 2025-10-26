import useSWR from 'swr';
import { get } from '../utils/api';

export default function useDoctorDashboard() {
    const { data, error } = useSWR('/doctor/dashboard-data', get);

    return {
        data,
        isLoading: !error && !data,
        isError: error
    };
}
