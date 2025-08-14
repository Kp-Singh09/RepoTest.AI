import React, { useState, useEffect } from 'react';
import RepoList from './components/RepoList';
import FileExplorer from './components/FileExplorer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';
import './App.css';

function App() {
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [repoOwner, setRepoOwner] = useState(null);
    const [filesForContext, setFilesForContext] = useState([]);
    const [frameworkForContext, setFrameworkForContext] = useState('');
    const [summaries, setSummaries] = useState([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [generatedCode, setGeneratedCode] = useState('');
    const [isCodeLoading, setIsCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState(null);
    const [isPrLoading, setIsPrLoading] = useState(false);
    const [prError, setPrError] = useState(null);
    const [prUrl, setPrUrl] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            setAccessToken(token);
            window.history.pushState({}, document.title, "/");
        }
        setLoading(false);
    }, []);
    
 
    const handleLogout = () => {
      setAccessToken(null);
      window.location.href = '/';
    };

    const handleRepoSelect = (repoName, ownerName) => {
        setSelectedRepo(repoName);
        setRepoOwner(ownerName);
    };
    
    const resetAppState = () => {
        setSelectedRepo(null);
        setSummaries([]);
        setAiError(null);
        setGeneratedCode('');
        setCodeError(null);
        setFilesForContext([]);
        setFrameworkForContext('');
        setPrUrl('');
        setPrError(null);
    };

    const handleGenerateSummaries = async (files, framework) => {
        setFilesForContext(files);
        setFrameworkForContext(framework);
        setIsAiLoading(true);
        setAiError(null);
        setSummaries([]);
        setGeneratedCode('');
        setPrUrl('');
        try {
            const response = await axios.post('http://localhost:8080/api/generate-summaries', {
                token: accessToken, owner: repoOwner, repo: selectedRepo, files, framework
            });
            const summaryArray = response.data.summaries.split('\n').filter(s => s.trim() !== '');
            setSummaries(summaryArray);
        } catch (error) {
            setAiError('Failed to generate summaries. Please try again.');
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleSummaryClick = async (summary) => {
        setIsCodeLoading(true);
        setCodeError(null);
        setGeneratedCode('');
        setPrUrl('');
        try {
            const response = await axios.post('http://localhost:8080/api/generate-code', {
                token: accessToken, owner: repoOwner, repo: selectedRepo, files: filesForContext, summary, framework: frameworkForContext
            });
            setGeneratedCode(response.data.code);
        } catch (error) {
            setCodeError('Failed to generate code. Please try again.');
        } finally {
            setIsCodeLoading(false);
        }
    };

    const handleCreatePR = async () => {
        setIsPrLoading(true);
        setPrError(null);
        setPrUrl('');
        
        const testFileName = filesForContext[0]?.path.replace(/(\.[\w\d_-]+)$/i, '.test$1') || 'generated.test.js';
        
        try {
            const response = await axios.post('http://localhost:8080/api/create-pr', {
                token: accessToken, owner: repoOwner, repo: selectedRepo, filePath: `tests/${testFileName}`, codeContent: generatedCode,
            });
            setPrUrl(response.data.url);
        } catch (error) {
            setPrError('Failed to create Pull Request.');
        } finally {
            setIsPrLoading(false);
        }
    };

    const renderLogin = () => (
        <div className="bg-white/10 min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-5xl font-bold mb-2 font-sans text-gray-900">RepoTest.AI</h1>
            <p className="text-lg text-gray-700 mb-8 font-sans">Generate test cases for your code with AI.</p>
            <a 
                href="http://localhost:8080/auth/github"
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300"
            >
                Login with GitHub
            </a>
        </div>
    );
    
    const renderAppContent = () => (
      <div className="min-h-screen font-sans">
        <header className="bg-white/60 backdrop-blur-lg border-b border-white/30 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">RepoTest.AI</h1>
            <button
              onClick={handleLogout}
              className="bg-gray-200/50 hover:bg-gray-300/50 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
            {selectedRepo ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-5 lg:col-span-4">
                        <button 
                            onClick={resetAppState}
                            className="mb-4 bg-white/60 backdrop-blur-lg border border-white/30 hover:bg-white/80 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            &larr; Back to Repositories
                        </button>
                        <FileExplorer 
                            token={accessToken} 
                            repo={selectedRepo} 
                            owner={repoOwner} 
                            onGenerate={handleGenerateSummaries} 
                        />
                    </div>
                    <div className="md:col-span-7 lg:col-span-8">
                        {isAiLoading && <p>🧠 AI is thinking of summaries...</p>}
                        {aiError && <p className="text-red-500">{aiError}</p>}
                        {summaries.length > 0 && (
                            <div className="bg-white/60 backdrop-blur-lg border border-white/30 p-5 rounded-xl shadow-md">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Select a Summary to Generate Code</h3>
                                <ul className="space-y-2">
                                    {summaries.map((s, i) => 
                                        <li 
                                            key={i} 
                                            onClick={() => handleSummaryClick(s)}
                                            className="bg-white/50 border border-white/30 p-3 rounded-lg cursor-pointer hover:bg-brand-500 hover:text-white transition-all duration-200"
                                        >
                                            {s}
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                        {isCodeLoading && <p>⌨️ AI is writing the code...</p>}
                        {codeError && <p className="text-red-500">{codeError}</p>}
                        {generatedCode && (
                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Generated Test Code</h3>
                                <div className="rounded-lg overflow-hidden shadow-lg">
                                    <SyntaxHighlighter language="javascript" style={a11yDark} showLineNumbers>
                                        {generatedCode}
                                    </SyntaxHighlighter>
                                </div>
                                <button 
                                    onClick={handleCreatePR} 
                                    disabled={isPrLoading} 
                                    className="mt-4 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                                >
                                    {isPrLoading ? 'Creating PR...' : 'Create Pull Request on GitHub'}
                                </button>
                                {prError && <p className="text-red-500 mt-2">{prError}</p>}
                                {prUrl && (
                                    <p className="text-green-600 font-bold mt-2">
                                        Success! <a href={prUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-500">View your Pull Request here.</a>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : ( 
                <RepoList token={accessToken} onRepoSelect={handleRepoSelect} /> 
            )}
        </main>
      </div>
    );

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return <div className="App">{accessToken ? renderAppContent() : renderLogin()}</div>;
}

export default App;