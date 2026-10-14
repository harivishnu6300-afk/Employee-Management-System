import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Users,
  CalendarCheck,
  CalendarDays,
  Building2,
  Filter,
  Printer
} from 'lucide-react';
import { reportService } from '../services/reportService';
import { departmentService } from '../services/departmentService';
import { useToast } from '../context/ToastContext';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function Reports() {
  const { showError, showSuccess } = useToast();

  const [activeReport, setActiveReport] = useState('employees'); // employees | attendance | leaves | departments
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  // Filter parameters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    departmentService.getAll().then((res) => {
      if (res.success) setDepartments(res.departments || []);
    });
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = { startDate, endDate, department, status };
      let res;

      if (activeReport === 'employees') {
        res = await reportService.getEmployeeReport(params);
      } else if (activeReport === 'attendance') {
        res = await reportService.getAttendanceReport(params);
      } else if (activeReport === 'leaves') {
        res = await reportService.getLeaveReport(params);
      } else if (activeReport === 'departments') {
        res = await reportService.getDepartmentReport(params);
      }

      if (res && res.data) {
        setReportData(res.data);
      } else {
        setReportData([]);
      }
    } catch (err) {
      showError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, startDate, endDate, department, status]);

  const handleDownloadCSV = () => {
    reportService.downloadCSV(activeReport, { startDate, endDate, department, status });
    showSuccess(`Exporting ${activeReport} report as CSV...`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Analytics & Corporate Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export operational, attendance, and staffing intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'employees', label: 'Employee Registry', icon: Users, desc: 'Headcount & roles' },
          { key: 'attendance', label: 'Attendance Audit', icon: CalendarCheck, desc: 'Shift timings & hours' },
          { key: 'leaves', label: 'Leave Summary', icon: CalendarDays, desc: 'Vacation & requests' },
          { key: 'departments', label: 'Department Payroll', icon: Building2, desc: 'Staffing & compensation' }
        ].map((rep) => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.key;
          return (
            <button
              key={rep.key}
              onClick={() => setActiveReport(rep.key)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isActive
                  ? 'border-brand-500 bg-brand-50/70 shadow-sm ring-1 ring-brand-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
              <p className={`font-semibold text-xs ${isActive ? 'text-brand-900' : 'text-slate-800'}`}>
                {rep.label}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{rep.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Filter Parameters Controls */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status Filter
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Present">Present</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generated Report Table Display */}
      <Card
        title={`Generated Report (${reportData.length} records)`}
        subtitle="Live MySQL aggregated dataset ready for analysis and export"
      >
        {loading ? (
          <LoadingSpinner text="Compiling report query..." />
        ) : reportData.length === 0 ? (
          <EmptyState
            title="No records matching filter parameters"
            description="Adjust date ranges or clear status filters to retrieve data."
          />
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            {/* EMPLOYEES REPORT */}
            {activeReport === 'employees' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Joined</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">{row.employee_code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.full_name}</td>
                      <td className="py-2 px-3">{row.email}</td>
                      <td className="py-2 px-3">{row.department}</td>
                      <td className="py-2 px-3">{row.designation}</td>
                      <td className="py-2 px-3">{row.role}</td>
                      <td className="py-2 px-3">{row.employment_type}</td>
                      <td className="py-2 px-3 font-mono">{row.joining_date}</td>
                      <td className="py-2 px-3"><Badge variant={row.status} size="sm">{row.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ATTENDANCE REPORT */}
            {activeReport === 'attendance' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Check In</th>
                    <th className="py-2.5 px-3">Check Out</th>
                    <th className="py-2.5 px-3">Hours</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">{row.date}</td>
                      <td className="py-2 px-3 font-mono">{row.employee_code}</td>
                      <td className="py-2 px-3 font-semibold">{row.full_name}</td>
                      <td className="py-2 px-3">{row.department}</td>
                      <td className="py-2 px-3 font-mono">{row.check_in_time || '-'}</td>
                      <td className="py-2 px-3 font-mono">{row.check_out_time || '-'}</td>
                      <td className="py-2 px-3 font-bold font-mono text-slate-800">{row.working_hours}h</td>
                      <td className="py-2 px-3"><Badge variant={row.status} size="sm">{row.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* LEAVES REPORT */}
            {activeReport === 'leaves' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Leave Type</th>
                    <th className="py-2.5 px-3">Start Date</th>
                    <th className="py-2.5 px-3">End Date</th>
                    <th className="py-2.5 px-3">Days</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono">{row.employee_code}</td>
                      <td className="py-2 px-3 font-semibold">{row.full_name}</td>
                      <td className="py-2 px-3">{row.department}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.leave_type}</td>
                      <td className="py-2 px-3 font-mono">{row.start_date}</td>
                      <td className="py-2 px-3 font-mono">{row.end_date}</td>
                      <td className="py-2 px-3 font-bold">{row.total_days}</td>
                      <td className="py-2 px-3"><Badge variant={row.status} size="sm">{row.status}</Badge></td>
                      <td className="py-2 px-3 max-w-xs truncate">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* DEPARTMENTS REPORT */}
            {activeReport === 'departments' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Department Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Total Staff</th>
                    <th className="py-2.5 px-3">Active Staff</th>
                    <th className="py-2.5 px-3">Total Payroll ($)</th>
                    <th className="py-2.5 px-3">Average Salary ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="py-2 px-3"><Badge variant={row.status} size="sm">{row.status}</Badge></td>
                      <td className="py-2 px-3 font-bold">{row.total_employees}</td>
                      <td className="py-2 px-3 text-emerald-700 font-semibold">{row.active_employees}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        ${parseFloat(row.total_monthly_payroll || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        ${parseFloat(row.avg_salary || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
