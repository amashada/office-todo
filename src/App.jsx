import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Trash2, 
  Upload, UserPlus, LogOut, Eye, EyeOff, 
  FileText, Play, CheckCircle, BarChart3, Users, Award, TrendingUp, Search, X, Activity, ShieldAlert, Calendar
} from 'lucide-react';

import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  setDoc
} from 'firebase/firestore';

const CLOUDINARY_UPLOAD_PRESET = import.meta.env?.VITE_CLOUDINARY_PRESET || "my_app_preset";
const CLOUDINARY_CLOUD_NAME = import.meta.env?.VITE_CLOUDINARY_NAME || "sb47oizx";

// Default Super Admin Account Data (Name is Admin)
const DEFAULT_SUPER_ADMIN = {
  id: 'super_admin_fixed_id',
  username: 'superadmin',
  password: 'admin123',
  name: 'Admin',
  role: 'SUPER_ADMIN',
  createdAt: new Date().toISOString()
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Firebase Collections State
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isUploading, setIsUploading] = useState({});

  // Form States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('USER');

  // Clear session on initial mount so user starts fresh at login
  useEffect(() => {
    localStorage.removeItem('office_todo_current_user');
  }, []);

  // 1. REALTIME FIREBASE USERS SYNC & DEFAULT SUPER ADMIN SEEDING
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), async (snapshot) => {
      let fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const hasSuperAdmin = fetchedUsers.some(u => u.role === 'SUPER_ADMIN' || u.username === 'superadmin');
      if (!hasSuperAdmin) {
        try {
          await setDoc(doc(db, "users", DEFAULT_SUPER_ADMIN.id), DEFAULT_SUPER_ADMIN);
          fetchedUsers.push(DEFAULT_SUPER_ADMIN);
        } catch (err) {
          console.error("Failed to seed Super Admin:", err);
        }
      } else {
        const existingSuperAdminDoc = fetchedUsers.find(u => u.role === 'SUPER_ADMIN' || u.username === 'superadmin');
        if (existingSuperAdminDoc && existingSuperAdminDoc.name === 'System Super Admin') {
          try {
            await updateDoc(doc(db, "users", existingSuperAdminDoc.id), { name: 'Admin' });
          } catch (err) {
            console.error("Failed to update superadmin name:", err);
          }
        }
      }

      setUsers(fetchedUsers);
    }, (error) => {
      console.error("Firebase users fetch error:", error);
    });

    return () => unsubscribe();
  }, []);

  // 2. REALTIME FIREBASE TASKS SYNC
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(fetchedTasks);
    }, (error) => {
      console.error("Firebase tasks fetch error:", error);
    });

    return () => unsubscribe();
  }, []);

  // 3. REALTIME FIREBASE ACTIVITY LOGS SYNC (ONLY for Super Admin)
  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivityLogs(fetchedLogs);
      }, (error) => {
        console.error("Logs fetch error:", error);
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  // Helper to record Activity Logs in Firebase
  const logActivity = async (user, actionType, details = "") => {
    try {
      await addDoc(collection(db, "activity_logs"), {
        userId: user.id || "unknown",
        username: user.username,
        name: user.name,
        role: user.role,
        action: actionType,
        details: details,
        timestamp: new Date().toLocaleString()
      });
    } catch (err) {
      console.error("Failed to save activity log:", err);
    }
  };

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanUsername = loginUsername.trim().toLowerCase();
    
    let user = users.find(u => u.username.toLowerCase() === cleanUsername && u.password === loginPassword);
    
    if (!user && cleanUsername === DEFAULT_SUPER_ADMIN.username && loginPassword === DEFAULT_SUPER_ADMIN.password) {
      user = DEFAULT_SUPER_ADMIN;
    }

    if (user) {
      setCurrentUser(user);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');

      await logActivity(user, 'LOGIN', 'User logged into system dashboard');
    } else {
      setLoginError('Invalid username or password!');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await logActivity(currentUser, 'LOGOUT', 'User logged out');
    }
    localStorage.clear();
    sessionStorage.clear();
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setActiveTab('tasks');
  };

  // User Management
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) return;

    if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
      alert('This username is already taken!');
      return;
    }

    const newUser = {
      username: newUsername.trim(),
      password: newPassword,
      name: newName.trim(),
      role: newRole,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "users"), newUser);
      
      if (currentUser) {
        await logActivity(currentUser, 'USER_ADD', `Added new ${newRole}: ${newName.trim()} (@${newUsername.trim()})`);
      }

      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewRole('USER');
      setShowUserModal(false);
      alert('Member added successfully to Firebase!');
    } catch (err) {
      console.error("Error adding user: ", err);
      alert('Failed to add user to Firebase.');
    }
  };

  const handleDeleteUser = async (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.role === 'SUPER_ADMIN') {
      alert("Super Admin account cannot be deleted!");
      return;
    }

    if (window.confirm(`Are you sure you want to delete member "${userToDelete.name}"? This will AUTO-DELETE all tasks assigned to them from Firebase!`)) {
      try {
        const tasksToDeleteQuery = query(collection(db, "tasks"), where("assignedToId", "==", userId));
        const tasksSnapshot = await getDocs(tasksToDeleteQuery);
        
        const deletePromises = tasksSnapshot.docs.map(taskDoc => deleteDoc(doc(db, "tasks", taskDoc.id)));
        await Promise.all(deletePromises);

        await deleteDoc(doc(db, "users", userId));

        if (currentUser) {
          await logActivity(currentUser, 'USER_DELETE', `Deleted user ${userToDelete.name} and their assigned tasks`);
        }

        alert('Member and assigned tasks deleted successfully!');
      } catch (err) {
        console.error("Delete user error:", err);
        alert('Failed to delete user.');
      }
    }
  };

  // Task Management
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskAssignee || !newTaskDeadline) {
      alert('Please fill all required fields including the deadline date!');
      return;
    }

    const assignee = users.find(u => u.id === newTaskAssignee);

    const newTask = {
      title: newTaskTitle,
      description: newTaskDesc,
      assignedTo: assignee ? assignee.name : 'Unassigned',
      assignedToId: newTaskAssignee,
      priority: newTaskPriority,
      deadline: newTaskDeadline,
      status: 'Pending',
      createdAt: new Date().toISOString().split('T')[0],
      attachments: []
    };

    try {
      await addDoc(collection(db, "tasks"), newTask);

      if (currentUser) {
        await logActivity(currentUser, 'TASK_CREATE', `Created task "${newTaskTitle}" for ${assignee?.name} with deadline ${newTaskDeadline}`);
      }

      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      setNewTaskPriority('Medium');
      setNewTaskDeadline('');
      setShowTaskModal(false);
    } catch (err) {
      console.error("Error creating task:", err);
      alert('Failed to create task in Firebase.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, "tasks", taskId));
        if (currentUser) {
          await logActivity(currentUser, 'TASK_DELETE', `Deleted task ID: ${taskId}`);
        }
      } catch (err) {
        console.error("Task delete error:", err);
      }
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });

      if (currentUser) {
        await logActivity(currentUser, 'TASK_STATUS_UPDATE', `Updated task status to ${newStatus}`);
      }
    } catch (err) {
      console.error("Task update error:", err);
    }
  };

  const handleFileUpload = async (taskId, e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (!uploadedFiles.length) return;

    setIsUploading(prev => ({ ...prev, [taskId]: true }));

    for (let file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.secure_url) {
          const newFileObj = {
            id: Date.now().toString(),
            name: file.name,
            url: data.secure_url
          };

          const task = tasks.find(t => t.id === taskId);
          const currentAttachments = task?.attachments || [];

          await updateDoc(doc(db, "tasks", taskId), {
            attachments: [...currentAttachments, newFileObj]
          });
        }
      } catch (err) {
        console.error("Upload error:", err);
        alert("File upload failed!");
      }
    }

    setIsUploading(prev => ({ ...prev, [taskId]: false }));
  };

  const togglePasswordVisibility = (userId) => {
    setShowPasswordMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Role Checks
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminOrSuper = currentUser?.role === 'ADMIN' || isSuperAdmin;

  // Filter Tasks
  const userVisibleTasks = isAdminOrSuper 
    ? tasks 
    : tasks.filter(t => t.assignedToId === currentUser?.id || t.assignedTo === currentUser?.name);

  const filteredTasks = userVisibleTasks.filter(t => {
    const matchesSearch = t.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Performance Calculation: EXCLUDE Super Admin from performance list
  const performanceData = users
    .filter(u => u.role !== 'SUPER_ADMIN')
    .map(u => {
      const userTasks = tasks.filter(t => t.assignedToId === u.id || t.assignedTo === u.name);
      const total = userTasks.length;
      const completed = userTasks.filter(t => t.status === 'Completed').length;
      const inProgress = userTasks.filter(t => t.status === 'In Progress').length;
      const pending = userTasks.filter(t => t.status === 'Pending').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { ...u, total, completed, inProgress, pending, rate };
    }).sort((a, b) => b.rate - a.rate || b.completed - a.completed);

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">WorkOps Login</h1>
            <p className="text-slate-400 text-sm mt-1">Sign in with User Account</p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">Username</label>
              <input 
                type="text" 
                autoComplete="off"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
                placeholder="Enter username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">Password</label>
              <input 
                type="password" 
                autoComplete="new-password"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200 mt-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md">
              OP
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">Office Operations</h1>
              <span className="text-xs text-indigo-400 font-medium">Task & Performance Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">
                {currentUser.name === 'System Super Admin' ? 'Admin' : currentUser.name}
              </div>
              <div className="text-xs text-slate-400">
                {currentUser.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : currentUser.role}
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit flex-wrap gap-1">
            <button 
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <CheckCircle2 className="w-4 h-4" /> Tasks List
            </button>

            <button 
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'performance' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <BarChart3 className="w-4 h-4" /> Performance
            </button>

            {isAdminOrSuper && (
              <button 
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Users className="w-4 h-4" /> User Accounts
              </button>
            )}

            {isSuperAdmin && (
              <button 
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Activity className="w-4 h-4" /> Activity Logs
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAdminOrSuper && (
              <button 
                onClick={() => setShowTaskModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" /> Create New Task
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input 
                  type="text"
                  placeholder="Search by task title or assignee..."
                  className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                  No tasks available.
                </div>
              ) : (
                filteredTasks.map(task => {
                  const isAssignedToMe = currentUser.id === task.assignedToId || currentUser.name === task.assignedTo;
                  const canDeleteTask = isAdminOrSuper;

                  return (
                    <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            task.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            task.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>
                            {task.status}
                          </span>

                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            task.priority === 'High' ? 'text-red-400 bg-red-400/10' :
                            task.priority === 'Medium' ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400 bg-slate-800'
                          }`}>
                            {task.priority} Priority
                          </span>
                        </div>

                        <h3 className="font-semibold text-white text-base mb-2">{task.title}</h3>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{task.description || 'No description provided.'}</p>

                        <div className="text-xs text-slate-400 space-y-1.5 mb-4 border-t border-slate-800 pt-3">
                          <div className="flex items-center justify-between">
                            <span>Assigned To:</span>
                            <span className="font-medium text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                              {task.assignedTo === 'System Super Admin' ? 'Admin' : task.assignedTo}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Deadline:</span>
                            <span className="font-semibold text-rose-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {task.deadline || 'No deadline'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Created At:</span>
                            <span>{task.createdAt}</span>
                          </div>
                        </div>

                        {task.attachments && task.attachments.length > 0 && (
                          <div className="mb-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-2">Attachments:</span>
                            <div className="flex flex-wrap gap-2">
                              {task.attachments.map((file, idx) => (
                                <a 
                                  key={idx} 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition truncate max-w-[200px]"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span className="truncate">{file.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-800 pt-4 mt-2">
                        {isAssignedToMe ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              {task.status !== 'In Progress' && task.status !== 'Completed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                                >
                                  <Play className="w-3.5 h-3.5" /> Start Work
                                </button>
                              )}
                              {task.status !== 'Completed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(task.id, 'Completed')}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Complete
                                </button>
                              )}
                            </div>

                            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700">
                              <Upload className="w-3.5 h-3.5" /> {isUploading[task.id] ? 'Uploading...' : 'Upload File'}
                              <input type="file" className="hidden" onChange={(e) => handleFileUpload(task.id, e)} />
                            </label>
                          </div>
                        ) : (
                          <div className="text-center py-2 bg-slate-950/50 rounded-xl border border-slate-800">
                            <span className="text-xs text-slate-500 italic">
                              {isAdminOrSuper ? 'Assigned to member (View only)' : 'Assigned to another member'}
                            </span>
                          </div>
                        )}

                        {canDeleteTask && (
                          <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-end">
                            <button 
                              onClick={() => handleDeleteTask(task.id)} 
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 py-1 px-2 rounded hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Task
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERFORMANCE */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" /> Team Performance Overview
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Live tracking of team progress and completion metrics</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {performanceData.map((user, idx) => (
                  <div key={user.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                    {idx === 0 && user.completed > 0 && (
                      <div className="absolute top-3 right-3 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                        <Award className="w-3.5 h-3.5" /> Top Performer
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-indigo-900/50 border border-indigo-500/30 rounded-xl flex items-center justify-center font-bold text-indigo-300 text-lg">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">
                          {user.name === 'System Super Admin' ? 'Admin' : user.name}
                        </h3>
                        <span className="text-xs text-slate-400">@{user.username}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-400">Completion Rate</span>
                        <span className="text-indigo-400">{user.rate}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${user.rate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
                      <div className="bg-slate-900 p-2 rounded-xl">
                        <div className="text-xs text-slate-400">Total</div>
                        <div className="text-sm font-bold text-white">{user.total}</div>
                      </div>
                      <div className="bg-emerald-950/40 border border-emerald-800/30 p-2 rounded-xl">
                        <div className="text-xs text-emerald-400">Completed</div>
                        <div className="text-sm font-bold text-emerald-300">{user.completed}</div>
                      </div>
                      <div className="bg-amber-950/40 border border-amber-800/30 p-2 rounded-xl">
                        <div className="text-xs text-amber-400">Pending</div>
                        <div className="text-sm font-bold text-amber-300">{user.pending + user.inProgress}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USERS */}
        {activeTab === 'users' && isAdminOrSuper && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">User Accounts Management</h2>
                <p className="text-slate-400 text-sm mt-1">Firebase Live Users & Credentials</p>
              </div>
              <button 
                onClick={() => setShowUserModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4" /> Add New Member
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {users.map(u => {
                    const displayRole = u.role === 'SUPER_ADMIN' ? 'ADMIN' : u.role;
                    const displayName = u.name === 'System Super Admin' ? 'Admin' : u.name;

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-medium text-white">{displayName}</td>
                        <td className="py-3.5 px-4 text-slate-300">{u.username}</td>
                        <td className="py-3.5 px-4">
                          {isSuperAdmin ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-indigo-300">
                                {showPasswordMap[u.id] ? u.password : '••••••••'}
                              </span>
                              <button 
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="text-slate-400 hover:text-white p-1"
                              >
                                {showPasswordMap[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono">••••••••</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            displayRole === 'ADMIN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {displayRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {u.role !== 'SUPER_ADMIN' && (
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                              title="Delete Member & Auto-Delete Tasks from Firebase"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ACTIVITY LOGS */}
        {activeTab === 'logs' && isSuperAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" /> Audit & Activity Logs
              </h2>
              <p className="text-slate-400 text-sm mt-1">Real-time login, logout, and system events recorded in Firebase</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-slate-500">
                        No activity logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map(log => {
                      const logName = log.name === 'System Super Admin' ? 'Admin' : log.name;
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-medium text-white">
                            {logName} <span className="text-xs text-slate-400 font-normal">(@{log.username})</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              log.action === 'LOGIN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              log.action === 'LOGOUT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{log.details || '-'}</td>
                          <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">{log.timestamp}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowTaskModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Task Title</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Description</label>
                <textarea 
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Enter task description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Assign To</label>
                  <select 
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                  >
                    <option value="">Select Member</option>
                    {users.map(u => {
                      const optName = u.name === 'System Super Admin' ? 'Admin' : u.name;
                      return (
                        <option key={u.id} value={u.id}>{optName} ({u.role === 'SUPER_ADMIN' ? 'ADMIN' : u.role})</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Priority</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Deadline Date *</label>
                <div className="relative">
                  <input 
                    type="date"
                    required
                    onClick={(e) => {
                      // Try to open native calendar picker on click if supported by browser API
                      if (typeof e.target.showPicker === 'function') {
                        e.target.showPicker();
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Click anywhere on the input box to open the calendar picker.</p>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowUserModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Add New Team Member</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Username</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Password</label>
                <input 
                  type="password"
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">Role</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}