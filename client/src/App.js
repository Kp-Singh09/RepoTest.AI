// client/src/App.js
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
    const [frameworkForContext, setFrameworkForContext] = useState(''); // Store the selected framework
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

    // Update to accept 'framework'
    const handleGenerateSummaries = async (files, framework) => {
        setFilesForContext(files);
        setFrameworkForContext(framework); // Save framework for later
        setIsAiLoading(true);
        setAiError(null);
        setSummaries([]);
        setGeneratedCode('');
        setPrUrl('');
        try {
            const response = await axios.post('http://localhost:8080/api/generate-summaries', {
                token: accessToken, owner: repoOwner, repo: selectedRepo, files: files, framework: framework
            });
            const summaryArray = response.data.summaries.split('\n').filter(s => s.trim() !== '');
            setSummaries(summaryArray);
        } catch (error) {
            setAiError('Failed to generate summaries. Please try again.');
        } finally {
            setIsAiLoading(false);
        }
    };
    
    // Update to use the stored framework
    const handleSummaryClick = async (summary) => {
        setIsCodeLoading(true);
        setCodeError(null);
        setGeneratedCode('');
        setPrUrl('');
        try {
            const response = await axios.post('http://localhost:8080/api/generate-code', {
                token: accessToken, owner: repoOwner, repo: selectedRepo, files: filesForContext, summary: summary, framework: frameworkForContext
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
        <div className="App-header">
            <h1>Workik.test</h1>
            <p>Generate test cases for your code with AI.</p>
            <a className="Login-button" href="http://localhost:8080/auth/github">Login with GitHub</a>
        </div>
    );
    
    const renderAppContent = () => (
        <div>
            <header className="App-header-main"><h1>Workik.test</h1></header>
            <main className="App-main">
                {selectedRepo ? (
                    <div className="app-grid">
                        <div className="file-explorer-container">
                            <button onClick={resetAppState}>&larr; Back to Repositories</button>
                            <FileExplorer token={accessToken} repo={selectedRepo} owner={repoOwner} onGenerate={handleGenerateSummaries} />
                        </div>
                        <div className="results-container">
                            {isAiLoading && <p>🧠 AI is thinking of summaries...</p>}
                            {aiError && <p style={{ color: 'red' }}>{aiError}</p>}
                            {summaries.length > 0 && (
                                <div>
                                    <h3>1. Select a Summary to Generate Code</h3>
                                    <ul className="summaries-list">
                                        {summaries.map((s, i) => <li key={i} onClick={() => handleSummaryClick(s)}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                            {isCodeLoading && <p>⌨️ AI is writing the code...</p>}
                            {codeError && <p style={{ color: 'red' }}>{codeError}</p>}
                            {generatedCode && (
                                <div className="code-container">
                                    <h3>2. Generated Test Code</h3>
                                    <SyntaxHighlighter language="javascript" style={a11yDark} showLineNumbers>
                                        {generatedCode}
                                    </SyntaxHighlighter>
                                    <button onClick={handleCreatePR} disabled={isPrLoading} style={{marginTop: '10px'}}>
                                        {isPrLoading ? 'Creating PR...' : 'Create Pull Request on GitHub'}
                                    </button>
                                    {prError && <p style={{ color: 'red' }}>{prError}</p>}
                                    {prUrl && (
                                        <p style={{ color: 'green', fontWeight: 'bold' }}>
                                            Success! <a href={prUrl} target="_blank" rel="noopener noreferrer">View your Pull Request here.</a>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : ( <RepoList token={accessToken} onRepoSelect={handleRepoSelect} /> )}
            </main>
        </div>
    );

    if (loading) return <div>Loading...</div>;

    return <div className="App">{accessToken ? renderAppContent() : renderLogin()}</div>;
}

export default App;