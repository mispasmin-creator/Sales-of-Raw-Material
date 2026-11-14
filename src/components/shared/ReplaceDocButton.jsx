import React, { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import db from '../../lib/db';
import { useApp } from '../../context/AppContext';
import { hasPageAccess } from '../../lib/utils';

const LABELS = { PO: 'PO Copy', Bilty: 'Bilty Copy', Invoice: 'Invoice Copy' };
const MAX_SIZE_MB = 10;

/**
 * Admin-only control to replace an already uploaded PO / Bilty / Invoice copy.
 * kind: 'PO' | 'Bilty' | 'Invoice'. Renders nothing for non-admin users.
 */
export const ReplaceDocButton = ({ kind, orderNo, onReplaced, className = '' }) => {
  const { userRole, currentUser, addNotification } = useApp();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!hasPageAccess(userRole, 'Admin')) return null;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      addNotification('File Too Large', `Please choose a file under ${MAX_SIZE_MB} MB.`, 'error');
      return;
    }
    if (!confirm(`Replace the existing ${LABELS[kind]} of ${orderNo} with "${file.name}"?`)) return;

    setBusy(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('Failed to read the selected file.'));
        reader.readAsDataURL(file);
      });
      await db.replaceDocument(kind, orderNo, { base64, name: file.name, type: file.type }, userRole, currentUser?.user_name);
      addNotification('Document Replaced', `${LABELS[kind]} for ${orderNo} updated.`, 'success');
      if (onReplaced) await onReplaced();
    } catch (err) {
      console.error('Failed to replace document', err);
      addNotification('Replace Failed', err.message || 'Could not replace the document.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={`Replace ${LABELS[kind]} (Admin only)`}
        className={`inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50 ${className}`}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
        <span>{busy ? 'Uploading...' : 'Replace'}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
};

export default ReplaceDocButton;
