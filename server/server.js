require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const basicAuth = require('express-basic-auth');

const app = express();
const port = process.env.PORT || 3001;

// Define the prompts
const analysisPrompt = {
  system: `You are an expert system designed to analyze job descriptions. Focus only on the ANALYSIS phase:
- Systematically compare the original JD to peer examples
- Evaluate key components: position overview, qualifications, benefits, DEI language, etc.
- Identify strengths, weaknesses, missing elements, and outdated language
- Create a clear list of needed improvements

Your output should be well-formatted and easy to read, using headers and bullet points where appropriate.`,
  message: null
};

const revisionPrompt = {
  system: `You are an expert system designed to revise job descriptions. Focus only on the REVISION phase:
Create an improved version of the JD that:
- Maintains core role requirements
- Incorporates strong elements from peer JDs
- Uses inclusive, modern language
- Enhances overall appeal and effectiveness
- Follows standard JD structure (Position Summary, Essential Functions, etc.)
- Ensures all changes align with public sector requirements

Use the provided analysis to inform your revisions.`,
  message: null
};

const documentationPrompt = {
  system: `You are an expert system designed to document changes in job descriptions. Focus only on the CHANGE DOCUMENTATION phase:
Create a table with the columns: Section, Original Content, Updated Content, Justification, Source
- Section should list each component of the JD starting with Title (there should be 4-7 components)
- Original Content should briefly outline what was in the original JD
- Updated Content should describe the changes, or lack thereof
- Justification should note how these changes make the position better
- Source should cite which peer document(s) influenced each change`,
  message: null
};

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(basicAuth({
  users: { 'brendan@hollygov.com': 'Holly' },
  challenge: true,
  realm: 'Holly JD Analysis Tool',
  unauthorizedResponse: (req) => {
    return {
      error: 'Unauthorized access',
      message: 'Invalid credentials'
    };
  }
}));

// API endpoint
app.post('/api/analyze', async (req, res) => {
  console.log('Starting request processing...');
  
  try {
    const { originalJD, comparators } = req.body;
    console.log('Received request with:', { 
      originalJDLength: originalJD?.length,
      comparatorsCount: comparators?.length
    });

    if (!originalJD?.trim()) {
      throw new Error('Original JD is required');
    }

    // Stage 1: Analysis
    analysisPrompt.message = `Please analyze these job descriptions:

Original Job Description:
${originalJD}

Peer Comparisons:
${comparators.map((text, index) => `\nComparator ${index + 1}:\n${text}`).join('\n')}`;

    console.log('Starting analysis...');
    const analysisResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4096,
      system: analysisPrompt.system,
      messages: [{ role: "user", content: analysisPrompt.message }]
    });
    const analysis = analysisResponse.content[0].text;
    console.log('Analysis complete');

    // Stage 2: Revision
    revisionPrompt.message = `Using this analysis:
${analysis}

Please revise this job description:
${originalJD}`;

    console.log('Starting revision...');
    const revisionResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4096,
      system: revisionPrompt.system,
      messages: [{ role: "user", content: revisionPrompt.message }]
    });
    const revision = revisionResponse.content[0].text;
    console.log('Revision complete');

    // Stage 3: Documentation
    documentationPrompt.message = `Please document the changes between these versions:

Original JD:
${originalJD}

Revised JD:
${revision}`;

    console.log('Starting documentation...');
    const documentationResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4096,
      system: documentationPrompt.system,
      messages: [{ role: "user", content: documentationPrompt.message }]
    });
    const documentation = documentationResponse.content[0].text;
    console.log('Documentation complete');

    // Send response
    const responseData = {
      analysis,
      revision,
      documentation
    };

    console.log('Sending response...');
    res.json(responseData);

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: error.message
    });
  }
});

// Add a test endpoint to verify auth is working
app.get('/api/auth-test', (req, res) => {
  res.json({ message: 'Successfully authenticated!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment check:', {
    port: port,
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    nodeEnv: process.env.NODE_ENV
  });
}); 