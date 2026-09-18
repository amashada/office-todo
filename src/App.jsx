import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  FileUp,
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  FileArchive,
  File as FileIcon,
  Trash2,
  Check,
  ChevronRight,
  Shield,
  BarChart3,
  Paperclip,
  X,
  Eye,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  UserCheck
} from 'lucide-react';

const TEAM_MEMBERS = [
  { id: 'u1', name: 'Kasun Perera', role: 'Graphic Designer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'u2', name: 'Amal Silva', role: 'Software Engineer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'u3', name: 'Nimal Fernando', role: 'Accountant', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 'u4', name: 'Dilini Senanayake', role: 'Marketing Specialist', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 'u5', name: 'Ruwan Jayasinghe', role: 'Operations Lead', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 'u6', name: 'Chathuri Wickramasinghe', role: 'Content Writer', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' }
];

const INITIAL_TASKS = [
  {
    id: 'task-101',
    title: 'Design Social Media Banners for Promo',
    description: 'Create 3 Facebook and Instagram poster designs for the upcoming Sinhala New Year campaign in PSD/PNG format.',
    assigneeId: 'u1',
    priority: 'High',
    category: 'Design',
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    status: 'In Progress',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    completedTime: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    attachments: [
      { id: 'f1', name: 'brand_colors.pdf', size: '1.2 MB', type: 'application/pdf', uploadedAt: 'Yesterday, 10:30 AM', url: 'data:text/plain;base64,U2FtcGxlIEJyYW5kIEd1aWRlbGluZXMgUERGIENvbnRlbnQ=' }
    ]
  },
  {
    id: 'task-102',
    title: 'Monthly EPF & ETF Reports Preparation',
    description: 'Calculate salary deductions and generate EPF C-form CSV file for all 12 staff members.',
    assigneeId: 'u3',
    priority: 'Urgent',
    category: 'Finance',
    dueDate: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
    status: 'Pending',
    startTime: null,
    completedTime: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    attachments: []
  },
  {
    id: 'task-103',
    title: 'Fix Payment Gateway API Timeout Issue',
    description: 'Investigate Sri Lanka PayHere Webhook delays and optimize SQL queries.',
    assigneeId: 'u2',
    priority: 'Urgent',
    category: 'Dev',
    dueDate: new Date(Date.now() - 18000000).toISOString().slice(0, 16),
    status: 'Completed',
    startTime: new Date(Date.now() - 28800000).toISOString(),
    completedTime: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    attachments: [
      { id: 'f2', name: 'api_fix_logs.txt', size: '24 KB', type: 'text/plain', uploadedAt: 'Today, 11:45 AM', url: 'data:text/plain;base64,T2dzaSBsb2dzOiBBUEkgcmVzcG9uc2UgdGltZSBpcyBub3cgNDVtcy4gU3VjY2Vzc2Z1bGx5IGZpeGVkIQ==' }
    ]
  }
];

export default function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('office_tasks_db');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch (e) {
      return INITIAL_TASKS;
    }
  });

  const [darkMode, setDarkMode] = useState(false);
  const [filterMember, setFilterMember] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: TEAM_MEMBERS[0].id,
    priority: 'Medium',
    category: 'General',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16)
  });

  // File Upload State inside Modal
  const [uploadingTask, setUploadingTask] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('office_tasks_db', JSON.stringify(tasks));
    } catch (e) {
      console.error('Storage quota exceeded or error saving tasks:', e);
    }
  }, [tasks]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDueDateStatus = (dueDateStr, status) => {
    if (status === 'Completed') return { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400' };
    if (!dueDateStr) return { label: 'No Due Date', color: 'bg-slate-100 text-slate-600' };
    
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffHours = (due - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { label: 'OVERDUE', color: 'bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-900 dark:text-rose-400 font-bold animate-pulse' };
    } else if (diffHours <= 24) {
      return { label: 'Due Soon', color: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800 dark:text-amber-400 font-semibold' };
    }
    return { label: 'On Schedule', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800 dark:text-indigo-400' };
  };

  const handleStartTask = (taskId) => {
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'In Progress', startTime: now };
      }
      return t;
    }));
  };

  const handleCompleteTask = (taskId) => {
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'Completed', completedTime: now };
      }
      return t;
    }));
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const taskObj = {
      id: `task-${Date.now().toString().slice(-4)}`,
      title: newTask.title,
      description: newTask.description,
      assigneeId: newTask.assigneeId,
      priority: newTask.priority,
      category: newTask.category,
      dueDate: newTask.dueDate,
      status: 'Pending',
      startTime: null,
      completedTime: null,
      createdAt: new Date().toISOString(),
      attachments: []
    };

    setTasks([taskObj, ...tasks]);
    setIsAddModalOpen(false);
    setNewTask({
      title: '',
      description: '',
      assigneeId: TEAM_MEMBERS[0].id,
      priority: 'Medium',
      category: 'General',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16)
    });
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
    }
  };

  const handleFileUpload = (e, taskId) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newAttachment = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          type: file.type || getFileExtension(file.name),
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          url: event.target.result
        };

        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              attachments: [...t.attachments, newAttachment]
            };
          }
          return t;
        }));

        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(prev => ({
            ...prev,
            attachments: [...prev.attachments, newAttachment]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const renderFileIcon = (fileName, fileType) => {
    const ext = getFileExtension(fileName);
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) || fileType.includes('image')) {
      return <ImageIcon className="w-5 h-5 text-purple-500" />;
    }
    if (['pdf'].includes(ext) || fileType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || fileType.includes('spreadsheet')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (['psd', 'ai', 'fig'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-blue-500" />;
    }
    if (['zip', 'rar', '7z'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    return <FileIcon className="w-5 h-5 text-slate-500" />;
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesMember = filterMember === 'All' || task.assigneeId === filterMember;
      const matchesStatus = filterStatus === 'All' || 
        (filterStatus === 'Overdue' ? getDueDateStatus(task.dueDate, task.status).label === 'OVERDUE' : task.status === filterStatus);
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMember && matchesStatus && matchesSearch;
    });
  }, [tasks, filterMember, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const overdue = tasks.filter(t => getDueDateStatus(t.dueDate, t.status).label === 'OVERDUE').length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, inProgress, overdue, percentage };
  }, [tasks]);

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              OfficeFlow Pro
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Team Task & Deliverables Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tasks</span>
              <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total}</p>
            <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Progress</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{stats.inProgress}</p>
            <span className="text-xs text-slate-400 font-medium">Currently Active</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{stats.percentage}% done overall</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue Tasks</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{stats.overdue}</p>
            <span className="text-xs text-rose-500 font-medium">Needs Attention</span>
          </div>
        </section>

        {}
        <section className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" /> Filter by Staff Member (5-6 Team)
            </h3>
            {filterMember !== 'All' && (
              <button 
                onClick={() => setFilterMember('All')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Reset Member Filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilterMember('All')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                filterMember === 'All'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> All Team
            </button>

            {TEAM_MEMBERS.map(member => {
              const activeCount = tasks.filter(t => t.assigneeId === member.id && t.status !== 'Completed').length;
              return (
                <button
                  key={member.id}
                  onClick={() => setFilterMember(member.id)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 ${
                    filterMember === member.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <img src={member.avatar} alt={member.name} className="w-5 h-5 rounded-full object-cover border border-white/40" />
                  <span>{member.name.split(' ')[0]}</span>
                  {activeCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      filterMember === member.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                    }`}>
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by task name, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {['All', 'Pending', 'In Progress', 'Completed', 'Overdue'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                  filterStatus === status
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-800 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        {}
        <section className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No tasks found</h3>
              <p className="text-xs text-slate-400 mt-1">Try changing your filters or add a new task for your team.</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const assignee = TEAM_MEMBERS.find(m => m.id === task.assigneeId) || TEAM_MEMBERS[0];
              const dueStatus = getDueDateStatus(task.dueDate, task.status);

              return (
                <div
                  key={task.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left Column: Title & Metadata */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${dueStatus.color}`}>
                          {dueStatus.label}
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          task.priority === 'Urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' :
                          task.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {task.priority} Priority
                        </span>

                        <span className="text-xs text-slate-400 font-mono">ID: #{task.id}</span>
                      </div>

                      <h2 
                        onClick={() => setSelectedTask(task)}
                        className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {task.title}
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {task.description}
                      </p>

                      {/* Timestamps Section */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Due: <strong className="text-slate-700 dark:text-slate-300">{formatDateTime(task.dueDate)}</strong></span>
                        </div>

                        {task.startTime && (
                          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                            <Play className="w-3.5 h-3.5" />
                            <span>Started: {formatDateTime(task.startTime)}</span>
                          </div>
                        )}

                        {task.completedTime && (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done: {formatDateTime(task.completedTime)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Assignee & File Actions */}
                    <div className="flex flex-wrap lg:flex-col items-start lg:items-end justify-between lg:justify-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      
                      {/* Assignee Card */}
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <img src={assignee.avatar} alt={assignee.name} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{assignee.name}</p>
                          <p className="text-[10px] text-slate-400">{assignee.role}</p>
                        </div>
                      </div>

                      {/* Task Action Buttons */}
                      <div className="flex items-center gap-2">
                        {task.status === 'Pending' && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-sm transition-all"
                          >
                            <Play className="w-3.5 h-3.5" /> Start Task
                          </button>
                        )}

                        {task.status === 'In Progress' && (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-sm transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Done
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedTask(task)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-all"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{task.attachments.length} Files</span>
                        </button>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </section>

      </main>

      {}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">#{selectedTask.id}</span>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timestamps & Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
              <div>
                <p className="text-slate-400 font-medium">Assigned To</p>
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  {TEAM_MEMBERS.find(m => m.id === selectedTask.assigneeId)?.name}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Started At</p>
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  {formatDateTime(selectedTask.startTime)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Completed At</p>
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  {formatDateTime(selectedTask.completedTime)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl">
                {selectedTask.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* File Deliverables / Attachments Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-indigo-500" /> Attached Deliverables ({selectedTask.attachments.length})
                </h3>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e, selectedTask.id)}
                  className="hidden"
                  multiple
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-all"
                >
                  <FileUp className="w-4 h-4" /> Upload File (Any format)
                </button>
              </div>

              {selectedTask.attachments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <FileUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No proof or file attached yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Supports JPG, PNG, PDF, PSD, XLSX, DOCX, ZIP files</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTask.attachments.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderFileIcon(file.name, file.type)}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{file.size} • Uploaded {file.uploadedAt}</p>
                        </div>
                      </div>

                      <a
                        href={file.url}
                        download={file.name}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Assign New Office Task</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Prepare Monthly Invoice Sheet"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Assign To (Staff Member)</label>
                <select
                  value={newTask.assigneeId}
                  onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Task Instructions / Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide instructions for the employee..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
                >
                  Assign Task
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}