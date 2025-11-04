import React from 'react';
import type { Edit } from '../App';
import { PlusIcon, Trash2Icon } from './icons';

interface EditFormProps {
  edits: Edit[];
  setEdits: React.Dispatch<React.SetStateAction<Edit[]>>;
}

const EditForm: React.FC<EditFormProps> = ({ edits, setEdits }) => {

  const handleEditChange = (id: number, field: 'find' | 'replace', value: string) => {
    setEdits(currentEdits =>
      currentEdits.map(edit =>
        edit.id === id ? { ...edit, [field]: value } : edit
      )
    );
  };

  const addEditField = () => {
    setEdits([...edits, { id: Date.now(), find: '', replace: '' }]);
  };

  const removeEditField = (id: number) => {
    setEdits(edits.filter(edit => edit.id !== id));
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
      <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Find and Replace Text</h2>
      <div className="space-y-4">
        {edits.map((edit, index) => (
          <div key={edit.id} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Find Text"
                value={edit.find}
                onChange={(e) => handleEditChange(edit.id, 'find', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="text"
                placeholder="Replace With"
                value={edit.replace}
                onChange={(e) => handleEditChange(edit.id, 'replace', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              onClick={() => removeEditField(edit.id)}
              disabled={edits.length <= 1}
              className="p-2 text-slate-500 hover:text-red-500 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              aria-label="Remove entry"
              title="Remove entry"
            >
              <Trash2Icon className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <button
          onClick={addEditField}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/50 rounded-md hover:bg-sky-200 dark:hover:bg-sky-900 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Another
        </button>
      </div>
    </div>
  );
};

export default EditForm;
