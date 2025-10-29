import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'requester' | 'recommender' | 'admin';

export const useUserRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      setRoles(data?.map(r => r.role as UserRole) || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user]);

  const hasRole = (role: UserRole) => roles.includes(role);

  const addRole = async (role: UserRole) => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('assign_user_role', {
        _user_id: user.id,
        _role: role
      });

      if (error) throw error;
      await fetchRoles();
      return true;
    } catch (error) {
      console.error('Error adding role:', error);
      return false;
    }
  };

  return {
    roles,
    loading,
    hasRole,
    addRole,
    refetch: fetchRoles
  };
};
