import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user?.employee_id) {
      navigate(`/employees/${user.employee_id}`, { replace: true });
    }
  }, [user, loading, navigate]);

  return <LoadingSpinner text="Redirecting to your profile..." size="lg" />;
}
