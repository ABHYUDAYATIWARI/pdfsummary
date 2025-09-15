import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPDFs, uploadPDF, deletePDFById } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, FileText, ArrowRight, Inbox, Upload, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const [pdfs, setPdfs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchPdfs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await getPDFs();
      setPdfs(data || []);
    } catch (err) {
      setError('Failed to fetch your documents.');
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast.error('Please select a valid PDF file.');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const toastId = toast.loading('Uploading and summarizing PDF...');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      await uploadPDF(formData);
      toast.success('File uploaded successfully!', { id: toastId });
      setSelectedFile(null);
      await fetchPdfs();
    } catch (err) {
      toast.error('Upload failed. Please try again.', { id: toastId });
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
      document.getElementById('file-upload-input').value = '';
    }
  };

  const handleDelete = async (pdfId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(pdfId));
    const toastId = toast.loading('Deleting document...');

    try {
      await deletePDFById(pdfId);
      toast.success('Document deleted successfully!', { id: toastId });
      setPdfs(prev => prev.filter(pdf => pdf._id !== pdfId));
    } catch (err) {
      toast.error('Failed to delete document. Please try again.', { id: toastId });
      console.error('Delete failed', err);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(pdfId);
        return newSet;
      });
    }
  };

  const extractName = (name) => name || 'Untitled Document';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16 mt-[-40px]">
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Dashboard</h1>
          <p className="text-gray-600">Upload, manage, and chat with your PDF documents</p>
        </div>

        <div className="mb-8 p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="h-6 w-6 text-[#8e71f8]" />
            <h3 className="text-xl font-semibold text-gray-800">Upload New PDF</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-grow w-full relative">
              <input
                id="file-upload-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-[#8e71f8] file:to-[#7e61e0] file:text-white hover:file:from-[#7e61e0] hover:file:to-[#6b4fd6] file:transition-all file:cursor-pointer cursor-pointer border border-gray-300 rounded-lg p-3 hover:border-[#8e71f8] transition-colors"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Selected: {selectedFile.name}
                </div>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#8e71f8] to-[#7e61e0] hover:from-[#7e61e0] hover:to-[#6b4fd6] text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#8e71f8] disabled:hover:to-[#7e61e0] shadow-sm hover:shadow-md"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Upload & Summarize
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Your Documents</h2>
            <p className="text-gray-600 text-sm mt-1">{pdfs.length} document{pdfs.length !== 1 ? 's' : ''} available</p>
          </div>
          <button
            onClick={fetchPdfs}
            disabled={isLoading}
            className="p-3 text-gray-600 hover:bg-white hover:text-[#8e71f8] rounded-full transition-all border border-gray-200 hover:border-[#8e71f8] shadow-sm hover:shadow-md"
            title="Refresh documents"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#8e71f8] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your documents...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-5 w-5 bg-red-500 rounded-full"></div>
              <h3 className="font-semibold">Error</h3>
            </div>
            <p>{error}</p>
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300 shadow-sm">
            <Inbox className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-500 mb-6">Upload your first PDF to start analyzing and chatting with your documents.</p>
            <div className="inline-flex items-center gap-2 text-[#8e71f8] font-medium">
              <Upload className="h-4 w-4" />
              Use the upload section above to get started
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pdfs.map((pdf) => (
              <div
                key={pdf._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 hover:border-[#8e71f8] group"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-gradient-to-br from-[#8e71f8] to-[#7e61e0] rounded-lg shadow-sm">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="text-lg font-semibold text-gray-800 truncate group-hover:text-[#8e71f8] transition-colors">
                          {extractName(pdf.filename)}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleDelete(pdf._id)}
                        disabled={deletingIds.has(pdf._id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete document"
                      >
                        {deletingIds.has(pdf._id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>Uploaded: {new Date(pdf.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <Link
                      to={`/pdf/${pdf._id}`}
                      className="w-full inline-flex justify-center items-center gap-2 bg-gradient-to-r from-[#8e71f8] to-[#7e61e0] hover:from-[#7e61e0] hover:to-[#6b4fd6] text-white font-semibold py-3 px-4 rounded-lg transition-all text-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                      View & Chat
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;