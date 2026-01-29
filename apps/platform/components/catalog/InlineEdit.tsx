'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil, Plus, Loader2 } from 'lucide-react';
import { Button } from '@amygdala/ui';

// ========== INLINE TEXT EDIT ==========
interface InlineTextEditProps {
  value: string | undefined;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function InlineTextEdit({
  value,
  onSave,
  placeholder = 'Click to edit',
  className = '',
  label,
}: InlineTextEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="flex-1 px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 cursor-pointer ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span className={`text-sm ${value ? 'text-gray-900 dark:text-white' : 'text-yellow-600 italic'}`}>
        {value || placeholder}
      </span>
      <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ========== INLINE SELECT EDIT ==========
interface InlineSelectEditProps {
  value: string | undefined;
  options: { value: string; label: string; color?: string }[];
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export function InlineSelectEdit({
  value,
  options,
  onSave,
  placeholder = 'Select...',
  className = '',
}: InlineSelectEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async (newValue: string) => {
    setIsSaving(true);
    try {
      await onSave(newValue);
      setIsEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentOption = options.find((o) => o.value === value);

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <select
          ref={selectRef}
          value={value || ''}
          onChange={(e) => handleSave(e.target.value)}
          disabled={isSaving}
          className="px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(false)}
          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Color classes for classifications
  const colorClasses: Record<string, string> = {
    restricted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    confidential: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    internal: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    public: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <div
      className={`group flex items-center gap-2 cursor-pointer ${className}`}
      onClick={() => setIsEditing(true)}
    >
      {currentOption ? (
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${
            colorClasses[value || ''] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {currentOption.label}
        </span>
      ) : (
        <span className="text-sm text-yellow-600 italic">{placeholder}</span>
      )}
      <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ========== TAG INPUT ==========
interface TagInputProps {
  tags: string[];
  onSave: (tags: string[]) => Promise<void>;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
  tagColors?: Record<string, string>;
}

export function TagInput({
  tags,
  onSave,
  suggestions = [],
  placeholder = 'Add tag...',
  className = '',
  tagColors = {},
}: TagInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) return;

    setIsSaving(true);
    try {
      await onSave([...tags, trimmedTag]);
      setInputValue('');
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    setIsSaving(true);
    try {
      await onSave(tags.filter((t) => t !== tagToRemove));
    } catch (err) {
      console.error('Failed to remove tag:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !tags.includes(s) &&
      s.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Default classification tag colors (Atlan-inspired)
  const defaultTagColors: Record<string, string> = {
    PII: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200',
    PHI: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200',
    PCI: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
    Sensitive: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
    Confidential: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
    Internal: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200',
    Public: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200',
    ...tagColors,
  };

  const getTagColor = (tag: string) => {
    return defaultTagColors[tag] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200';
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${getTagColor(tag)}`}
        >
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            disabled={isSaving}
            className="ml-0.5 hover:text-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {isEditing ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            disabled={isSaving}
            className="w-24 px-2 py-0.5 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10 max-h-32 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleAddTag(suggestion)}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className={`inline-block px-1.5 py-0.5 rounded ${getTagColor(suggestion)}`}>
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  );
}
