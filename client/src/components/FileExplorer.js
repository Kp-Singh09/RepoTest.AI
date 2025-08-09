// client/src/components/FileExplorer.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FileExplorer = ({ token, repo, owner, onGenerate }) => {
    const [contents, setContents] = useState([]);
    const [path, setPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState({});
    // Add state for the framework selector
    const [selectedFramework, setSelectedFramework] = useState('React (Jest)');

    useEffect(() => {
        setLoading(true);
        setError(null);
        axios.get(`http://localhost:8080/api/repo-contents/${owner}/${repo}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { path: path }
        }).then(response => {
            setContents(response.data);
        }).catch(err => {
            setError('Failed to load repository contents.');
        }).finally(() => {
            setLoading(false);
        });
    }, [token, repo, owner, path]);

    const handleItemClick = (item) => {
        if (item.type === 'dir') setPath(item.path);
    };

    const handleGoBack = () => {
        const newPath = path.substring(0, path.lastIndexOf('/'));
        setPath(newPath);
    };
    
    const handleFileSelect = (filePath, isSelected) => {
        setSelectedFiles(prev => {
            const newSelection = { ...prev };
            if (isSelected) {
                newSelection[filePath] = { path: filePath };
            } else {
                delete newSelection[filePath];
            }
            return newSelection;
        });
    };
    
    // Update handleGenerateClick to include the framework
    const handleGenerateClick = () => {
        const filesToGenerate = Object.values(selectedFiles);
        onGenerate(filesToGenerate, selectedFramework);
    };

    if (loading) return <p>Loading files...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    const numSelected = Object.keys(selectedFiles).length;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {path && <button onClick={handleGoBack}>Back</button>}
                
                {/* --- NEW FRAMEWORK SELECTOR --- */}
                <select 
                    value={selectedFramework} 
                    onChange={(e) => setSelectedFramework(e.target.value)}
                >
                    <option value="React (Jest)">React (Jest)</option>
                    <option value="Python (Pytest)">Python (Pytest)</option>
                    <option value="Java (JUnit)">Java (JUnit)</option>
                    <option value="C# (NUnit)">C# (NUnit)</option>
                    <option value="Go (testing package)">Go (testing package)</option>
                </select>
                {/* --- END OF SELECTOR --- */}

                <button onClick={handleGenerateClick} disabled={numSelected === 0}>
                    Generate Summaries for {numSelected} file(s)
                </button>
            </div>
            <h4>Current Path: /{path}</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {contents.map(item => (
                    <li key={item.sha} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', alignItems: 'center' }}>
                        {item.type === 'file' && (
                            <input
                                type="checkbox"
                                style={{ marginRight: '10px' }}
                                checked={!!selectedFiles[item.path]}
                                onChange={(e) => handleFileSelect(item.path, e.target.checked)}
                            />
                        )}
                        <span onClick={() => handleItemClick(item)} style={{ cursor: item.type === 'dir' ? 'pointer' : 'default', fontWeight: item.type === 'dir' ? 'bold' : 'normal' }}>
                            {item.type === 'dir' ? '📁' : '📄'} {item.name}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FileExplorer;