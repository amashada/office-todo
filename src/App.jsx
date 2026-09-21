import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Clock, AlertTriangle, FileText, Plus, Users, 
  LogOut, Shield, User, Play, Check, FileUp, Trash2, KeyRound, X, Loader2,
  Crown, Activity, ShieldAlert
} from 'lucide-react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

// Initial Super Admin (You)
const INITIAL_SUPER_ADMIN = { 
  name: 'Amashada Navoda', 
  role: 'super_admin', 
  username: 'admin', 
  password: '123' 
};

export default function App() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isUploading, setIsUploading] = useState({});

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('office_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('employee');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('office_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('office_current_user');
    }
  }, [currentUser]);

  // Load Users, Tasks & System Logs
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (userList.length === 0) {
        addDoc(collection(db, 'users'), INITIAL_SUPER_ADMIN);
      } else {
        setUsers(userList);
        // Refresh local current user if role/data updated in DB
        if (currentUser) {
          const updatedSelf = userList.find(u => u.id === currentUser.id);
          if (updatedSelf) setCurrentUser(updatedSelf);
        }
      }
    });

    const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(taskList);
    });

    const unsubscribeLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      logList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(logList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
      unsubscribeLogs();
    };
  }, []);

  // Helper to log system activity
  const logActivity = async (action, details) => {
    try {
      await addDoc(collection(db, 'logs'), {
        userName: currentUser?.name || 'System',
        userRole: currentUser?.role || 'system',
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Log error:", err);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
      logActivity('User Login', `${user.name} (${user.role}) logged in`);
    } else {
      setLoginError('Invalid Username or Password!');
    }
  };

  const handleLogout = () => {
    if (currentUser) logActivity('User Logout', `${currentUser.name} logged out`);
    setCurrentUser(null);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmpName || !newEmpUsername || !newEmpPassword) return;

    if (users.some(u => u.username === newEmpUsername)) {
      alert('Username already exists!');
      return;
    }

    try {
      await addDoc(collection(db, 'users'), {
        name: newEmpName,
        role: newEmpRole,
        username: newEmpUsername,
        password: newEmpPassword
      });

      logActivity('Create User', `Created ${newEmpRole} account for ${newEmpName}`);

      setNewEmpName('');
      setNewEmpUsername('');
      setNewEmpPassword('');
      setNewEmpRole('employee');
      alert(`Account (${newEmpRole.toUpperCase()}) created successfully!`);
    } catch (error) {
      console.error("Error creating user: ", error);
    }
  };

  // Change User Role (Super Admin Only)
  const handleChangeUserRole = async (userId, targetUserName, newRole) => {
    if (userId === currentUser.id) {
      alert("You cannot change your own Super Admin role!");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      logActivity('Role Change', `Changed ${targetUserName}'s role to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  // Delete User Account (Super Admin Only)
  const handleDeleteUser = async (userId, targetUserName) => {
    if (userId === currentUser.id) {
      alert("You cannot delete your own account!");
      return;
    }
    if (window.confirm(`Are you sure you want to delete account: ${targetUserName}?`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        logActivity('Delete User', `Deleted user account: ${targetUserName}`);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle || !assigneeId || !dueDate) return;

    const assignee = users.find(u => u.id === assigneeId);

    try {
      await addDoc(collection(db, 'tasks'), {
        title: taskTitle,
        description: taskDesc,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        dueDate: dueDate,
        status: 'Pending',
        startTime: null,
        endTime: null,
        files: [],
        createdAt: new Date().toISOString()
      });

      logActivity('Create Task', `Assigned task "${taskTitle}" to ${assignee.name}`);

      setTaskTitle('');
      setTaskDesc('');
      setAssigneeId('');
      setDueDate('');
    } catch (error) {
      console.error("Error creating task: ", error);
    }
  };

  // Delete Task (Super Admin Only)
  const handleDeleteTask = async (taskId, title) => {
    if (currentUser.role !== 'super_admin') {
      alert('Only Super Admin has permission to permanently delete tasks!');
      return;
    }

    if (window.confirm(`Permanently delete task "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        logActivity('Delete Task', `Deleted task "${title}"`);
      } catch (error) {
        console.error("Error deleting task: ", error);
      }
    }
  };

  const handleStartTask = async (taskId, title) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const timeStr = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      await updateDoc(taskRef, {
        status: 'In Progress',
        startTime: timeStr
      });
      logActivity('Start Task', `Started task "${title}" at ${timeStr}`);
    } catch (error) {
      console.error("Error starting task: ", error);
    }
  };

  const handleCompleteTask = async (taskId, title) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const timeStr = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      await updateDoc(taskRef, {
        status: 'Completed',
        endTime: timeStr
      });
      logActivity('Complete Task', `Completed task "${title}" at ${timeStr}`);
    } catch (error) {
      console.error("Error completing task: ", error);
    }
  };

  // 🚀 CLOUDINARY FILE UPLOAD
  const handleFileUpload = async (taskId, taskTitle, currentFiles, e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (!uploadedFiles.length) return;

    const CLOUD_NAME = "sb47oizx"; 
    const UPLOAD_PRESET = "my_app_preset"; 

    setIsUploading(prev => ({ ...prev, [taskId]: true }));

    for (let file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('cloud_name', CLOUD_NAME);

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.secure_url) {
          const newFileObj = {
            id: Date.now().toString(),
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            url: data.secure_url
          };

          const taskRef = doc(db, 'tasks', taskId);
          const existingFiles = currentFiles || [];
          await updateDoc(taskRef, {
            files: [...existingFiles, newFileObj]
          });

          logActivity('Upload File', `Uploaded "${file.name}" to task "${taskTitle}"`);
        } else {
          alert('Upload failed. Check Cloudinary Name & Preset!');
        }
      } catch (err) {
        console.error("Upload error:", err);
        alert("Failed to upload file.");
      }
    }

    setIsUploading(prev => ({ ...prev, [taskId]: false }));
  };

  // 🗑️ DELETE FILE FUNCTION
  const handleDeleteFile = async (taskId, currentFiles, fileToDelete) => {
    if (!window.confirm(`Delete file "${fileToDelete.name}"?`)) return;

    try {
      const updatedFiles = currentFiles.filter(f => f.id !== fileToDelete.id);
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        files: updatedFiles
      });
      logActivity('Delete File', `Deleted file "${fileToDelete.name}" from task`);
    } catch (error) {
      console.error("Error deleting file: ", error);
      alert("Failed to delete file.");
    }
  };

  const getDueStatus = (dueDateStr, status) => {
    if (status === 'Completed') return null;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Overdue!', color: 'bg-red-100 text-red-700 border-red-300' };
    if (diffDays <= 1) return { label: 'Due Soon!', color: 'bg-amber-100 text-amber-700 border-amber-300' };
    return null;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans flex-col justify-between">
        <div className="w-full flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">WorkOps Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">Please sign in to access your portal</p>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium border border-red-200">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Username</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>

        <footer className="py-4 text-center text-xs text-slate-400">
          Designed & Developed by <span className="font-semibold text-slate-300">Amashada Navoda</span>
        </footer>
      </div>
    );
  }

  const isManagement = currentUser.role === 'super_admin' || currentUser.role === 'admin';
  const visibleTasks = isManagement 
    ? tasks 
    : tasks.filter(t => t.assigneeId === currentUser.id);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">
      <div>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-2 rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg leading-tight">WorkOps Dashboard</h1>
                <p className="text-xs text-slate-500">Enterprise Task Management Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {currentUser.role === 'super_admin' ? (
                  <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                ) : currentUser.role === 'admin' ? (
                  <Shield className="w-4 h-4 text-indigo-600" />
                ) : (
                  <User className="w-4 h-4 text-emerald-600" />
                )}
                <span className="text-xs font-semibold text-slate-700">
                  {currentUser.name} ({currentUser.role === 'super_admin' ? 'SUPER ADMIN' : currentUser.role.toUpperCase()})
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* TABS FOR MANAGEMENT */}
          {isManagement && (
            <div className="flex gap-3 mb-6 flex-wrap">
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                Task Management
              </button>

              <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                <Users className="w-4 h-4" />
                User Accounts
              </button>

              {currentUser.role === 'super_admin' && (
                <button 
                  onClick={() => setActiveTab('logs')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'logs' ? 'bg-amber-600 text-white shadow-md shadow-amber-200' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  <Activity className="w-4 h-4" />
                  Audit Logs (Super Admin)
                </button>
              )}
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {isManagement && activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                  Create User Account
                </h2>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
                    <input 
                      type="text" required
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEmpName}
                      onChange={e => setNewEmpName(e.target.value)}
                      placeholder="e.g. Kasun Perera"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Role Type</label>
                    <select 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      value={newEmpRole}
                      onChange={e => setNewEmpRole(e.target.value)}
                    >
                      <option value="employee">Employee (Limited Access)</option>
                      <option value="admin">Leader / Admin (Task Assign Control)</option>
                      {currentUser.role === 'super_admin' && (
                        <option value="super_admin">Super Admin (Full System Control)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Username</label>
                    <input 
                      type="text" required
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEmpUsername}
                      onChange={e => setNewEmpUsername(e.target.value)}
                      placeholder="e.g. kasun"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
                    <input 
                      type="text" required
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEmpPassword}
                      onChange={e => setNewEmpPassword(e.target.value)}
                      placeholder="Assign password"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition-all shadow-md shadow-indigo-100"
                  >
                    Create Account
                  </button>
                </form>
              </div>

              {/* USER ACCOUNTS TABLE */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">System User Accounts</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase font-semibold">
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Username</th>
                        <th className="pb-3">Password</th>
                        {currentUser.role === 'super_admin' && <th className="pb-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-800 flex items-center gap-1.5">
                            {u.role === 'super_admin' && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            {u.name}
                          </td>
                          <td className="py-3">
                            {currentUser.role === 'super_admin' && u.id !== currentUser.id ? (
                              <select 
                                value={u.role}
                                onChange={(e) => handleChangeUserRole(u.id, u.name, e.target.value)}
                                className="text-xs border border-slate-200 rounded px-1.5 py-1 font-semibold"
                              >
                                <option value="employee">EMPLOYEE</option>
                                <option value="admin">ADMIN / LEADER</option>
                                <option value="super_admin">SUPER ADMIN</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                                u.role === 'super_admin' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {u.role === 'super_admin' ? 'SUPER ADMIN' : u.role.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-slate-600 font-mono text-xs">{u.username}</td>
                          <td className="py-3 text-slate-600 font-mono text-xs">{u.password}</td>
                          {currentUser.role === 'super_admin' && (
                            <td className="py-3 text-right">
                              {u.id !== currentUser.id && (
                                <button 
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="text-slate-300 hover:text-red-500 p-1"
                                  title="Delete User Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AUDIT LOGS TAB (SUPER ADMIN ONLY) */}
          {currentUser.role === 'super_admin' && activeTab === 'logs' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                System Activity Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mb-4">Track all actions performed by Leaders and Employees in real-time.</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase font-semibold">
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">User</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {logs.length === 0 ? (
                      <tr><td colSpan="4" className="py-4 text-center text-slate-400">No activity logs recorded yet.</td></tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2.5 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-2.5 font-semibold text-slate-700">{log.userName} ({log.userRole})</td>
                          <td className="py-2.5 text-indigo-600 font-bold">{log.action}</td>
                          <td className="py-2.5 text-slate-600">{log.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TASK MANAGEMENT TAB */}
          {(!isManagement || activeTab === 'tasks') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {isManagement && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-600" />
                    Assign New Task
                  </h2>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Task Title</label>
                      <input 
                        type="text" required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={taskTitle}
                        onChange={e => setTaskTitle(e.target.value)}
                        placeholder="e.g. Prepare Monthly Report"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Description</label>
                      <textarea 
                        rows="3"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={taskDesc}
                        onChange={e => setTaskDesc(e.target.value)}
                        placeholder="Instructions..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Assign To</label>
                      <select 
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={assigneeId}
                        onChange={e => setAssigneeId(e.target.value)}
                      >
                        <option value="">Select Assignee</option>
                        {users.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role.toUpperCase()})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Due Date</label>
                      <input 
                        type="date" required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Assign Task
                    </button>
                  </form>
                </div>
              )}

              <div className={isManagement ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    {isManagement ? 'All Team Tasks' : 'My Assigned Tasks'}
                  </h2>
                  <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {visibleTasks.length} Total
                  </span>
                </div>

                {visibleTasks.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                    No tasks assigned yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleTasks.map(task => {
                      const dueAlert = getDueStatus(task.dueDate, task.status);
                      const uploading = isUploading[task.id];

                      return (
                        <div key={task.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-slate-800 text-base">{task.title}</h3>
                                {dueAlert && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${dueAlert.color}`}>
                                    <AlertTriangle className="w-3 h-3" />
                                    {dueAlert.label}
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-slate-500 text-sm">{task.description}</p>
                              )}
                            </div>

                            {/* PERMANENT DELETE (SUPER ADMIN ONLY) */}
                            {currentUser.role === 'super_admin' && (
                              <button 
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                title="Delete Task Permanently (Super Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
                            <div>
                              <span className="text-slate-400 block">Assigned To:</span>
                              <span className="font-semibold text-slate-700">{task.assigneeName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Due Date:</span>
                              <span className="font-semibold text-slate-700">{task.dueDate}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Status:</span>
                              <span className={`font-semibold ${
                                task.status === 'Completed' ? 'text-emerald-600' : 
                                task.status === 'In Progress' ? 'text-amber-600' : 'text-slate-600'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                          </div>

                          {isManagement && (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs space-y-1">
                              <div className="text-indigo-900 font-semibold mb-1 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                Work Tracking Status:
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-slate-600">
                                <div>
                                  Started At: <span className="font-mono text-slate-800 font-semibold">{task.startTime || 'Not started yet'}</span>
                                </div>
                                <div>
                                  Completed At: <span className="font-mono text-slate-800 font-semibold">{task.endTime || 'Not completed yet'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* TASK ACTION BUTTONS */}
                          <div className="flex gap-2 border-t pt-3">
                            {task.status === 'Pending' && (
                              <button 
                                onClick={() => handleStartTask(task.id, task.title)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Start Work Now
                              </button>
                            )}

                            {task.status === 'In Progress' && (
                              <button 
                                onClick={() => handleCompleteTask(task.id, task.title)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Mark Completed
                              </button>
                            )}
                          </div>

                          {/* FILES SECTION */}
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                Attached Deliverables ({task.files?.length || 0})
                              </span>

                              <label className="cursor-pointer text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                                <FileUp className="w-3.5 h-3.5" />
                                Upload File / Video
                                <input 
                                  type="file" 
                                  multiple
                                  className="hidden" 
                                  onChange={(e) => handleFileUpload(task.id, task.title, task.files, e)} 
                                />
                              </label>
                            </div>

                            {/* UPLOADING INDICATOR */}
                            {uploading && (
                              <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl mb-3 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                Uploading file to Cloudinary... Please wait.
                              </div>
                            )}

                            {/* FILES LIST */}
                            {task.files && task.files.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {task.files.map((file) => (
                                  <div key={file.id} className="bg-slate-50 border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 group transition-all">
                                    <a 
                                      href={file.url}
                                      download={file.name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                      <span className="font-medium text-slate-700 group-hover:text-indigo-600 truncate max-w-[140px]">{file.name}</span>
                                      <span className="text-[10px] text-slate-400">({file.size})</span>
                                    </a>

                                    <button 
                                      onClick={() => handleDeleteFile(task.id, task.files, file)}
                                      className="text-slate-400 hover:text-red-500 p-0.5 rounded-md transition-colors ml-1"
                                      title="Delete File"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      <footer className="mt-12 py-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>
          Designed & Developed by <span className="font-semibold text-slate-800">Amashada Navoda</span>
        </p>
      </footer>
    </div>
  );
}