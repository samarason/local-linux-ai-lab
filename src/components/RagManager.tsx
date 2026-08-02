import React, { useState } from 'react';
import { RAGDocument, DistroTag } from '../types';
import { Database, Plus, Trash2, Search, FileText, Upload, RefreshCw, CheckCircle, Tag } from 'lucide-react';

interface RagManagerProps {
  documents: RAGDocument[];
  onIngestDocument: (doc: {
    title: string;
    content: string;
    distroTag: DistroTag;
    source: string;
  }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onPurgeAll: () => Promise<void>;
}

export const RagManager: React.FC<RagManagerProps> = ({
  documents,
  onIngestDocument,
  onDeleteDocument,
  onPurgeAll,
}) => {
  const [filterTag, setFilterTag] = useState<'all' | DistroTag>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // New Document Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDistroTag, setNewDistroTag] = useState<DistroTag>('universal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const filteredDocs = documents.filter((doc) => {
    const matchesTag = filterTag === 'all' || doc.distroTag === filterTag;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      setNewContent(text || 'Extracted PDF/Text content from document file.');
    };
    reader.readAsText(file);
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onIngestDocument({
        title: newTitle.trim(),
        content: newContent.trim(),
        distroTag: newDistroTag,
        source: 'User Upload / PyPDF Ingest',
      });
      setSuccessMsg(`Document "${newTitle}" successfully chunked & stored in ChromaDB!`);
      setNewTitle('');
      setNewContent('');
      setIsAdding(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Ingest error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Vector Store Context & RAG Index
          </h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            ChromaDB vector store embeddings partitioned by distribution tags
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="add-doc-btn"
            onClick={() => setIsAdding(!isAdding)}
            className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-3 py-1.5 rounded text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Close Ingest' : '+ Add PDF / Doc'}
          </button>

          <button
            id="purge-vector-store-btn"
            onClick={() => {
              if (confirm('Are you sure you want to purge all vector chunks?')) {
                onPurgeAll();
              }
            }}
            className="bg-[#2A2A2E] hover:bg-rose-950/60 hover:text-rose-300 text-gray-400 border border-[#3A3A3F] font-mono text-[10px] uppercase px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Purge Store
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-cyan-950/30 border border-cyan-800/80 text-cyan-300 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 font-mono">
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Data Form */}
      {isAdding && (
        <div className="bg-[#16161A] border border-cyan-500/50 rounded-xl p-4 shadow-2xl space-y-3 animate-fade-in">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 font-mono">
            <Upload className="w-4 h-4" />
            Ingest Document into ChromaDB Context
          </h3>

          <form onSubmit={handleIngestSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                  Document Title / Man-Page Name
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., RHEL 9 SELinux Hardening Guide"
                  className="w-full bg-black border border-[#2A2A2E] rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                  Distribution Tag
                </label>
                <select
                  value={newDistroTag}
                  onChange={(e) => setNewDistroTag(e.target.value as DistroTag)}
                  className="w-full bg-black border border-[#2A2A2E] rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-sans"
                >
                  <option value="universal">Universal (All Linux)</option>
                  <option value="debian">Debian / Ubuntu Family</option>
                  <option value="redhat">Red Hat / RHEL Family</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                Upload File or Paste Text
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.gz,.yaml"
                  onChange={handleFileUpload}
                  className="text-xs text-gray-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-mono file:uppercase file:bg-[#2A2A2E] file:text-gray-200 hover:file:bg-[#3A3A3F] cursor-pointer"
                />
                <span className="text-gray-500 text-[10px] font-mono">PyPDF / Text Extraction</span>
              </div>

              <textarea
                rows={5}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste man-page documentation text or Linux admin instructions here..."
                className="w-full bg-black border border-[#2A2A2E] rounded p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded text-xs uppercase font-mono text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-4 py-1.5 rounded text-xs uppercase tracking-wider flex items-center gap-1.5 shadow"
              >
                {isSubmitting ? 'Ingesting...' : 'Ingest & Embed'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] uppercase font-mono text-gray-500">Filter:</span>
          <button
            onClick={() => setFilterTag('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
              filterTag === 'all'
                ? 'bg-[#2A2A2E] text-white border border-gray-600'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All ({documents.length})
          </button>
          <button
            onClick={() => setFilterTag('debian')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
              filterTag === 'debian'
                ? 'bg-[#2A2A2E] text-rose-300 border border-rose-500/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Debian
          </button>
          <button
            onClick={() => setFilterTag('redhat')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
              filterTag === 'redhat'
                ? 'bg-[#2A2A2E] text-amber-300 border border-amber-500/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Red Hat
          </button>
          <button
            onClick={() => setFilterTag('universal')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
              filterTag === 'universal'
                ? 'bg-[#2A2A2E] text-cyan-300 border border-cyan-500/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Universal
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search docs & chunks..."
            className="w-full bg-black border border-[#2A2A2E] rounded pl-8 pr-3 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-sans"
          />
        </div>
      </div>

      {/* Document Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-[#111114] border border-[#2A2A2E] hover:border-[#3A3A3F] rounded-lg p-3.5 space-y-2 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h4 className="text-xs font-mono font-semibold text-gray-200 line-clamp-1">{doc.title}</h4>
                </div>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase shrink-0 border ${
                    doc.distroTag === 'debian'
                      ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                      : doc.distroTag === 'redhat'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                        : 'bg-cyan-950/40 text-cyan-300 border-cyan-800'
                  }`}
                >
                  {doc.distroTag}
                </span>
              </div>

              <p className="text-[11px] text-gray-400 font-mono bg-black/60 p-2.5 rounded line-clamp-3 mb-2 border border-[#2A2A2E]">
                {doc.content}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-[#2A2A2E] font-mono uppercase">
              <span>
                {doc.chunkCount} vector chunks • {doc.fileSize}
              </span>
              <button
                onClick={() => onDeleteDocument(doc.id)}
                className="text-gray-600 hover:text-rose-400 font-mono text-xs px-1"
                title="Delete document"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
