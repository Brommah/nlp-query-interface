/**
 * Comprehensive Test Suite for Topic Tree Query Interface
 * Validates data consistency across different query types and user selections
 */

class TopicTreeTestSuite {
    constructor(topicTreeInterface) {
        this.interface = topicTreeInterface;
        this.testResults = [];
        this.testChannel = 2148778849; // Test dataset
        this.testVersions = [1, 1757599557, 1757670313]; // Known versions
        this.testUsers = ['451032731', '1604332194', '6160396935']; // Known users
    }

    async runAllTests() {
        console.log('🧪 Starting Topic Tree Query Interface Test Suite');
        console.log('=' .repeat(60));
        
        this.testResults = [];
        
        try {
            // Test 1: Data Consistency Across Query Types
            await this.testDataConsistencyAcrossQueryTypes();
            
            // Test 2: Version Consistency 
            await this.testVersionConsistency();
            
            // Test 3: User Filtering Consistency
            await this.testUserFilteringConsistency();
            
            // Test 4: API Response Structure
            await this.testApiResponseStructure();
            
            // Test 5: Processing Logic Validation
            await this.testProcessingLogicValidation();
            
            // Generate test report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.addTestResult('Test Suite Execution', false, error.message);
        }
    }

    async testDataConsistencyAcrossQueryTypes() {
        console.log('\n📊 Test 1: Data Consistency Across Query Types');
        console.log('-'.repeat(50));
        
        const version = this.testVersions[0]; // Version 1
        const results = {};
        
        // Test 1A: Same query type, no user filtering - should be identical
        const baselineQuery = {
            type: 'channel_query',
            dataset: this.testChannel.toString(),
            users: [],
            versions: [version],
            parameters: {},
            timestamp: new Date().toISOString()
        };
        
        console.log(`🔍 Testing baseline query (no user filtering) for version ${version}`);
        const baselineResult = await this.interface.executeQueryAgainstVersion(baselineQuery, version);
        results.baseline = baselineResult;
        console.log(`✅ Baseline: ${baselineResult.data.messageCount} messages, ${baselineResult.data.topicCount} topics`);
        
        // Test 1B: Same query with user filtering - should have fewer/equal messages
        const filteredQuery = {
            ...baselineQuery,
            users: this.testUsers.slice(0, 2) // Filter to 2 users
        };
        
        console.log(`🔍 Testing filtered query (2 users) for version ${version}`);
        const filteredResult = await this.interface.executeQueryAgainstVersion(filteredQuery, version);
        results.filtered = filteredResult;
        console.log(`✅ Filtered: ${filteredResult.data.messageCount} messages, ${filteredResult.data.topicCount} topics`);
        
        // Validate logical consistency
        const messagesLogical = filteredResult.data.messageCount <= baselineResult.data.messageCount;
        const topicsLogical = filteredResult.data.topicCount <= baselineResult.data.topicCount;
        
        this.addTestResult(
            'User Filtering Logic - Messages', 
            messagesLogical, 
            messagesLogical ? `Filtered (${filteredResult.data.messageCount}) <= Baseline (${baselineResult.data.messageCount})` : `Filtered (${filteredResult.data.messageCount}) > Baseline (${baselineResult.data.messageCount})`
        );
        
        this.addTestResult(
            'User Filtering Logic - Topics', 
            topicsLogical, 
            topicsLogical ? `Filtered (${filteredResult.data.topicCount}) <= Baseline (${baselineResult.data.topicCount})` : `Filtered (${filteredResult.data.topicCount}) > Baseline (${baselineResult.data.topicCount})`
        );
        
        // Test 1C: Multiple identical queries should return identical results
        console.log(`🔍 Testing query repeatability for version ${version}`);
        const repeatResult = await this.interface.executeQueryAgainstVersion(baselineQuery, version);
        
        const repeatConsistent = repeatResult.data.messageCount === baselineResult.data.messageCount && 
                                repeatResult.data.topicCount === baselineResult.data.topicCount;
        
        this.addTestResult(
            'Query Repeatability',
            repeatConsistent,
            repeatConsistent ? 'Identical queries return identical results' : 'Query results are non-deterministic'
        );
        
        return results;
    }

    async testVersionConsistency() {
        console.log('\n📊 Test 2: Version Consistency');
        console.log('-'.repeat(50));
        
        const queryData = {
            type: 'channel_query',
            dataset: this.testChannel.toString(),
            users: [],
            versions: this.testVersions,
            parameters: {},
            timestamp: new Date().toISOString()
        };
        
        const versionResults = {};
        
        // Test each version independently
        for (const version of this.testVersions) {
            try {
                console.log(`🔍 Testing version ${version}`);
                const result = await this.interface.executeQueryAgainstVersion(queryData, version);
                versionResults[version] = result;
                
                console.log(`✅ Version ${version}: ${result.data.messageCount} messages, ${result.data.topicCount} topics, ${result.data.activeUsers} users`);
                
                // Validate version number in result matches request
                const versionMatches = result.version === version;
                this.addTestResult(
                    `Version ${version} Number Match`,
                    versionMatches,
                    versionMatches ? 'Version number matches' : `Expected ${version}, got ${result.version}`
                );
                
            } catch (error) {
                console.error(`❌ Version ${version} failed:`, error);
                this.addTestResult(`Version ${version} Query`, false, error.message);
            }
        }
        
        // Test version evolution logic
        const versions = Object.keys(versionResults).map(Number).sort((a, b) => a - b);
        if (versions.length >= 2) {
            const firstVersion = versionResults[versions[0]];
            const lastVersion = versionResults[versions[versions.length - 1]];
            
            const evolutionExpected = lastVersion.data.messageCount >= firstVersion.data.messageCount;
            this.addTestResult(
                'Version Evolution Logic',
                evolutionExpected,
                evolutionExpected ? 'Later versions have >= messages than earlier' : 'Version evolution logic broken'
            );
        }
        
        return versionResults;
    }

    async testUserFilteringConsistency() {
        console.log('\n📊 Test 3: User Filtering Consistency');
        console.log('-'.repeat(50));
        
        const version = this.testVersions[2]; // Latest version
        const baselineQuery = {
            type: 'channel_query',
            dataset: this.testChannel.toString(),
            users: [],
            versions: [version],
            parameters: {},
            timestamp: new Date().toISOString()
        };
        
        try {
            // Get baseline (all users)
            console.log('🔍 Getting baseline (all users)');
            const baselineResult = await this.interface.executeQueryAgainstVersion(baselineQuery, version);
            
            // Test single user filtering
            for (const userId of this.testUsers.slice(0, 2)) {
                const userQuery = { ...baselineQuery, users: [userId] };
                console.log(`🔍 Testing single user filter: ${userId}`);
                const userResult = await this.interface.executeQueryAgainstVersion(userQuery, version);
                
                const userMessagesLessOrEqual = userResult.data.messageCount <= baselineResult.data.messageCount;
                this.addTestResult(
                    `Single User Filter ${userId}`,
                    userMessagesLessOrEqual,
                    userMessagesLessOrEqual ? 'Filtered messages <= total messages' : 'Filtered messages > total messages'
                );
            }
            
            // Test multi-user filtering
            const multiUserQuery = { ...baselineQuery, users: this.testUsers.slice(0, 2) };
            console.log('🔍 Testing multi-user filter');
            const multiUserResult = await this.interface.executeQueryAgainstVersion(multiUserQuery, version);
            
            const multiUserMessagesLessOrEqual = multiUserResult.data.messageCount <= baselineResult.data.messageCount;
            this.addTestResult(
                'Multi-User Filter',
                multiUserMessagesLessOrEqual,
                multiUserMessagesLessOrEqual ? 'Multi-user filtered messages <= total messages' : 'Multi-user filtered messages > total messages'
            );
            
        } catch (error) {
            console.error('❌ User filtering test failed:', error);
            this.addTestResult('User Filtering Test', false, error.message);
        }
    }

    async testApiResponseStructure() {
        console.log('\n📊 Test 4: API Response Structure');
        console.log('-'.repeat(50));
        
        const endpoints = [
            'get_topic_tree_by_channel_and_version',
            'get_topic_tree_by_channel_and_user', 
            'get_topic_tree_by_channel_and_users'
        ];
        
        for (const endpoint of endpoints) {
            try {
                let params;
                switch (endpoint) {
                    case 'get_topic_tree_by_channel_and_version':
                        params = { channelId: this.testChannel, version: this.testVersions[0] };
                        break;
                    case 'get_topic_tree_by_channel_and_user':
                        params = { channelId: this.testChannel, version: this.testVersions[0], userId: this.testUsers[0] };
                        break;
                    case 'get_topic_tree_by_channel_and_users':
                        params = { channelId: this.testChannel, version: this.testVersions[0], userIds: this.testUsers.slice(0, 2).join(',') };
                        break;
                }
                
                console.log(`🔍 Testing API endpoint: ${endpoint}`);
                const response = await this.interface.apiCall(endpoint, params);
                
                // Validate response structure
                const hasTree = response && response.tree;
                const hasMessages = response.tree && response.tree.messages;
                const hasChannelId = response.channelId === this.testChannel;
                const hasVersion = response.version === this.testVersions[0];
                
                this.addTestResult(`${endpoint} - Tree Structure`, hasTree, hasTree ? 'Tree present' : 'Tree missing');
                this.addTestResult(`${endpoint} - Messages`, hasMessages, hasMessages ? 'Messages present' : 'Messages missing');
                this.addTestResult(`${endpoint} - Channel ID`, hasChannelId, hasChannelId ? 'Channel ID matches' : 'Channel ID mismatch');
                this.addTestResult(`${endpoint} - Version`, hasVersion, hasVersion ? 'Version matches' : 'Version mismatch');
                
            } catch (error) {
                console.error(`❌ ${endpoint} failed:`, error);
                this.addTestResult(`API ${endpoint}`, false, error.message);
            }
        }
    }

    async testProcessingLogicValidation() {
        console.log('\n📊 Test 5: Processing Logic Validation');
        console.log('-'.repeat(50));
        
        try {
            // Get raw tree data
            const response = await this.interface.apiCall('get_topic_tree_by_channel_and_version', {
                channelId: this.testChannel,
                version: this.testVersions[0]
            });
            
            if (!response || !response.tree) {
                this.addTestResult('Processing Logic - Raw Data', false, 'No tree data available');
                return;
            }
            
            const treeData = response.tree;
            const queryData = {
                type: 'channel_query',
                dataset: this.testChannel.toString(),
                users: [],
                versions: [this.testVersions[0]],
                parameters: {},
                timestamp: new Date().toISOString()
            };
            
            // Process the data
            const processedResult = this.interface.processTreeLocally(treeData, queryData, this.testVersions[0]);
            
            // Validate processing results
            const rawMessageCount = treeData.messages ? Object.keys(treeData.messages).length : 0;
            const processedMessageCount = processedResult.data.messageCount;
            
            const messageCountMatches = rawMessageCount === processedMessageCount;
            this.addTestResult(
                'Processing - Message Count',
                messageCountMatches,
                messageCountMatches ? `Raw: ${rawMessageCount}, Processed: ${processedMessageCount}` : `Mismatch - Raw: ${rawMessageCount}, Processed: ${processedMessageCount}`
            );
            
            // Validate topic processing
            const hasTopics = processedResult.data.topics && processedResult.data.topics.length > 0;
            this.addTestResult('Processing - Topic Extraction', hasTopics, hasTopics ? 'Topics extracted successfully' : 'No topics extracted');
            
            // Validate insights generation
            const hasInsights = processedResult.insights && processedResult.insights.length > 0;
            this.addTestResult('Processing - Insights Generation', hasInsights, hasInsights ? 'Insights generated' : 'No insights generated');
            
            // Validate user extraction
            const hasUsers = processedResult.data.activeUsers > 0;
            this.addTestResult('Processing - User Extraction', hasUsers, hasUsers ? `${processedResult.data.activeUsers} users found` : 'No users found');
            
        } catch (error) {
            console.error('❌ Processing logic test failed:', error);
            this.addTestResult('Processing Logic Test', false, error.message);
        }
    }

    addTestResult(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${testName}: ${details}`);
    }

    generateTestReport() {
        console.log('\n📋 Test Results Summary');
        console.log('=' .repeat(60));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(t => !t.passed).forEach(test => {
                console.log(`  • ${test.name}: ${test.details}`);
            });
        }
        
        // Display in UI
        this.displayTestResultsInUI();
        
        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: Math.round((passedTests / totalTests) * 100),
            results: this.testResults
        };
    }

    displayTestResultsInUI() {
        // Create test results section
        const existingTestResults = document.getElementById('testResults');
        if (existingTestResults) {
            existingTestResults.remove();
        }
        
        const testResultsSection = document.createElement('section');
        testResultsSection.id = 'testResults';
        testResultsSection.className = 'results-section';
        testResultsSection.style.marginTop = '32px';
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        
        testResultsSection.innerHTML = `
            <h2>🧪 Test Results</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                <div style="padding: 16px; background: #f0fdf4; border-radius: 8px; text-align: center;">
                    <strong style="color: #16a34a; font-size: 24px;">${passedTests}</strong><br>
                    <span style="color: #16a34a;">Passed</span>
                </div>
                <div style="padding: 16px; background: #fef2f2; border-radius: 8px; text-align: center;">
                    <strong style="color: #dc2626; font-size: 24px;">${failedTests}</strong><br>
                    <span style="color: #dc2626;">Failed</span>
                </div>
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; text-align: center;">
                    <strong style="color: #2563eb; font-size: 24px;">${Math.round((passedTests / totalTests) * 100)}%</strong><br>
                    <span style="color: #2563eb;">Success Rate</span>
                </div>
            </div>
            
            <div class="test-details">
                <h3>📋 Detailed Results</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f8fafc;">
                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Test Name</th>
                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;">Status</th>
                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Details</th>
                    </tr>
                    ${this.testResults.map(test => `
                        <tr style="background: ${test.passed ? '#f0fdf4' : '#fef2f2'};">
                            <td style="padding: 12px; border: 1px solid #e2e8f0;">${test.name}</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;">
                                ${test.passed ? '✅ PASS' : '❌ FAIL'}
                            </td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;">${test.details}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
        
        // Add to page
        const main = document.querySelector('main');
        main.appendChild(testResultsSection);
    }

    // Utility method to compare API responses directly
    async debugQueryTypeComparison(version = 1) {
        console.log(`\n🔍 Debug: Comparing Query Types for Version ${version}`);
        console.log('-'.repeat(60));
        
        const endpoints = [
            { name: 'channel_query', endpoint: 'get_topic_tree_by_channel_and_version', params: { channelId: this.testChannel, version } },
            { name: 'user_analysis', endpoint: 'get_topic_tree_by_channel_and_user', params: { channelId: this.testChannel, version, userId: this.testUsers[0] } },
            { name: 'users_analysis', endpoint: 'get_topic_tree_by_channel_and_users', params: { channelId: this.testChannel, version, userIds: this.testUsers.slice(0, 2).join(',') } }
        ];
        
        for (const { name, endpoint, params } of endpoints) {
            try {
                console.log(`\n📡 ${name} (${endpoint})`);
                console.log('Parameters:', params);
                
                const response = await this.interface.apiCall(endpoint, params);
                const messageCount = response.tree?.messages ? Object.keys(response.tree.messages).length : 0;
                const topicCount = response.tree?.topics ? Object.keys(response.tree.topics).length : 0;
                
                console.log(`📊 Raw API Response: ${messageCount} messages, ${topicCount} topics`);
                
                // Sample some message IDs to see if they're different
                if (response.tree?.messages) {
                    const messageIds = Object.keys(response.tree.messages).slice(0, 5);
                    console.log(`📝 Sample message IDs: ${messageIds.join(', ')}`);
                }
                
            } catch (error) {
                console.error(`❌ ${name} failed:`, error);
            }
        }
    }
}

// Add test button to UI and initialize testing
document.addEventListener('DOMContentLoaded', () => {
    // Wait for main interface to initialize
    setTimeout(() => {
        if (window.topicTreeInterface) {
            window.testSuite = new TopicTreeTestSuite(window.topicTreeInterface);
            
            // Test suite available via console: window.testSuite.runAllTests()
            
            console.log('🧪 Test Suite initialized. Click "Run Test Suite" to validate query consistency.');
        }
    }, 1000);
});
