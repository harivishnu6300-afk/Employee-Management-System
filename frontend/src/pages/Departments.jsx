import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Users,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Building
} from 'lucide-react';
import { departmentService } from '../services/departmentService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function Departments() {
  const { isAdmin, isHR } = useAuth();
  const { showSuccess, showError } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'Active'
  });
  const [formLoading, setFormLoading] = useState(false);

  // View Members Modal
  const [viewDept, setViewDept] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await departmentService.getAll();
      if (res.success) {
        setDepartments(res.departments || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setForm({ name: '', code: '', description: '', status: 'Active' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      status: dept.status
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      showError('Department name and code are required.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingDept) {
        await departmentService.update(editingDept.id, form);
        showSuccess('Department updated successfully.');
      } else {
        await departmentService.create(form);
        showSuccess('New department created successfully.');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      showError(err.message || 'Failed to save department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (dept) => {
    if (dept.employee_count > 0) {
      showError(
        `Cannot delete department: ${dept.employee_count} employee(s) are assigned to it. Reassign employees before deletion.`
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the department "${dept.name}"?`)) {
      return;
    }

    try {
      await departmentService.delete(dept.id);
      showSuccess('Department deleted successfully.');
      fetchDepartments();
    } catch (err) {
      showError(err.message || 'Failed to delete department.');
    }
  };

  const handleViewMembers = async (dept) => {
    setViewDept(dept);
    setMembersLoading(true);
    try {
      const res = await departmentService.getById(dept.id);
      if (res.success) {
        setDeptEmployees(res.employees || []);
      }
    } catch (err) {
      showError('Failed to fetch department staff list.');
    } finally {
      setMembersLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Departments & Divisions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage organizational departments, staffing distribution, and functional units.
          </p>
        </div>

        {(isAdmin || isHR) && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
        )}
      </div>

      {/* Departments Grid */}
      {loading ? (
        <LoadingSpinner text="Loading departments..." />
      ) : departments.length === 0 ? (
        <EmptyState
          title="No departments found"
          description="Create your first company department to start organizing teams."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold font-mono text-sm">
                      {dept.code}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{dept.name}</h4>
                      <Badge variant={dept.status} size="sm">
                        {dept.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                  {dept.description || 'No description provided for this department.'}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dept.employee_count} Team Members</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {dept.active_employee_count} Active
                  </span>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  onClick={() => handleViewMembers(dept)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
                >
                  <Eye className="w-3.5 h-3.5" /> View Staff ({dept.employee_count})
                </button>

                {(isAdmin || isHR) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                      title="Edit Department"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(dept)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title={
                          dept.employee_count > 0
                            ? 'Cannot delete: staff assigned'
                            : 'Delete Department'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? `Edit Department (${editingDept.code})` : 'Create Department'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Artificial Intelligence Research"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. AIR"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-mono text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Primary charter and functional scope..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Staff in Department Modal */}
      {viewDept && (
        <Modal
          isOpen={!!viewDept}
          onClose={() => setViewDept(null)}
          title={`Staff in ${viewDept.name} (${deptEmployees.length})`}
          maxWidth="max-w-lg"
        >
          {membersLoading ? (
            <LoadingSpinner text="Loading department roster..." />
          ) : deptEmployees.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No employees currently assigned to this department.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {deptEmployees.map((emp) => (
                <div key={emp.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {emp.avatar_url ? (
                      <img
                        src={emp.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {emp.first_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {emp.designation} &bull; {emp.employee_code}
                      </p>
                    </div>
                  </div>
                  <Badge variant={emp.status} size="sm">
                    {emp.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
