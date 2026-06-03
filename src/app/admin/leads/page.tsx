"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  UserPlus,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Instagram,
  Facebook,
  Globe,
  MessageCircle,
  PhoneCall,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  BarChart3,
  PieChart,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  X,
  Download,
  Link2,
  Loader2,
  CalendarDays,
  Building2,
  User,
  StickyNote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

// Lead sources with icons
const leadSources = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-600' },
  { id: 'website', name: 'Website', icon: Globe, color: 'from-emerald-500 to-teal-500' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'from-green-500 to-green-600' },
  { id: 'phone', name: 'Phone Call', icon: PhoneCall, color: 'from-[#FF8C6B] to-[#ff7a54]' },
  { id: 'walkin', name: 'Walk-in', icon: MapPin, color: 'from-violet-500 to-purple-500' },
  { id: 'referral', name: 'Referral', icon: Users, color: 'from-cyan-500 to-blue-500' },
];

// Lead statuses
const leadStatuses = [
  { id: 'new', name: 'New', color: 'bg-blue-500', bgLight: 'bg-blue-100 text-blue-700' },
  { id: 'contacted', name: 'Contacted', color: 'bg-amber-500', bgLight: 'bg-amber-100 text-amber-700' },
  { id: 'qualified', name: 'Qualified', color: 'bg-purple-500', bgLight: 'bg-purple-100 text-purple-700' },
  { id: 'proposal', name: 'Proposal', color: 'bg-cyan-500', bgLight: 'bg-cyan-100 text-cyan-700' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-[#FF8C6B]', bgLight: 'bg-[#FF8C6B]/20 text-[#FF8C6B]' },
  { id: 'won', name: 'Won', color: 'bg-green-500', bgLight: 'bg-green-100 text-green-700' },
  { id: 'sold_hot', name: 'Sold - Hot', color: 'bg-red-500', bgLight: 'bg-red-100 text-red-700' },
  { id: 'sold_cold', name: 'Sold - Cold', color: 'bg-cyan-500', bgLight: 'bg-cyan-100 text-cyan-700' },
  { id: 'lost', name: 'Lost', color: 'bg-stone-500', bgLight: 'bg-stone-100 text-stone-700' },
];

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  lead_type: string | null;
  source: string;
  status: string;
  interests: string[] | null;
  budget_range: string | null;
  notes: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: string[] | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matchingLeads, setMatchingLeads] = useState(false);
  const [matchResult, setMatchResult] = useState<{ matched: number; created: number; errors: string[] | null } | null>(null);
  
  // Stats from API
  const [stats, setStats] = useState<{ total: number; bySource: Record<string, number>; byStatus: Record<string, number> }>({ total: 0, bySource: {}, byStatus: {} });
  
  // Date filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Add Lead Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    lead_type: 'individual',
    source: 'website',
    status: 'new',
    notes: '',
    interests: [] as string[],
  });
  const [savingLead, setSavingLead] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 100;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch leads from API with pagination
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', pageSize.toString());
      params.set('offset', ((currentPage - 1) * pageSize).toString());
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedSource !== 'all') params.set('source', selectedSource);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalCount(data.total || 0);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentPage, selectedStatus, selectedSource, debouncedSearch, startDate, endDate]);
  
  // Create new lead
  const handleCreateLead = async () => {
    if (!newLead.name) {
      alert('Please enter a name');
      return;
    }
    setSavingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewLead({ name: '', email: '', phone: '', company: '', lead_type: 'individual', source: 'website', status: 'new', notes: '', interests: [] });
        fetchLeads();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create lead');
      }
    } catch (error) {
      console.error('Failed to create lead:', error);
    } finally {
      setSavingLead(false);
    }
  };
  
  // Quick date filters
  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setCurrentPage(1);
  };
  
  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Handle delete lead
  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(leads.filter(l => l.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  // Calculate stats from API stats (accurate counts)
  const displayedLeads = leads.length;
  const newLeadsCount = stats.byStatus['new'] || 0;
  const wonLeadsCount = (stats.byStatus['won'] || 0) + (stats.byStatus['sold_hot'] || 0) + (stats.byStatus['sold_cold'] || 0);
  const conversionRate = stats.total > 0 ? Math.round((wonLeadsCount / stats.total) * 100) : 0;

  // Source breakdown from API stats
  const sourceStats = leadSources.map(source => ({
    ...source,
    count: stats.bySource[source.id] || 0,
  }));

  // Leads are already filtered server-side, just use them directly
  const filteredLeads = leads;

  // Handle Excel file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Send to API
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: jsonData, clearExisting: false }),
      });

      const result = await res.json();
      if (res.ok) {
        setUploadResult({ imported: result.imported, errors: result.errors });
        fetchLeads();
      } else {
        setUploadResult({ imported: 0, errors: [result.error] });
      }
    } catch (error: any) {
      setUploadResult({ imported: 0, errors: [error.message] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Clear all leads
  const clearAllLeads = async () => {
    if (!confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) return;
    
    try {
      const res = await fetch('/api/leads/import', { method: 'DELETE' });
      if (res.ok) {
        fetchLeads();
        setShowUploadModal(false);
      }
    } catch (error) {
      console.error('Failed to clear leads:', error);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      { name: 'John Doe', email: 'john@example.com', phone: '+971501234567', company: 'ABC Corp', source: 'website', status: 'new', notes: 'Interested in cooking class' }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'leads_template.xlsx');
  };

  // Match payment links with leads
  const matchPaymentLinks = async () => {
    if (!confirm('This will create leads from payment links that don\'t match existing leads. Continue?')) return;
    
    try {
      setMatchingLeads(true);
      setMatchResult(null);
      const res = await fetch('/api/leads/match-payment-links', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMatchResult({ matched: data.matched, created: data.created, errors: data.errors });
        if (data.created > 0) {
          fetchLeads(); // Refresh leads list
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to match payment links');
      }
    } catch (error) {
      console.error('Failed to match payment links:', error);
    } finally {
      setMatchingLeads(false);
    }
  };

  const getSourceIcon = (sourceId: string) => {
    const source = leadSources.find(s => s.id === sourceId);
    return source ? source.icon : Globe;
  };

  const getSourceColor = (sourceId: string) => {
    const source = leadSources.find(s => s.id === sourceId);
    return source ? source.color : 'from-stone-500 to-stone-600';
  };

  const getStatusBadge = (statusId: string) => {
    const status = leadStatuses.find(s => s.id === statusId);
    return status ? status.bgLight : 'bg-stone-100 text-stone-700';
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-stone-900 via-stone-700 to-stone-900 bg-clip-text text-transparent">
            Lead Management
          </h1>
          <p className="text-stone-500 mt-1">Track and convert your prospects into customers</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-stone-900 to-stone-700 hover:from-stone-800 hover:to-stone-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 p-6 text-white hover:shadow-xl hover:shadow-stone-900/20 transition-all">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/10">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-stone-400 mt-1">Total Leads</p>
          </div>
        </div>

        {/* New Leads */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white hover:shadow-xl hover:shadow-blue-600/20 transition-all">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <UserPlus className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-bold">{newLeadsCount}</p>
            <p className="text-sm text-blue-200 mt-1">New Leads</p>
          </div>
        </div>

        {/* Won Leads */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white hover:shadow-xl hover:shadow-green-500/20 transition-all">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-bold">{wonLeadsCount}</p>
            <p className="text-sm text-green-200 mt-1">Won / Converted</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white hover:shadow-xl hover:shadow-violet-600/20 transition-all">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-bold">{conversionRate}%</p>
            <p className="text-sm text-violet-200 mt-1">Conversion Rate</p>
          </div>
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Sources Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-stone-900">Lead Sources</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {startDate && endDate ? `${startDate} - ${endDate}` : 'All Time'}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sourceStats.slice(0, 8).map((source) => {
              const Icon = source.icon;
              return (
                <div key={source.id} className="group cursor-pointer" onClick={() => setSelectedSource(source.id)}>
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${source.color} text-white transition-transform group-hover:scale-105 ${selectedSource === source.id ? 'ring-2 ring-white ring-offset-2' : ''}`}>
                    <Icon className="h-6 w-6 mb-2" />
                    <p className="text-2xl font-bold">{source.count}</p>
                    <p className="text-sm opacity-80">{source.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Import Leads */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-6">
            <Upload className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold">Import Leads</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-stone-400">
              Upload your customer data from Excel or CSV files.
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {uploading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Upload Excel File'}
            </Button>

            <Button 
              onClick={downloadTemplate}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>

            <Button 
              onClick={matchPaymentLinks}
              disabled={matchingLeads}
              variant="outline"
              className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-500/10"
            >
              {matchingLeads ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              {matchingLeads ? 'Matching...' : 'Match Payment Links'}
            </Button>

            {matchResult && (
              <div className={`p-3 rounded-lg ${matchResult.errors ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
                <p className="text-sm">
                  ✓ Matched {matchResult.matched}, Created {matchResult.created} leads
                </p>
                {matchResult.errors?.map((err, i) => (
                  <p key={i} className="text-xs text-amber-300 mt-1">{err}</p>
                ))}
              </div>
            )}

            {uploadResult && (
              <div className={`p-3 rounded-lg ${uploadResult.errors ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <p className="text-sm">
                  {uploadResult.imported > 0 ? `✓ Imported ${uploadResult.imported} leads` : 'Import failed'}
                </p>
                {uploadResult.errors?.map((err, i) => (
                  <p key={i} className="text-xs text-red-300 mt-1">{err}</p>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-white/10">
              <Button 
                onClick={clearAllLeads}
                variant="ghost"
                size="sm"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Leads
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search leads by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          
          <select 
            value={selectedSource}
            onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 sm:w-auto"
          >
            <option value="all">All Sources</option>
            {leadSources.map(source => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 sm:w-auto"
          >
            <option value="all">All Statuses</option>
            {leadStatuses.map(status => (
              <option key={status.id} value={status.id}>{status.name}</option>
            ))}
          </select>

          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex-1 sm:flex-none"
            >
              List
            </Button>
            <Button 
              variant={viewMode === 'kanban' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="flex-1 sm:flex-none"
            >
              Kanban
            </Button>
          </div>
        </div>
        
        {/* Date Filter */}
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-stone-100">
          <CalendarDays className="h-4 w-4 text-stone-400" />
          <span className="text-sm text-stone-500 mr-2">Date Range:</span>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
            <Button variant="outline" size="sm" onClick={() => setDateRange(7)}>Last 7 Days</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange(30)}>Last 30 Days</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange(90)}>Last 90 Days</Button>
          </div>
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:ml-2 sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="min-w-0 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="min-w-0 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={clearDateFilter} className="text-stone-500">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Leads List or Kanban */}
      {viewMode === 'list' ? (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden relative">
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Lead</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Source</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Company</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Type</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4">Last Contact</th>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLeads.map((lead) => {
                const SourceIcon = getSourceIcon(lead.source);
                return (
                  <tr key={lead.id} className="hover:bg-stone-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold">
                          {lead.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">{lead.name}</p>
                          <p className="text-sm text-stone-500">{lead.email || lead.phone || 'No contact'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${getSourceColor(lead.source)} text-white text-sm`}>
                        <SourceIcon className="h-4 w-4" />
                        {leadSources.find(s => s.id === lead.source)?.name || lead.source}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-stone-700 max-w-[200px] truncate">{lead.company || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-stone-700">{lead.lead_type || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusBadge(lead.status)}>
                        {leadStatuses.find(s => s.id === lead.status)?.name || lead.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-stone-500">
                        <Clock className="h-4 w-4" />
                        {lead.last_contacted_at ? formatDate(lead.last_contacted_at) : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/leads/${lead.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/leads/${lead.id}`)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteLead(lead.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-stone-100 md:hidden">
          {filteredLeads.map((lead) => {
            const SourceIcon = getSourceIcon(lead.source);
            return (
              <div key={lead.id} className="p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                    {lead.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">{lead.name}</p>
                        <p className="truncate text-sm text-stone-500">{lead.email || lead.phone || 'No contact'}</p>
                      </div>
                      <Badge className={`${getStatusBadge(lead.status)} shrink-0`}>
                        {leadStatuses.find(s => s.id === lead.status)?.name || lead.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gradient-to-r ${getSourceColor(lead.source)} px-2.5 py-1 text-xs text-white`}>
                        <SourceIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{leadSources.find(s => s.id === lead.source)?.name || lead.source}</span>
                      </span>
                      {lead.company && (
                        <span className="max-w-full truncate rounded-lg bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                          {lead.company}
                        </span>
                      )}
                      {lead.lead_type && (
                        <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                          {lead.lead_type}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
                      <div className="flex min-w-0 items-center gap-1 text-xs text-stone-500">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{lead.last_contacted_at ? formatDate(lead.last_contacted_at) : 'Never'}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/leads/${lead.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/leads/${lead.id}`)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteLead(lead.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500">No leads found</p>
            <p className="text-sm text-stone-400 mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-sm text-stone-500">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} leads
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span className="text-stone-600">Loading leads...</span>
            </div>
          </div>
        )}
      </div>
      ) : (
      /* Kanban View */
      <div className="min-w-0 pb-4 md:overflow-x-auto">
        <div className="grid gap-4 md:flex md:min-w-max">
          {leadStatuses.map((status) => {
            const statusLeads = filteredLeads.filter(l => l.status === status.id);
            const statusCount = stats.byStatus[status.id] || 0;
            return (
              <div key={status.id} className="min-w-0 bg-stone-50 rounded-2xl md:w-80 md:flex-shrink-0">
                <div className={`p-4 rounded-t-2xl ${status.color}`}>
                  <div className="flex items-center justify-between text-white">
                    <h3 className="font-semibold">{status.name}</h3>
                    <Badge className="bg-white/20 text-white border-0">{statusCount}</Badge>
                  </div>
                </div>
                <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
                  {statusLeads.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-sm">
                      No leads in this stage
                    </div>
                  ) : (
                    statusLeads.slice(0, 100).map((lead) => {
                      const SourceIcon = getSourceIcon(lead.source);
                      return (
                        <div
                          key={lead.id}
                          onClick={() => router.push(`/admin/leads/${lead.id}`)}
                          className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {lead.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-stone-900 truncate">{lead.name}</p>
                              <p className="text-sm text-stone-500 truncate">{lead.email || lead.phone || 'No contact'}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gradient-to-r ${getSourceColor(lead.source)} text-white text-xs`}>
                              <SourceIcon className="h-3 w-3" />
                              {leadSources.find(s => s.id === lead.source)?.name || lead.source}
                            </div>
                            {lead.company && (
                              <span className="text-xs text-stone-500 truncate max-w-[100px]">{lead.company}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {statusLeads.length > 100 && (
                    <div className="text-center py-2 text-stone-500 text-sm">
                      +{statusLeads.length - 100} more leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Loading Overlay for Kanban */}
        {loading && (
          <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50 pointer-events-none">
            <div className="flex items-center gap-3 bg-white rounded-xl px-6 py-4 shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span className="text-stone-600">Loading leads...</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Pipeline Summary */}
      <div className="min-w-0 bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6">
        <h3 className="font-semibold text-stone-900 mb-4">Pipeline Overview</h3>
        <div className="hidden items-start gap-2 sm:flex">
          {leadStatuses.slice(0, -1).map((status, i) => {
            const count = stats.byStatus[status.id] || 0;
            const width = stats.total > 0 ? Math.max((count / stats.total) * 100, 5) : 5;
            return (
              <div key={status.id} className="flex-1" style={{ flex: width }}>
                <div className={`h-3 ${status.color} ${i === 0 ? 'rounded-l-full' : ''} ${i === leadStatuses.length - 2 ? 'rounded-r-full' : ''}`} />
                <div className="mt-2 flex min-w-0 justify-between gap-1">
                  <span className="truncate text-xs text-stone-500">{status.name}</span>
                  <span className="text-xs font-medium text-stone-700">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-3 sm:hidden">
          {leadStatuses.slice(0, -1).map((status) => {
            const count = stats.byStatus[status.id] || 0;
            const width = stats.total > 0 ? Math.max((count / stats.total) * 100, 5) : 5;
            return (
              <div key={status.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-stone-500">{status.name}</span>
                  <span className="text-xs font-medium text-stone-700">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full ${status.color}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-900">Add New Lead</h2>
                <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  Name *
                </label>
                <input
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="+971 50 123 4567"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Company
                </label>
                <input
                  type="text"
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Company name"
                />
              </div>

              {/* Lead Type */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Lead Type</label>
                <select
                  value={newLead.lead_type}
                  onChange={(e) => setNewLead({ ...newLead, lead_type: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="individual">Individual</option>
                  <option value="corporate">Corporate</option>
                  <option value="group">Group</option>
                </select>
              </div>

              {/* Interest */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Interest</label>
                <div className="flex flex-wrap gap-2">
                  {['Kids Birthday', 'Camp', 'Walk-Ins', 'Adult Private Classes', 'Team-Building', 'Nanny Classes', 'Rental'].map(interest => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => {
                        const current = newLead.interests || [];
                        if (current.includes(interest)) {
                          setNewLead({ ...newLead, interests: current.filter(i => i !== interest) });
                        } else {
                          setNewLead({ ...newLead, interests: [...current, interest] });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        (newLead.interests || []).includes(interest)
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Source *</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {leadSources.map(source => (
                    <option key={source.id} value={source.id}>{source.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Status *</label>
                <select
                  value={newLead.status}
                  onChange={(e) => setNewLead({ ...newLead, status: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {leadStatuses.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  <StickyNote className="h-4 w-4 inline mr-1" />
                  Notes
                </label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Additional notes about this lead..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-stone-200 bg-stone-50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateLead}
                disabled={savingLead || !newLead.name}
                className="bg-gradient-to-r from-stone-900 to-stone-700"
              >
                {savingLead ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {savingLead ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
