'use client';

import { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { IssueType, VisualAnomaly, PageContext, ReportAPIResponse } from './types';

interface IssueReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext: PageContext | null;
  anomalies: VisualAnomaly[];
}

const ISSUE_TYPES: { value: IssueType; label: string; description: string }[] = [
  { value: 'incorrect', label: 'Incorrect Data', description: 'The displayed data appears to be wrong' },
  { value: 'missing', label: 'Missing Data', description: 'Expected data is not showing' },
  { value: 'stale', label: 'Stale Data', description: 'The data appears outdated' },
  { value: 'other', label: 'Other', description: 'Something else is wrong' },
];

const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low', description: 'I think something might be off' },
  { value: 'medium', label: 'Medium', description: "I'm fairly confident there's an issue" },
  { value: 'high', label: 'High', description: "I'm certain this is incorrect" },
];

export function IssueReportForm({ isOpen, onClose, pageContext, anomalies }: IssueReportFormProps) {
  const [issueType, setIssueType] = useState<IssueType>('incorrect');
  const [description, setDescription] = useState('');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/trust/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: issueType,
          description: description.trim(),
          confidence,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          pageTitle: pageContext?.pageTitle || document?.title || 'Unknown',
          assetName: pageContext?.assetName,
          anomalies,
          timestamp: new Date().toISOString(),
        }),
      });

      const result: ReportAPIResponse = await response.json();

      if (result.success) {
        setSubmitResult({
          success: true,
          message: `Issue reported successfully${result.issueId ? ` (ID: ${result.issueId})` : ''}`,
        });
        // Reset form after success
        setTimeout(() => {
          setDescription('');
          setIssueType('incorrect');
          setConfidence('medium');
          onClose();
        }, 2000);
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to report issue',
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Report Data Issue
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setIssueType(type.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    issueType === type.value
                      ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900">{type.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe what you noticed is wrong with the data..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence Level
            </label>
            <div className="flex gap-2">
              {CONFIDENCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setConfidence(level.value as 'low' | 'medium' | 'high')}
                  className={`flex-1 px-3 py-2 rounded-lg border text-center transition-all ${
                    confidence === level.value
                      ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900">{level.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-captured context */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Auto-captured Context</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>
                <span className="text-gray-400">Page:</span> {pageContext?.pageTitle || 'Unknown'}
              </p>
              {pageContext?.assetName && (
                <p>
                  <span className="text-gray-400">Asset:</span> {pageContext.assetName}
                </p>
              )}
              <p>
                <span className="text-gray-400">Anomalies:</span> {anomalies.length} detected
              </p>
            </div>
          </div>

          {/* Submit Result */}
          {submitResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                submitResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {submitResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span className="text-sm">{submitResult.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
