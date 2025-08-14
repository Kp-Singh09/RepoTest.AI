import React, { useState, useEffect } from 'react';
import { FiFile, FiFolder } from 'react-icons/fi';
import axios from 'axios';

const FileExplorer = ({ token, repo, owner, onGenerate }) => {
    const [contents, setContents] = useState([]);
    const [path, setPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState({});
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
            if (isSelected) newSelection[filePath] = { path: filePath };
            else delete newSelection[filePath];
            return newSelection;
        });
    };
    
    const handleGenerateClick = () => {
        const filesToGenerate = Object.values(selectedFiles);
        onGenerate(filesToGenerate, selectedFramework);
    };

    if (loading) return <p className="text-center text-gray-700">Loading files...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;

    const numSelected = Object.keys(selectedFiles).length;

    return (
        <div className="bg-white/60 backdrop-blur-lg border border-white/30 p-5 rounded-xl shadow-md">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {path && <button onClick={handleGoBack} className="bg-gray-200/50 hover:bg-gray-300/50 text-gray-800 font-semibold py-2 px-3 rounded-lg transition-colors duration-200 text-sm">Back</button>}
                
                <select 
                    value={selectedFramework} 
                    onChange={(e) => setSelectedFramework(e.target.value)}
                    className="bg-white/50 border border-gray-300/50 text-gray-800 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2"
                >
                    <option value="React (Jest)">React (Jest)</option>
                    <option value="Python (Pytest)">Python (Pytest)</option>
                    <option value="Java (JUnit)">Java (JUnit)</option>
                    <option value="C# (NUnit)">C# (NUnit)</option>
                    <option value="Go (testing package)">Go (testing package)</option>
                </select>

                <button 
                    onClick={handleGenerateClick} 
                    disabled={numSelected === 0}
                    className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition-colors duration-300 flex-grow text-sm"
                >
                    Generate for {numSelected} file(s)
                </button>
            </div>
            <h4 className="text-sm text-gray-700 font-mono mb-2 truncate">/{path}</h4>
            <ul className="space-y-1">
                {contents.map(item => (
                    <li key={item.sha} className="flex items-center p-2 rounded-md hover:bg-white/50 transition-colors duration-200">
                        {item.type === 'file' && (
                            <input
                                type="checkbox"
                                className="mr-3 h-4 w-4 rounded border-gray-400 text-brand-500 focus:ring-brand-500"
                                checked={!!selectedFiles[item.path]}
                                onChange={(e) => handleFileSelect(item.path, e.target.checked)}
                            />
                        )}
                        {item.type === 'dir' && <div className="w-7 mr-3"></div>}
                        
                        <span 
                            onClick={() => handleItemClick(item)} 
                            className="flex items-center cursor-pointer flex-grow"
                        >
                            <span className="mr-3 text-lg text-gray-700">
                                {item.type === 'dir' ? <FiFolder /> : <FiFile />}
                            </span>
                            <span className={item.type === 'dir' ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                                {item.name}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FileExplorer;