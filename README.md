# NLP Query Interface

A web-based interface for querying and analyzing topic tree data from CEF.AI endpoints. This system processes conversation data to extract insights about user discussions, topic evolution, and community engagement patterns using local semantic analysis.

## Features

### Core Functionality

**Multiple Datasets**: Analyze conversation data from different topics (e.g., Test, Aethir, AAVE).

**Multi-Version Analysis**: Compare up to three data versions side-by-side to track topic evolution.

**User Filtering**: Select specific users for analysis or analyze all users by default.

**Structured Query Types**: Five predefined analysis modes for comprehensive insights.

**Custom Natural Language Queries**: Ask specific questions about the data with AI-enhanced responses.

**Dynamic Topic Extraction**: Topic names are extracted directly from live tree data, not hardcoded mappings.

**Local Semantic Processing**: In-browser NLP analysis without external AI service dependencies.

**Live Data**: Queries are made directly to CEF.AI endpoints to access the most current data.

### User Interface

**Guided Workflow**: A 5-step stepper guides the user through the query process (Topic → Versions → Users → Query → Custom).

**Organized Results**: Analysis is presented in dedicated tabs for processed insights, raw API responses, and version comparison deltas.

**Collapsible Sections**: Toggle Key Insights and Topics Analysis sections for better organization.

**Conditional Custom Query**: Custom query input only appears when "Custom Query" is selected.

**Responsive Design**: The interface is optimized for desktop environments with mobile support.

**High-Contrast Layout**: A clean, minimalist design with glassmorphic effects for readability.

## Semantic Query Types

**Topic Insights** (`channel_query`): Identifies the main topics of discussion within the dataset.

**Single User Analysis** (`user_analysis`): Provides a detailed analysis of an individual user's activity and behavior.

**Multi-User Analysis** (`users_analysis`): Compares engagement patterns across multiple selected users.

**Time-Window Analysis** (`time_window`): Analyzes topic trends and activity within a specific time frame.

**Version Evolution** (`version_evolution`): Tracks changes in topics and engagement across different data versions.

**Custom Query** (`custom_query`): Natural language questions with AI-enhanced analysis (e.g., "How do @James_T81 and @joybaruarobin differ in their topic preferences?").

## Technical Overview

### Architecture

**Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).

**API Integration**: The application communicates with CEF.AI endpoints via RESTful API calls. State is managed through a class-based JavaScript architecture.

**Data Processing**: Semantic analysis is handled locally by the `processTreeLocally()` function, which acts as an agent wrapper between the API and the UI.

**AI Enhancement**: Custom queries are enhanced with OpenAI GPT-4 via secure serverless functions.

**Data Policy**: The interface operates on a query-first principle, using structured query types rather than free-form input. It does not use local storage and fetches fresh data for each session to ensure real-time accuracy.

### CEF.AI Integration

**Base URL**: `https://compute-1.testnet.cere.network/engine/data-service/2606/query`

**Live Endpoints**: Version management, channel queries, user-specific analysis

**Real-Time Processing**: Direct queries to CEF.AI infrastructure

**No Local Storage**: Always fetches fresh data from network

### Semantic Engine Capabilities

**Message Pattern Analysis**: Calculates user participation and engagement metrics.

**Topic Clustering**: Groups data into semantic categories and ranks them by popularity.

**Behavioral Insights**: Maps user activity across different topics.

**Evolution Tracking**: Identifies trends and changes through temporal analysis.

**Statistical Modeling**: Derives averages and distributions for engagement.

**Dynamic Topic Names**: Extracts actual topic names from conversation data instead of hardcoded mappings.

## Usage

Follow the five-step workflow to generate an analysis:

1. **Topic Insights**: Select the conversation dataset to analyze.

2. **Versions**: Choose up to three versions for comparison.

3. **Users**: Filter by specific users or select all.

4. **Query**: Select the desired analysis type.

5. **Custom**: Enter natural language questions (only appears when "Custom Query" is selected).

Execute the query to view results organized into three tabs: Insights, Raw Response, and Delta Analysis (for multi-version comparisons).

### Custom Query Examples

- "How do @James_T81 and @joybaruarobin differ in their topic preferences?"
- "What topics are trending in the community?"
- "Which users are most engaged in DeFi discussions?"
- "What are the main concerns in recent conversations?"

## Project Structure

```
NLP-Query-Interface/
├── index.html          # Main application interface
├── styles.css          # CSS for styling and layout
├── script.js           # Handles API integration and semantic processing
├── test-suite.js       # Validation and consistency testing suite
├── api/                # Serverless functions for secure AI integration
│   └── openai-enhance.js # OpenAI GPT-4 enhancement endpoint
├── vercel.json         # Vercel deployment configuration
└── README.md           # Project documentation
```

## Security & Performance

**No Hardcoded Secrets**: API keys managed via environment variables and serverless functions.

**Input Validation**: User selections are validated before API calls are made.

**Error Handling**: The application gracefully handles network and data-related errors.

**Optimized Performance**: DOM updates and memory management are handled efficiently.

**AI Enhancement Security**: OpenAI API calls routed through secure serverless functions.

## Fred's Requirements Compliance

**Query-First Architecture**: All interactions use structured queries, no free-form tree loading.

**No Raw Tree Dumping**: Never displays full tree structure, only semantic insights.

**Agent Wrapper**: Local processing layer between API and UI with optional AI enhancement.

**Endpoint-Based Only**: All data comes from live CEF.AI endpoints, no local storage.

**Deterministic Results**: Same input produces same output with graceful AI fallbacks.

## Deployment

### Local Development

1. Clone the repository
2. Open `index.html` in a modern browser
3. For AI enhancement: Set `localStorage.setItem('openai_key', 'your-api-key')` in browser console

### Production Deployment (Vercel)

1. Push to GitHub repository
2. Import project in Vercel
3. Add environment variable: `OPENAI_API_KEY` = your OpenAI API key
4. Deploy - the interface will be live with full AI enhancement

The serverless function at `/api/openai-enhance.js` handles secure OpenAI integration for custom queries.

## Production Status

✅ **Live CEF.AI Integration**: Real-time topic tree analysis
✅ **Dynamic Topic Extraction**: Names extracted from actual conversation data
✅ **Fred's Requirements Met**: Query-first, no tree dumping, local processing
✅ **Enterprise UI**: Professional glassmorphic design with collapsible sections
✅ **Multi-Version Comparison**: Evolution tracking with delta analysis
✅ **AI-Enhanced Custom Queries**: GPT-4 powered insights via secure serverless functions
✅ **Comprehensive Testing**: 88% validation success rate
✅ **Production Ready**: Secure deployment with environment variable management