# Intelligent PDF Query Application (Assignment Submission)

This project is submitted as a partial fulfillment for the requirements of [Your Course Name/Assignment Title]. It is a full-stack MERN application designed to demonstrate advanced concepts in AI integration, database management, and modern web development.

## Applicant Information

* **Name**: Abhyudaya Tiwari
* **University**: Indian Institute of Technology Jodhpur
* **Department**: Computer Science and Engineering
* **Email**: b23cs1085@iitj.ac.in

## Project Overview

This application is a powerful tool for document analysis, allowing users to upload, manage, and intelligently query PDF documents. It features a dual-mode chat system that adapts to the document's size and processing state. For all documents, an initial summary is generated using Google's Generative AI. For larger documents, a background process initiates a Retrieval-Augmented Generation (RAG) pipeline, chunking the text and storing it as vector embeddings in a MongoDB Atlas Vector Search index. This allows the chat to provide precise, context-aware answers from deep within the document's content.

Additionally, the application includes a feature for **Web Content Interaction**, which uses **mcp**-powered tools to fetch, read, and summarize content from any external URL provided by the user.

## Project Resources
Demo Video: [Link to Demo Video](https://drive.google.com/file/d/15hyZeGo0z38HYbVnUiFy4hm59KwxNea-/view)

System Design Report: [Link to System Design Report](https://drive.google.com/file/d/1QdIZwoVqdCW7v4xnPGxGnh7LqKEpyCft/view)



## Features

* **User Authentication**: Secure user registration and login system built with JWT and bcrypt.
* **PDF Upload & Management**: A dashboard for users to upload, view, and delete their PDF documents.
* **Automatic Summarization**: Upon upload, every PDF is automatically summarized by Google's Generative AI for a quick overview.
* **Dual-Mode Chat**:
    * **Summary Mode**: For quick queries or on smaller, unprocessed PDFs, the chat uses the high-level summary.
    * **RAG Mode**: Once a PDF is processed, the chat switches to a RAG pipeline, using MongoDB Atlas Vector Search to find the most relevant text chunks for highly accurate answers.
* **Web Content Interaction**: The chat can accept any URL, using an integrated tool to fetch and reason about the content from the web.

## Tech Stack

* **Backend**: Node.js, Express.js
* **Frontend**: React.js, Tailwind CSS
* **Database**: MongoDB with Mongoose ODM
* **Vector Database**: MongoDB Atlas Vector Search
* **AI & Embeddings**: Google Generative AI (Gemini), LangChain.js
* **Authentication**: JSON Web Tokens (JWT), bcrypt

## Setup and Installation

### Prerequisites

* Node.js and npm
* MongoDB Atlas account with a configured cluster
* Google Generative AI API Key

### Backend Setup

1.  Clone the repository and navigate to the `backend` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and add your environment variables (MONGODB_URI, JWT_SECRET, GEMINI_API_KEY).
4.  In MongoDB Atlas, create a Vector Search index on the `pdfchunks` collection named `idx_embedding_search`.
5.  Start the server:
    ```bash
    npm run dev
    ```

### Frontend Setup

1.  Navigate to the `frontend` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the React application:
    ```bash
    npm run dev
    ```
