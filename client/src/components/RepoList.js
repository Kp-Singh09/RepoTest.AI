import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RepoList = ({ token, onRepoSelect }) => { 
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/repos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setRepos(response.data);
            } catch (err) {
                setError('Failed to load repositories.');
            } finally {
                setLoading(false);
            }
        };

        fetchRepos();
    }, [token]);
    
    if (loading) return <p className="text-center text-gray-700">Loading repositories...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Select a Repository</h2>
            <ul className="space-y-4">
                {repos.map(repo => (
                    <li 
                        key={repo.id} 
                        onClick={() => onRepoSelect(repo.name, repo.owner.login)}
                        className="bg-white/60 backdrop-blur-lg border border-white/30 p-5 rounded-xl shadow-md cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                    >
                        <strong className="text-lg font-semibold text-gray-900">{repo.name}</strong>
                        <p className="text-sm text-gray-700 mt-1 truncate">{repo.description || 'No description'}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RepoList;