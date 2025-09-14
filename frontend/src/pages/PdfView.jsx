import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getPDFById, chatWithPDF } from '../services/api';
import { Send } from 'lucide-react';

const PdfView = () => {
    const { id } = useParams();
    const [pdf, setPdf] = useState(null);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const chatEndRef = useRef(null);

    const fetchPdf = async () => {
        try {
            const { data } = await getPDFById(id);
            setPdf(data);
            console.log('Fetched PDF data:', data);

        } catch (error) {
            console.error('Failed to fetch PDF', error);
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

    if (!pdf) return <div className="text-center mt-10">Loading PDF...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto pt-[64px] p-4">
            {/* Summary Section */}
            <div className="bg-white border rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Summary</h2>
                <p className="text-gray-700 leading-relaxed">{pdf.summary}</p>
            </div>

            {/* Chat Section */}
            <div className="bg-white p-6 rounded-lg flex flex-col h-[70vh] border shadow-sm">
                <h2 className="text-2xl font-bold mb-4">Chat with Document</h2>

                {/* Chat container */}
                <div
                    className="flex-grow overflow-y-auto pr-4 space-y-4 mb-4"
                    ref={chatEndRef}
                    id="chat-container"
                >
                    {pdf.chatHistory.map((chat, index) => (
                        <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${chat.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                <p>
                                    {(() => {
                                        try {
                                            const parsed = JSON.parse(chat.parts[0].text);
                                            return parsed.answer || chat.parts[0].text;
                                        } catch (e) {
                                            return chat.parts[0].text;
                                        }
                                    })()}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} /> {/* Dummy div for scrolling */}
                </div>

                {/* Input form */}
                <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" disabled={isSending} className="p-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        <Send size={20} />
                    </button>
                </form>
            </div>

        </div>
    );
};

export default PdfView;
