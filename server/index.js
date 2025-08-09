// server/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Octokit } = require("@octokit/rest");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

app.use(express.json());
// Use CORS to allow requests from your React frontend (which runs on port 3000)
app.use(cors({ origin: 'http://localhost:3000' }));

const PORT = process.env.PORT || 8080;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// ROUTE 1: The user clicks "Login with GitHub" and is sent here.
// This route redirects them to GitHub's authorization page.
app.get('/auth/github', (req, res) => {
    // Add &scope=repo to the end of the URL
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo`;
    res.redirect(url);
});

// ROUTE 2: GitHub redirects the user back to this URL after they log in.
// We'll grab the temporary 'code' and exchange it for an access token.
app.get('/auth/github/callback', async (req, res) => {
    // The code is sent back by GitHub in the query parameters
    const { code } = req.query;

    try {
        // Now we POST this code to GitHub to get the access token
        const response = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
            },
            {
                headers: {
                    // We ask for the response in JSON format
                    'Accept': 'application/json',
                },
            }
        );

        const accessToken = response.data.access_token;

        // IMPORTANT: We redirect the user back to our React app.
        // We pass the access token as a URL query parameter.
        res.redirect(`http://localhost:3000?token=${accessToken}`);
        
    } catch (error) {
        console.error("Error getting access token", error);
        // Redirect to frontend with an error message
        res.redirect('http://localhost:3000?error=auth_failed');
    }
});

// Find and replace your /api/repos route in server/index.js
app.get('/api/repos', async (req, res) => { // Changed to GET
    const token = req.headers.authorization?.split(' ')[1]; // Read from header

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Missing access token' });
    }
    //... keep the rest of the function the same
    try {
        const octokit = new Octokit({ auth: token });
        const { data: repos } = await octokit.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 20,
        });
        res.json(repos);
    } catch (error) {
        console.error("Error fetching repos", error);
        res.status(500).json({ message: "Failed to fetch repositories" });
    }
});
// Add this new route to server/index.js, before app.listen()

// Find and update this route in server/index.js
app.get('/api/repo-contents/:owner/:repo', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; 
    const { owner, repo } = req.params;
    const { path } = req.query; // <-- Read path from query parameter

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Missing access token' });
    }

    try {
        const octokit = new Octokit({ auth: token });
        const { data: contents } = await octokit.repos.getContent({
            owner,
            repo,
            path: path || '' // Use the provided path, or default to root
        });
        res.json(contents);
    } catch (error) {
        console.error("Error fetching repo contents", error);
        res.status(500).json({ message: "Failed to fetch repository contents" });
    }
});

app.post('/api/generate-summaries', async (req, res) => {
    // Destructure the new 'framework' field from the request body
    const { token, owner, repo, files, framework } = req.body;

    if (!token || !owner || !repo || !files || !framework || files.length === 0) {
        return res.status(400).json({ message: 'Missing required parameters.' });
    }

    try {
        const octokit = new Octokit({ auth: token });
        let combinedCode = '';

        for (const file of files) {
            const { data: content } = await octokit.repos.getContent({
                owner,
                repo,
                path: file.path,
            });
            const rawContent = Buffer.from(content.content, 'base64').toString('utf8');
            combinedCode += `\n\n--- FILE: ${file.path} ---\n\n${rawContent}`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        // The prompt now uses the 'framework' variable
        const prompt = `
            You are an expert Test Case Generator.
            I will provide you with the code from one or more files.
            Your task is to analyze the code and suggest a list of 5-7 distinct test case summaries.

            RULES:
            1. The target testing framework is ${framework}.
            2. Each summary should be a single, concise sentence describing the test's purpose.
            3. Present the output as a simple text list, with each summary on a new line.
            4. DO NOT add numbers, bullets, or any markdown formatting. Just plain text lines.

            Here is the code:
            ${combinedCode}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ summaries: response.text() });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ message: "Failed to generate test case summaries." });
    }
});

app.post('/api/generate-code', async (req, res) => {
    // Destructure the new 'framework' field
    const { token, owner, repo, files, summary, framework } = req.body;

    if (!token || !owner || !repo || !files || !summary || !framework) {
        return res.status(400).json({ message: 'Missing required parameters.' });
    }

    try {
        const octokit = new Octokit({ auth: token });
        let combinedCode = '';

        for (const file of files) {
            const { data: content } = await octokit.repos.getContent({
                owner,
                repo,
                path: file.path,
            });
            const rawContent = Buffer.from(content.content, 'base64').toString('utf8');
            combinedCode += `\n\n--- FILE: ${file.path} ---\n\n${rawContent}`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        // The prompt now uses the 'framework' variable
        const prompt = `
            You are a world-class software engineer specializing in testing. Based on the provided code context and the requested test summary, write a complete, production-ready test file.

            RULES:
            1. The testing framework is ${framework}.
            2. The test file must be fully runnable. Include all necessary imports.
            3. The code should ONLY address the specific test case requested in the summary.
            4. Crucially, provide only the complete, runnable code inside a single markdown code block. Do not add any conversational text or explanations outside the code block.

            CODE CONTEXT:
            ---
            ${combinedCode}
            ---

            REQUESTED TEST CASE SUMMARY:
            "${summary}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const code = text.match(/```(?:javascript|js|jsx|python|java|csharp)?\n([\s\S]*?)```/)?.[1] || text;
        
        res.json({ code });

    } catch (error) {
        console.error("AI Code Generation Error:", error);
        res.status(500).json({ message: "Failed to generate test case code." });
    }
});

app.post('/api/create-pr', async (req, res) => {
    const { token, owner, repo, filePath, codeContent, commitMessage, prTitle, prBody } = req.body;

    if (!token || !owner || !repo || !filePath || !codeContent) {
        return res.status(400).json({ message: 'Missing required parameters.' });
    }

    try {
        const octokit = new Octokit({ auth: token });
        const newBranchName = `test-gen/${Date.now()}`;
        
        // 1. Get the latest commit SHA of the main branch (assuming 'main')
        const { data: mainBranch } = await octokit.repos.getBranch({
            owner,
            repo,
            branch: 'main', // Or 'master', you might need to make this dynamic
        });
        const latestCommitSha = mainBranch.commit.sha;

        // 2. Create a new branch from the main branch
        await octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${newBranchName}`,
            sha: latestCommitSha,
        });

        // 3. Create the new file on the new branch
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: commitMessage || 'feat: Add generated test case',
            content: Buffer.from(codeContent).toString('base64'),
            branch: newBranchName,
        });
        
        // 4. Create the Pull Request
        const { data: pullRequest } = await octokit.pulls.create({
            owner,
            repo,
            title: prTitle || 'New Test Case from Workik.test',
            head: newBranchName,
            base: 'main', // Or 'master'
            body: prBody || 'This PR was automatically generated by Workik.test.',
        });

        res.json({ message: 'Pull Request created successfully!', url: pullRequest.html_url });

    } catch (error) {
        console.error("PR Creation Error:", error);
        res.status(500).json({ message: "Failed to create Pull Request." });
    }
});





app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
});