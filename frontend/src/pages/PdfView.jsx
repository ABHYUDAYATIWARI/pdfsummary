import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPDFById, chatWithPDF } from '../services/api';
import { Send, FileText, MessageSquare, ArrowLeft, Bot, User } from 'lucide-react';

const PdfView = () => {
    const { id } = useParams();
    const [pdf, setPdf] = useState(null);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const chatEndRef = useRef(null);

    const fetchPdf = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const { data } = await getPDFById(id);
            setPdf(data);
            console.log('Fetched PDF data:', data);
        } catch (error) {
            console.error('Failed to fetch PDF', error);
            setError('Failed to load document. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPdf();
    }, [id]);

    useEffect(() => {
        const chatContainer = document.getElementById("chat-container");
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [pdf?.chatHistory]);

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSending(true);
        try {
            await chatWithPDF(id, message);
            setMessage('');
            await fetchPdf(); // refresh chat
        } catch (error) {
            console.error('Chat submission failed', error);
        } finally {
            setIsSending(false);
        }
    };

    const parseMessageContent = (chatMessage) => {
        try {
            const parsed = JSON.parse(chatMessage.parts[0].text);
            return parsed.answer || parsed.error || chatMessage.parts[0].text;
        } catch (e) {
            return chatMessage.parts[0].text;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#8e71f8] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading document...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
                        <h3 className="font-semibold mb-2">Error Loading Document</h3>
                        <p>{error}</p>
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 mt-4 text-[#8e71f8] hover:text-[#7e61e0] font-medium"
                        >
                            <ArrowLeft size={16} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!pdf) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                
                {/* Header */}
                <div className="mb-6">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-[#8e71f8] hover:text-[#7e61e0] font-medium mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-[#8e71f8] to-[#7e61e0] rounded-lg shadow-sm">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {pdf.filename || 'Untitled Document'}
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Uploaded on {new Date(pdf.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Summary Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8 h-fit">
                        <div className="flex items-center gap-3 mb-6">
                            <FileText className="h-6 w-6 text-[#8e71f8]" />
                            <h2 className="text-xl font-semibold text-gray-800">Document Summary</h2>
                        </div>
                        <div className="prose prose-gray max-w-none">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {pdf.summary}
                            </p>
                        </div>
                    </div>

                    {/* Chat Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-200px)] lg:h-[600px]">
                        
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
                            <MessageSquare className="h-6 w-6 text-[#8e71f8]" />
                            <h2 className="text-xl font-semibold text-gray-800">Chat with Document</h2>
                        </div>

                        {/* Chat Messages */}
                        <div
                            className="flex-1 overflow-y-auto p-6 space-y-4"
                            id="chat-container"
                        >
                            {pdf.chatHistory && pdf.chatHistory.length === 0 ? (
                                <div className="text-center py-8">
                                    <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <p className="text-gray-600">
                                        Start a conversation by asking questions about this document.
                                    </p>
                                </div>
                            ) : (
                                pdf.chatHistory?.map((chat, index) => (
                                    <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-start gap-3 max-w-[80%] ${chat.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                chat.role === 'user' 
                                                    ? 'bg-gradient-to-r from-[#8e71f8] to-[#7e61e0]' 
                                                    : 'bg-gray-100'
                                            }`}>
                                                {chat.role === 'user' ? (
                                                    <User className="h-4 w-4 text-white" />
                                                ) : (
                                                    <Bot className="h-4 w-4 text-gray-600" />
                                                )}
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                                                chat.role === 'user' 
                                                    ? 'bg-gradient-to-r from-[#8e71f8] to-[#7e61e0] text-white' 
                                                    : 'bg-gray-50 text-gray-800 border border-gray-200'
                                            }`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {parseMessageContent(chat)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-6 border-t border-gray-200">
                            <form onSubmit={handleChatSubmit} className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ask a question about this document..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8e71f8] focus:border-transparent transition-all"
                                    disabled={isSending}
                                />
                                <button 
                                    type="submit" 
                                    disabled={isSending || !message.trim()} 
                                    className="p-3 bg-gradient-to-r from-[#8e71f8] to-[#7e61e0] rounded-xl hover:from-[#7e61e0] hover:to-[#6b4fd6] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 disabled:transform-none"
                                >
                                    {isSending ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        <Send size={20} className="text-white" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfView;