import React, { useState } from 'react';
import Modal from '../common/Modal';
import { AlertTriangle, Trash2, UserX } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../../context/ToastContext';

export default function DeleteConfirmModal({ isOpen, onClose, employee, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [permanent, setPermanent] = useState(false);

  if (!employee) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await employeeService.delete(employee.id, permanent);
      showSuccess(res.message || 'Action executed successfully.');
      onSuccess();
      onClose();
    } catch (err) {
      showError(err.message || 'Could not perform operation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Account Action"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Confirm Action for {employee.first_name} {employee.last_name}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Employee ID: <span className="font-mono font-semibold">{employee.employee_code}</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          By default, the employee will be marked as <strong className="text-slate-800">Inactive</strong>, preserving their historical attendance records and leave logs.
        </p>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-rose-700">Permanent delete:</span> Completely wipe employee record and associated portal login.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 ${
              permanent ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {permanent ? <Trash2 className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
            {loading ? 'Processing...' : permanent ? 'Permanently Delete' : 'Deactivate Employee'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
