import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPDFs, uploadPDF } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, FileText, ArrowRight, Inbox } from 'lucide-react';

const Dashboard = () => {
  const [pdfs, setPdfs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const extractName = (name) => name || 'Untitled Document';

  return (
    <div className="pt-[64px]">
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* --- Upload Section --- */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md border">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Upload New PDF</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              id="file-upload-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="flex-grow w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#f3f0ff] file:text-[#8e71f8] hover:file:bg-[#e8e2ff]"
            />
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#8e71f8] hover:bg-[#7e61e0] text-white font-semibold py-2 px-5 rounded-md transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Processing...' : 'Upload & Summarize'}
            </button>
          </div>
        </div>

        {/* --- Display Section --- */}
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">All Files ({pdfs.length})</h2>
          <button
            onClick={fetchPdfs}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8e71f8]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-center">
            <p>{error}</p>
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
            <Inbox className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">Upload your first PDF to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pdfs.map((pdf) => (
              <div
                key={pdf._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border flex flex-col justify-between"
              >
                <div>
                  <FileText className="h-10 w-10 text-[#8e71f8] mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 break-words">
                    {extractName(pdf.filename)}
                  </h3>
                  <span className="text-xs text-gray-500">
                    Uploaded on: {new Date(pdf.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-6">
                  <Link
                    to={`/pdf/${pdf._id}`}
                    className="w-full inline-flex justify-center items-center gap-2 bg-[#8e71f8] hover:bg-[#7e61e0] text-white font-medium py-2 px-4 rounded-md transition text-sm"
                  >
                    View Details
                    <ArrowRight size={16} />
                  </Link>
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
