require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Octokit } = require("@octokit/rest");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));

const PORT = process.env.PORT || 8080;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

app.get('/auth/github', (req, res) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo`;
    res.redirect(url);
});

app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;

    try {
        const response = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
            },
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        const accessToken = response.data.access_token;

        res.redirect(`http://localhost:3000?token=${accessToken}`);
        
    } catch (error) {
        console.error("Error getting access token", error);
        res.redirect('http://localhost:3000?error=auth_failed');
    }
});

app.get('/api/repos', async (req, res) => { 
    const token = req.headers.authorization?.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Missing access token' });
    }
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

app.get('/api/repo-contents/:owner/:repo', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; 
    const { owner, repo } = req.params;
    const { path } = req.query; 

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Missing access token' });
    }

    try {
        const octokit = new Octokit({ auth: token });
        const { data: contents } = await octokit.repos.getContent({
            owner,
            repo,
            path: path || '' 
        });
        res.json(contents);
    } catch (error) {
        console.error("Error fetching repo contents", error);
        res.status(500).json({ message: "Failed to fetch repository contents" });
    }
});

app.post('/api/generate-summaries', async (req, res) => {
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
        
        const { data: mainBranch } = await octokit.repos.getBranch({
            owner,
            repo,
            branch: 'main', 
        });
        const latestCommitSha = mainBranch.commit.sha;

        await octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${newBranchName}`,
            sha: latestCommitSha,
        });

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: commitMessage || 'feat: Add generated test case',
            content: Buffer.from(codeContent).toString('base64'),
            branch: newBranchName,
        });
        
        const { data: pullRequest } = await octokit.pulls.create({
            owner,
            repo,
            title: prTitle || 'New Test Case from Workik.test',
            head: newBranchName,
            base: 'main', 
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