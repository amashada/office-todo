import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Clock, AlertTriangle, FileText, Plus, Users, 
  LogOut, Shield, User, Play, Check, FileUp, Trash2, KeyRound 
} from 'lucide-react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

const INITIAL_ADMIN = { 
  name: 'Admin', 
  role: 'admin', 
  username: 'admin', 
  password: '123' 
};

export default function App() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);

  // AUTO LOGOUT NATHI KIRIMA: LocalStorage eken restore karagannawa
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

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [activeTab, setActiveTab] = useState('tasks');

  // Save current login user state to LocalStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('office_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('office_current_user');
    }
  }, [currentUser]);

  // Firebase Realtime Sync
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (userList.length === 0) {
        addDoc(collection(db, 'users'), INITIAL_ADMIN);
      } else {
        setUsers(userList);
      }
    });

    const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(taskList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Invalid Username or Password!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName || !newEmpUsername || !newEmpPassword) return;

    if (users.some(u => u.username === newEmpUsername)) {
      alert('Username already exists!');
      return;
    }

    try {
      await addDoc(collection(db, 'users'), {
        name: newEmpName,
        role: 'employee',
        username: newEmpUsername,
        password: newEmpPassword
      });
      setNewEmpName('');
      setNewEmpUsername('');
      setNewEmpPassword('');
      alert('Employee account created successfully!');
    } catch (error) {
      console.error("Error creating user: ", error);
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

      setTaskTitle('');
      setTaskDesc('');
      setAssigneeId('');
      setDueDate('');
    } catch (error) {
      console.error("Error creating task: ", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (error) {
        console.error("Error deleting task: ", error);
      }
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'In Progress',
        startTime: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
      });
    } catch (error) {
      console.error("Error starting task: ", error);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'Completed',
        endTime: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
      });
    } catch (error) {
      console.error("Error completing task: ", error);
    }
  };

  // Safe File Upload Processing
  const handleFileUpload = async (taskId, currentFiles, e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (!uploadedFiles.length) return;

    // Check File Sizes (Warn if file > 1MB for Firestore text limits)
    for (let file of uploadedFiles) {
      if (file.size > 1048576) {
        alert(`File "${file.name}" is too large! Please upload files/videos smaller than 1MB for smooth sync.`);
        return;
      }
    }

    const fileObjects = await Promise.all(uploadedFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            type: file.type,
            url: reader.result
          });
        };
        reader.readAsDataURL(file);
      });
    }));

    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        files: [...(currentFiles || []), ...fileObjects]
      });
    } catch (error) {
      console.error("Error uploading file: ", error);
      alert("Failed to upload file to Cloud. Check file size.");
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Office Dashboard Login</h1>
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

          <div className="mt-6 pt-4 border-t text-center text-xs text-slate-400">
            Default Admin Login: <span className="font-semibold text-slate-600">admin</span> / <span className="font-semibold text-slate-600">123</span>
          </div>
        </div>
      </div>
    );
  }

  const visibleTasks = currentUser.role === 'admin' 
    ? tasks 
    : tasks.filter(t => t.assigneeId === currentUser.id);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight">Team Task Dashboard</h1>
              <p className="text-xs text-slate-500">Firebase Real-time Cloud Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              {currentUser.role === 'admin' ? (
                <Shield className="w-4 h-4 text-indigo-600" />
              ) : (
                <User className="w-4 h-4 text-emerald-600" />
              )}
              <span className="text-xs font-semibold text-slate-700">{currentUser.name} ({currentUser.role.toUpperCase()})</span>
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
        {currentUser.role === 'admin' && (
          <div className="flex gap-4 mb-6">
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
              Manage Employee Accounts
            </button>
          </div>
        )}

        {currentUser.role === 'admin' && activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                Create Employee Login
              </h2>
              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Employee Name</label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={newEmpName}
                    onChange={e => setNewEmpName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                  />
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
                  Create User Account
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Cloud Database Accounts</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase font-semibold">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Username</th>
                      <th className="pb-3">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-800">{u.name}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600 font-mono text-xs">{u.username}</td>
                        <td className="py-3 text-slate-600 font-mono text-xs">{u.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {(currentUser.role !== 'admin' || activeTab === 'tasks') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {currentUser.role === 'admin' && (
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
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Assign To Employee</label>
                    <select 
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={assigneeId}
                      onChange={e => setAssigneeId(e.target.value)}
                    >
                      <option value="">Select Employee</option>
                      {users.filter(u => u.role === 'employee').map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
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

            <div className={currentUser.role === 'admin' ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {currentUser.role === 'admin' ? 'All Team Tasks' : 'My Assigned Tasks'}
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

                          {currentUser.role === 'admin' && (
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors p-1"
                              title="Delete Task"
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

                        {currentUser.role === 'admin' && (
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs space-y-1">
                            <div className="text-indigo-900 font-semibold mb-1 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              Cloud Work Tracking:
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

                        {currentUser.role === 'employee' && (
                          <div className="flex gap-2 border-t pt-3">
                            {task.status === 'Pending' && (
                              <button 
                                onClick={() => handleStartTask(task.id)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Start Work Now
                              </button>
                            )}

                            {task.status === 'In Progress' && (
                              <button 
                                onClick={() => handleCompleteTask(task.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Mark Completed
                              </button>
                            )}
                          </div>
                        )}

                        {/* FILES SECTION */}
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              Attached Deliverables ({task.files?.length || 0})
                            </span>

                            {/* FILE UPLOAD BUTTON IS HIDDEN FOR ADMIN */}
                            {currentUser.role === 'employee' && (
                              <label className="cursor-pointer text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                                <FileUp className="w-3.5 h-3.5" />
                                Upload File
                                <input 
                                  type="file" 
                                  multiple
                                  className="hidden" 
                                  onChange={(e) => handleFileUpload(task.id, task.files, e)} 
                                />
                              </label>
                            )}
                          </div>

                          {/* Render Uploaded Files & Videos */}
                          {task.files && task.files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {task.files.map((file, idx) => (
                                <a 
                                  key={idx}
                                  href={file.url}
                                  download={file.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-slate-50 border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 group transition-all"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="font-medium text-slate-700 group-hover:text-indigo-600 truncate max-w-[150px]">{file.name}</span>
                                  <span className="text-[10px] text-slate-400">{file.size}</span>
                                </a>
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
  );
}