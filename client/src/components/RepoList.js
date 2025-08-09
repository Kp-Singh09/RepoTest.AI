// client/src/components/RepoList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Change the function signature to accept onRepoSelect
const RepoList = ({ token, onRepoSelect }) => { 
    // These lines were missing. They create the variables.
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                // I'm updating this API call to use headers, which is better practice
                const response = await axios.get('http://localhost:8080/api/repos', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setRepos(response.data);
            } catch (err) {
                setError('Failed to load repositories.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRepos();
    }, [token]);
    
    if (loading) return <p>Loading repositories...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h2>Your Repositories</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {repos.map(repo => (
                    // Add the onClick handler to the list item
                    <li 
                        key={repo.id} 
                        onClick={() => onRepoSelect(repo.name, repo.owner.login)}
                        style={{ border: '1px solid #ccc', padding: '10px', margin: '5px 0', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        <strong>{repo.name}</strong>
                        <p>{repo.description || 'No description'}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RepoList;