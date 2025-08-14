# RepoTest AI 🤖

RepoTest AI is a full-stack web application designed to streamline the software testing process. It integrates directly with your GitHub account, allowing you to select code files from your repositories and use the power of Google's Gemini AI to automatically generate test case summaries and full, runnable test code for multiple languages and frameworks.

## ✨ Features

*   **GitHub Integration:** Securely log in with your GitHub account using OAuth 2.0.
    
*   **Repository Browser:** Browse your repositories and navigate through their file structure.
    
*   **Multi-File Analysis:** Select one or more files to be analyzed by the AI in a single request.
    
*   **AI-Powered Test Summaries:** Generates a list of concise, relevant test case summaries based on the selected code.
    
*   **Multi-Language Support:** Choose from a variety of languages and testing frameworks (React, Python, Java, etc.) for tailored test generation.
    
*   **Automated Code Generation:** Select a summary to generate the complete, runnable test code.
    
*   **Automated Pull Requests:** Create a new branch and open a pull request on GitHub with the newly generated test file with a single click.
    
*   **Modern UI:** A clean, responsive, and modern "glassmorphism" interface built with Tailwind CSS.
    

## 🛠️ Tech Stack

*   **Frontend:** React, Tailwind CSS
    
*   **Backend:** Node.js, Express.js
    
*   **APIs:** GitHub REST API, Google Gemini API
    
*   **Authentication:** GitHub OAuth 2.0
    
*   **Deployment:** Vercel (Frontend), Render (Backend)
    

## 🚀 Setup and Installation

To run this project locally, follow these steps:

### 1\. Clone the Repository

    git clone https://github.com/your-username/repotest-ai.git
    cd repotest-ai
    

### 2\. Install Dependencies

Install the necessary packages for both the server and the client.

    # Install server dependencies
    cd server
    npm install
    
    # Install client dependencies
    cd ../client
    npm install
    

### 3\. Set Up Environment Variables

This project requires API keys and secrets. You will need to create two `.env` files.

**A. Backend Server (`/server/.env`)** Create a file named `.env` in the `server` directory and add the following variables:

    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret
    GEMINI_API_KEY=your_google_gemini_api_key
    CORS_ORIGIN=http://localhost:3000
    

**B. Frontend Client (`/client/.env`)** Create a file named `.env` in the `client` directory and add the following variable:

    REACT_APP_API_URL=http://localhost:8080
    

See the section below for instructions on how to get these keys.

### 4\. Run the Application

You need to run two separate terminals for the backend and frontend.

    # In the first terminal, start the backend server
    cd server
    npm start
    
    # In a second terminal, start the frontend client
    cd client
    npm start
    

Your application should now be running, with the frontend available at `http://localhost:3000`.

## 🔑 Environment Variables

*   **`GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`**: Obtained by creating a [New GitHub OAuth App](https://github.com/settings/developers "null").
    
    *   Set the **Homepage URL** to `http://localhost:3000`.
        
    *   Set the **Authorization callback URL** to `http://localhost:8080/auth/github/callback`.
        
*   **`GEMINI_API_KEY`**: Obtained from [Google AI Studio](https://aistudio.google.com/app/apikey "null").
    
*   **`CORS_ORIGIN`**: The URL of the frontend application that the backend should accept requests from. For local development, this is `http://localhost:3000`.
    
*   **`REACT_APP_API_URL`**: The URL of the backend server that the frontend should send requests to. For local development, this is `http://localhost:8080`.
    

## ☁️ Deployment

This application is configured for a split deployment:

*   The **frontend** (`client` directory) can be deployed to a static hosting service like **Vercel**.
    
*   The **backend** (`server` directory) can be deployed to a web service provider like **Render**.
    

Remember to set the production environment variables on your hosting platforms accordingly.