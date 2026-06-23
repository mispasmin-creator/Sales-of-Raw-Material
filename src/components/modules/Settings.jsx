import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UserPlus,
  Users
} from 'lucide-react';
import { useApp, ROLES } from '../../context/AppContext';
import db from '../../lib/db';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

export const SettingsModule = () => {
  const { 
    currentUser,
    usersList,
    fetchUsersList,
    addNotification 
  } = useApp();

  // User management config values

  // User Management State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formUser, setFormUser] = useState({ user_name: '', password: '', role: 'Sales', firm_name: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [firms, setFirms] = useState([]);

  useEffect(() => {
    const loadFirms = async () => {
      try {
        const firmsList = await db.getFirms();
        setFirms(firmsList);
      } catch (e) {
        console.error("Failed to load firms in Settings:", e);
      }
    };
    loadFirms();
  }, []);

  const togglePasswordVisibility = (username) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormUser({ user_name: '', password: '', role: 'Sales', firm_name: '' });
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormUser({ user_name: user.user_name, password: user.password, role: user.role, firm_name: user.firm_name || '' });
    setModalError('');
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalError('');
    
    const uName = formUser.user_name.trim();
    const uPass = formUser.password.trim();
    
    if (!uName) {
      setModalError('Username is required.');
      return;
    }
    if (!uPass) {
      setModalError('Password is required.');
      return;
    }

    setSubmitting(true);
    try {
      await db.saveUser({
        user_name: uName,
        password: uPass,
        role: formUser.role,
        firm_name: formUser.firm_name
      });

      addNotification(
        editingUser ? 'User Updated' : 'User Created', 
        `Successfully registered account for ${uName}.`, 
        'success'
      );
      
      await fetchUsersList();
      setShowModal(false);
    } catch (err) {
      setModalError(err.message || 'Failed to save user profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userNameToDelete) => {
    // Restrictions checks
    if (currentUser.user_name.toLowerCase() === userNameToDelete.toLowerCase()) {
      alert("Aap abhi isi profile se logged-in hain. Please switches active role simulator pehle, fir is user ko delete karein.");
      return;
    }

    const admins = usersList.filter(u => u.role === ROLES.ADMIN);
    const userObj = usersList.find(u => u.user_name.toLowerCase() === userNameToDelete.toLowerCase());
    
    if (userObj?.role === ROLES.ADMIN && admins.length <= 1) {
      alert("Aap application me aakhri Admin profile delete nahi kar sakte.");
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${userNameToDelete}"?`)) return;

    try {
      await db.deleteUser(userNameToDelete);
      addNotification('User Deleted', `Removed account of ${userNameToDelete}.`, 'info');
      await fetchUsersList();
    } catch (err) {
      alert(err.message || 'Error deleting user.');
    }
  };

  // Configuration handlers removed

  // Helper to color codes role badges
  const getRoleBadgeClasses = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800';
      case ROLES.SALES:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800';
      case ROLES.LOGISTICS:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800';
      case ROLES.ACCOUNTS:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-navy-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-600" />
            User Management & Access Controls
          </h2>
          <p className="text-xs text-slate-navy-500 font-medium">
            Manage system users, login credentials, and configure active database synchronization channels.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="font-semibold gap-1.5 self-start">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Main panel - Users list table */}
      <div className="glass-card rounded-xl border p-5 space-y-4">
        <h3 className="text-sm font-bold font-heading text-slate-navy-800 lite:text-slate-200 flex items-center gap-1.5 pb-2 border-b lite:border-slate-navy-800">
          Registered Accounts ({usersList.length})
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-navy-800 text-slate-navy-500 font-bold text-xs uppercase tracking-wider">
                <th className="pb-3 pl-2 w-10">Avatar</th>
                <th className="pb-3">User Name</th>
                <th className="pb-3">Role Designation</th>
                <th className="pb-3">Associated Firm</th>
                <th className="pb-3">Password Credentials</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 lite:divide-slate-navy-850 text-sm text-slate-navy-650 dark:text-slate-navy-300">
              {usersList.map((user) => {
                const isCurrentUser = currentUser.user_name.toLowerCase() === user.user_name.toLowerCase();
                return (
                  <tr key={user.user_name} className="hover:bg-slate-50/50 dark:hover:bg-slate-navy-900/30 transition-colors">
                    <td className="py-4 pl-2">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border uppercase",
                        isCurrentUser ? "ring-2 ring-brand-500" : "",
                        getRoleBadgeClasses(user.role)
                      )}>
                        {user.user_name[0]}
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-slate-navy-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {user.user_name}
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-300 px-1.5 py-0.5 rounded-full uppercase">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold",
                        getRoleBadgeClasses(user.role)
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-slate-navy-700 dark:text-slate-navy-300">
                      {user.firm_name || '-'}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs select-all">
                          {visiblePasswords[user.user_name] ? user.password : '••••••••'}
                        </span>
                        <button 
                          onClick={() => togglePasswordVisibility(user.user_name)} 
                          className="text-slate-navy-400 hover:text-slate-navy-600 dark:hover:text-slate-navy-200 transition-colors"
                        >
                          {visiblePasswords[user.user_name] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => handleOpenEditModal(user)} 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-navy-800 text-slate-navy-500 hover:text-brand-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteUser(user.user_name)} 
                          size="icon" 
                          variant="ghost" 
                          disabled={isCurrentUser}
                          className={cn(
                            "h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-navy-500 hover:text-red-500",
                            isCurrentUser && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usersList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-navy-400 font-medium">
                    No users loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Register/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-xl max-w-md w-full animate-scale-in dark:bg-slate-navy-900 dark:border-slate-navy-800 space-y-4">
            
            <div className="flex items-center gap-2 border-b pb-3 dark:border-slate-navy-800">
              <UserPlus className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-bold font-heading text-slate-navy-900 dark:text-white">
                {editingUser ? 'Edit User Account' : 'Register New User'}
              </h3>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-150 text-xs flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <Input
                label="User Name"
                value={formUser.user_name}
                disabled={!!editingUser}
                onChange={(e) => setFormUser({ ...formUser, user_name: e.target.value })}
                placeholder="e.g. sales_officer"
                required
              />

              <Input
                label="Password Credentials"
                value={formUser.password}
                onChange={(e) => setFormUser({ ...formUser, password: e.target.value })}
                placeholder="Minimum 3 characters"
                type="text"
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-navy-600 dark:text-slate-navy-400">
                  Role
                </label>
                <select
                  value={formUser.role}
                  onChange={(e) => setFormUser({ ...formUser, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-navy-200 bg-white px-3 py-2 text-sm font-semibold text-slate-navy-700 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-300"
                >
                  <option value={ROLES.ADMIN}>Admin (All actions)</option>
                  <option value={ROLES.SALES}>Sales (Orders)</option>
                  <option value={ROLES.LOGISTICS}>Logistics</option>
                  <option value={ROLES.ACCOUNTS}>Accounts</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-navy-600 dark:text-slate-navy-400">
                  Firm Name
                </label>
                <select
                  value={formUser.firm_name}
                  onChange={(e) => setFormUser({ ...formUser, firm_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-navy-200 bg-white px-3 py-2 text-sm font-semibold text-slate-navy-700 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-navy-800 dark:bg-slate-navy-900 dark:text-slate-navy-300"
                >
                  <option value="">-- No Firm Assignment --</option>
                  {firms.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t dark:border-slate-navy-800">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowModal(false)}
                  className="font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  loading={submitting}
                  className="font-semibold"
                >
                  Save Profile
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
export default SettingsModule;
