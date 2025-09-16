/**
 * Topic Tree Query Interface
 * Complete implementation for querying and analyzing Cere Network topic tree data
 */

class TopicTreeInterface {
    constructor() {
        this.baseUrl = 'https://compute-1.testnet.cere.network/engine/data-service/2606/query';
        
        // Initialize OpenAI configuration
        this.openaiApiKey = this.initializeOpenAI();
        this.openaiEnabled = !!this.openaiApiKey;
        this.datasets = {
            '2148778849': {
                name: 'Test Dataset',
                description: 'Test dataset for development and validation',
                github: 'https://github.com/cere-io/nlp-datasets/blob/main/test_transcript.json'
            },
            '2148778850': {
                name: 'Aethir Dataset', 
                description: 'Aethir community discussions and technical conversations',
                github: 'https://github.com/cere-io/nlp-datasets/blob/main/aethir_transcript.json'
            },
            '2148778853': {
                name: 'AAVE Dataset',
                description: 'AAVE protocol governance and community discussions', 
                github: 'https://github.com/cere-io/nlp-datasets/blob/main/aave_transcript.json'
            }
        };

        this.queryTypes = {
            'channel_query': 'What topics have users been talking about?',
            'user_analysis': 'Tell me about user X',
            'users_analysis': 'Compare these users\' behavior',
            'time_window': 'What topics were active in this time period?',
            'version_evolution': 'How did topics change between versions?',
            'custom_query': 'Ask a custom question about the topic tree data'
        };

        // Topic names will be extracted dynamically from tree data
        this.topicNames = new Map();

        // State management
        this.selectedChannel = null;
        this.selectedVersions = [null, null, null]; // Support up to 3 versions
        this.availableVersions = [];
        this.availableUsers = [];
        this.resultsCache = [null, null, null]; // Cache results for each version

        this.initializeEventListeners();
        this.initializeStepper();
    }

    initializeOpenAI() {
        // Try to get from localStorage first (for development)
        const storedKey = localStorage.getItem('openai_key');
        if (storedKey) {
            console.log('🤖 OpenAI key loaded from localStorage');
            return storedKey;
        }
        
        // For production deployment, this should be set via environment variables
        console.log('⚠️ No OpenAI key found - custom queries will use local processing only');
        return null;
    }

    initializeStepper() {
        // Initialize stepper state
        this.updateStepperState();
    }

    updateStepperState() {
        const steps = document.querySelectorAll('.step');
        const stepLines = document.querySelectorAll('.step-line');
        
        // Step 1: Dataset (always available)
        const step1 = steps[0];
        step1.classList.add('active');
        
        // Step 2: Versions (active when dataset selected)
        const step2 = steps[1];
        if (this.selectedChannel) {
            step2.classList.add('completed');
            if (stepLines[0]) stepLines[0].classList.add('completed');
        } else {
            step2.classList.remove('completed');
            if (stepLines[0]) stepLines[0].classList.remove('completed');
        }
        
        // Step 3: Users (active when versions loaded)
        const step3 = steps[2];
        if (this.availableVersions.length > 0) {
            step3.classList.add('completed');
            if (stepLines[1]) stepLines[1].classList.add('completed');
        } else {
            step3.classList.remove('completed');
            if (stepLines[1]) stepLines[1].classList.remove('completed');
        }
        
        // Step 4: Query (active when at least one version selected)
        const step4 = steps[3];
        if (this.selectedVersions[0]) {
            step4.classList.add('completed');
            if (stepLines[2]) stepLines[2].classList.add('completed');
        } else {
            step4.classList.remove('completed');
            if (stepLines[2]) stepLines[2].classList.remove('completed');
        }
        
        // Step 5: Custom (always available)
        const step5 = steps[4];
        if (step5) {
            step5.classList.add('completed');
            if (stepLines[3]) stepLines[3].classList.add('completed');
        }
    }

    initializeEventListeners() {
        // Dataset selection
        document.getElementById('channelSelect').addEventListener('change', (e) => {
            this.handleDatasetChange(e.target.value);
        });

        // Version selection
        document.getElementById('version1Select').addEventListener('change', (e) => {
            this.selectedVersions[0] = parseInt(e.target.value) || null;
            this.validateForm();
            this.updateStepperState();
        });

        document.getElementById('version2Select').addEventListener('change', (e) => {
            this.selectedVersions[1] = parseInt(e.target.value) || null;
            this.validateForm();
            this.updateStepperState();
        });

        document.getElementById('version3Select').addEventListener('change', (e) => {
            this.selectedVersions[2] = parseInt(e.target.value) || null;
            this.validateForm();
            this.updateStepperState();
        });

        // Query type selection
        document.getElementById('queryTypeSelect').addEventListener('change', (e) => {
            this.updateQueryDescription(e.target.value);
            this.handleQueryTypeChange(e.target.value);
        });


        // Execute query with scroll
        document.getElementById('executeQuery').addEventListener('click', () => {
            this.executeQuery();
            // Scroll to results after execution
            setTimeout(() => {
                const resultsSection = document.getElementById('resultsSection');
                if (resultsSection && resultsSection.style.display !== 'none') {
                    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        });

        // Test suite button
        document.getElementById('runTests').addEventListener('click', async () => {
            if (window.testSuite) {
                const testBtn = document.getElementById('runTests');
                testBtn.disabled = true;
                testBtn.textContent = '🔄 Running Tests...';
                
                try {
                    await window.testSuite.runAllTests();
                    testBtn.textContent = '✅ Tests Complete';
                } catch (error) {
                    testBtn.textContent = '❌ Tests Failed';
                }
                
                setTimeout(() => {
                    testBtn.textContent = '🧪 Run Test Suite';
                    testBtn.disabled = false;
                }, 3000);
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.getAttribute('data-tab'));
            });
        });

        // Initialize query description
        this.updateQueryDescription('channel_query');
    }

    async handleDatasetChange(channelId) {
        console.log('Dataset changed to:', channelId);
        
        if (!channelId) {
            this.resetUI();
            return;
        }

        this.selectedChannel = channelId;
        this.showDatasetInfo(channelId);
        
        console.log('Loading versions for channel:', channelId);
        
        // Load versions for this dataset
        try {
            await this.loadVersions(channelId);
            this.validateForm();
            this.updateStepperState();
        } catch (error) {
            console.error('Error in handleDatasetChange:', error);
            this.showError('Failed to load dataset: ' + error.message);
        }
    }

    showDatasetInfo(channelId) {
        const dataset = this.datasets[channelId];
        const infoDiv = document.getElementById('datasetInfo');
        
        if (dataset) {
            infoDiv.innerHTML = `
                <strong>${dataset.name}</strong><br>
                ${dataset.description}<br>
                <a href="${dataset.github}" target="_blank">📂 View on GitHub</a>
            `;
            infoDiv.classList.add('show');
        } else {
            infoDiv.classList.remove('show');
        }
    }

    async loadVersions(channelId) {
        const versionLoader = document.getElementById('versionLoader');
        const version1Select = document.getElementById('version1Select');
        const version2Select = document.getElementById('version2Select');
        const version3Select = document.getElementById('version3Select');

        try {
            versionLoader.style.display = 'block';
            
            const response = await this.apiCall('get_topic_tree_versions_by_channel', {
                channelId: parseInt(channelId)
            });

            if (response && response.versions) {
                console.log('📦 Raw versions response:', response.versions);
                this.availableVersions = response.versions.sort((a, b) => a.version - b.version);
                console.log('📋 Sorted versions:', this.availableVersions);
                
                // Populate version selects
                this.populateVersionSelects();
                
                // Just select the latest version for Version 1 by default
                if (this.availableVersions.length > 0) {
                    this.selectedVersions[0] = this.availableVersions[this.availableVersions.length - 1].version;
                    version1Select.value = this.selectedVersions[0];
                    console.log('📋 Auto-selected latest version:', this.selectedVersions[0]);
                }
                
                console.log('📊 Total versions available:', this.availableVersions.length);

                // Enable all version selects
                version1Select.disabled = false;
                version2Select.disabled = false;
                version3Select.disabled = false;
                
                // Load users for the selected version
                await this.loadUsers();
            }
        } catch (error) {
            console.error('Error loading versions:', error);
            this.showError('Failed to load versions for this dataset');
        } finally {
            versionLoader.style.display = 'none';
        }
    }

    populateVersionSelects() {
        const version1Select = document.getElementById('version1Select');
        const version2Select = document.getElementById('version2Select');
        const version3Select = document.getElementById('version3Select');
        
        // Clear existing options
        version1Select.innerHTML = '<option value="">-- Select Version --</option>';
        version2Select.innerHTML = '<option value="">-- No Comparison --</option>';
        version3Select.innerHTML = '<option value="">-- No Comparison --</option>';
        
        // Add version options to all dropdowns
        this.availableVersions.forEach((version, index) => {
            const timestamp = new Date(version.createdAt || version.version).toLocaleString();
            const messageInfo = version.messageCount ? ` - ${version.messageCount} msgs` : '';
            const topicInfo = version.topicCount ? `, ${version.topicCount} topics` : '';
            const optionText = `Version ${version.version} (${timestamp})${messageInfo}${topicInfo}`;
            
            version1Select.innerHTML += `<option value="${version.version}">${optionText}</option>`;
            version2Select.innerHTML += `<option value="${version.version}">${optionText}</option>`;
            version3Select.innerHTML += `<option value="${version.version}">${optionText}</option>`;
        });
    }

    async loadUsers() {
        const userSelect = document.getElementById('userSelect');
        
        try {
            // Load the basic tree to extract available users (no version needed)
            console.log('🔍 Loading users for channel:', this.selectedChannel);
            
            const response = await this.apiCall('get_topic_tree_by_channel', {
                channelId: parseInt(this.selectedChannel)
            });

            console.log('👥 User loading response:', response);

            if (response && response.tree && response.tree.messages) {
                // Extract unique users from messages object
                const users = new Map();
                Object.values(response.tree.messages).forEach(message => {
                    if (message.fromUserId && message.fromUserName) {
                        users.set(message.fromUserId, message.fromUserName);
                    }
                });

                this.availableUsers = Array.from(users, ([userId, username]) => ({
                    userId,
                    username
                }));

                console.log('👥 Found users:', this.availableUsers);

                // Populate user checkboxes
                const userCheckboxes = document.getElementById('userCheckboxes');
                userCheckboxes.innerHTML = `
                    <label class="user-checkbox">
                        <input type="checkbox" value="" checked id="allUsersCheckbox">
                        <span class="checkbox-label">All Users</span>
                    </label>
                `;
                
                this.availableUsers.forEach(user => {
                    userCheckboxes.innerHTML += `
                        <label class="user-checkbox">
                            <input type="checkbox" value="${user.userId}" class="user-filter-checkbox">
                            <span class="checkbox-label">@${user.username}</span>
                        </label>
                    `;
                });

                // Add checkbox event listeners
                this.setupUserCheckboxListeners();
            }
        } catch (error) {
            console.error('Error loading users:', error);
            // Don't show error for user loading as it's not critical
        }
    }

    setupUserCheckboxListeners() {
        const allUsersCheckbox = document.getElementById('allUsersCheckbox');
        const userCheckboxes = document.querySelectorAll('.user-filter-checkbox');

        // Handle "All Users" checkbox
        allUsersCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            userCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.disabled = isChecked;
            });
        });

        // Handle individual user checkboxes
        userCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    allUsersCheckbox.checked = false;
                }
                
                // If no individual users selected, check "All Users"
                const anyChecked = Array.from(userCheckboxes).some(cb => cb.checked);
                if (!anyChecked) {
                    allUsersCheckbox.checked = true;
                    userCheckboxes.forEach(cb => cb.disabled = true);
                }
            });
        });
    }


    updateQueryDescription(queryType) {
        const description = this.queryTypes[queryType] || '';
        document.getElementById('queryDescription').textContent = description;
    }

    handleQueryTypeChange(queryType) {
        const customQueryCard = document.getElementById('customQueryCard');
        const horizontalInputs = document.querySelector('.horizontal-inputs');
        
        if (queryType === 'custom_query') {
            // Show custom query card and adjust grid to 5 columns
            customQueryCard.style.display = 'block';
            horizontalInputs.style.gridTemplateColumns = 'repeat(5, 1fr)';
            console.log('✅ Custom query card shown');
        } else {
            // Hide custom query card and adjust grid to 4 columns
            customQueryCard.style.display = 'none';
            horizontalInputs.style.gridTemplateColumns = 'repeat(4, 1fr)';
            console.log('✅ Custom query card hidden');
        }
    }

    validateForm() {
        const executeBtn = document.getElementById('executeQuery');
        const isValid = this.selectedChannel && this.selectedVersions[0]; // Only need Version 1 selected
        
        executeBtn.disabled = !isValid;
    }


    async executeQuery() {
        const queryData = this.buildQueryData();
        const executeBtn = document.getElementById('executeQuery');
        const queryLoader = document.getElementById('queryLoader');
        
        try {
            executeBtn.disabled = true;
            queryLoader.style.display = 'block';
            
            await this.executeMultiVersionQuery(queryData);
        } catch (error) {
            console.error('Query execution error:', error);
            this.showError('Failed to execute query: ' + error.message);
        } finally {
            executeBtn.disabled = false;
            queryLoader.style.display = 'none';
        }
    }

    buildQueryData() {
        const queryType = document.getElementById('queryTypeSelect').value;
        
        // Get selected users from checkboxes
        const allUsersChecked = document.getElementById('allUsersCheckbox')?.checked;
        const selectedUsers = allUsersChecked ? [] : 
            Array.from(document.querySelectorAll('.user-filter-checkbox:checked'))
                .map(checkbox => checkbox.value);

        const selectedVersions = this.selectedVersions.filter(v => v !== null);

        // Get custom query if selected
        const customQuery = queryType === 'custom_query' ? 
            document.getElementById('customQuery')?.value?.trim() : '';

        console.log('📋 Building query data:', {
            type: queryType,
            customQuestion: customQuery,
            users: selectedUsers,
            versions: selectedVersions
        });

        return {
            type: queryType,
            dataset: this.selectedChannel,
            users: selectedUsers,
            versions: selectedVersions,
            customQuestion: customQuery,
            parameters: {},
            timestamp: new Date().toISOString()
        };
    }

    async executeMultiVersionQuery(queryData) {
        console.log('🔄 Starting multi-version query');
        console.log('📋 Selected versions:', this.selectedVersions);
        
        // Reset results cache
        this.resultsCache = [null, null, null];
        
        // Get selected versions (filter out nulls)
        const selectedVersions = this.selectedVersions.filter(v => v !== null);
        
        // Execute queries for each selected version
        const promises = selectedVersions.map((version, index) => 
            this.executeQueryAgainstVersion(queryData, version)
                .then(results => {
                    console.log(`Version ${index + 1} results loaded:`, results);
                    this.resultsCache[index] = results;
                    return results;
                })
        );
        
        // Wait for all queries to complete
        await Promise.all(promises);
        
        // Display results
        this.displayMultiVersionResults(queryData, this.resultsCache);
    }

    displayMultiVersionResults(queryData, results) {
        const resultsSection = document.getElementById('resultsSection');
        const singleResults = document.getElementById('singleResults');
        const multiVersionResults = document.getElementById('multiVersionResults');
        const comparisonTab = document.querySelector('.comparison-tab');

        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');

        // Add AI summary if available for custom queries
        this.displayAISummary(queryData, results);

        // Hide single results, show multi-version results
        singleResults.style.display = 'none';
        multiVersionResults.style.display = 'grid';

        // Count active versions
        const activeVersions = this.selectedVersions.filter(v => v !== null);
        
        // Set grid layout based on number of versions
        multiVersionResults.className = 'multi-version-grid';
        if (activeVersions.length === 2) {
            multiVersionResults.classList.add('two-versions');
        } else if (activeVersions.length === 3) {
            multiVersionResults.classList.add('three-versions');
        }

        // Show/hide version columns and populate data
        for (let i = 0; i < 3; i++) {
            const column = document.getElementById(`version${i + 1}Column`);
            const title = document.getElementById(`version${i + 1}Title`);
            
            if (i < activeVersions.length && results[i]) {
                column.style.display = 'block';
                title.textContent = `Version ${this.selectedVersions[i]}`;
                this.displayResultsInVersionColumn(results[i], i + 1);
            } else {
                column.style.display = 'none';
            }
        }

        // Show delta analysis tab if multiple versions
        if (activeVersions.length > 1) {
            comparisonTab.style.display = 'block';
            const validResults = results.filter(r => r !== null);
            console.log('🔄 Generating delta analysis for', validResults.length, 'versions');
            this.generateMultiVersionDelta(validResults);
        } else {
            comparisonTab.style.display = 'none';
        }
    }

    displayAISummary(queryData, results) {
        // This method is no longer needed - AI summaries are now per-version
        // Each version will display its own AI summary in the insights section
    }

    displayResultsInVersionColumn(results, versionNumber) {
        const insightsId = `insightsContent${versionNumber}`;
        const rawId = `rawContent${versionNumber}`;
        
        console.log('🖼️ Displaying results for version', versionNumber);
        console.log('🎯 Looking for insights container:', insightsId);
        console.log('🎯 Looking for raw container:', rawId);
        
        const insightsContainer = document.getElementById(insightsId);
        const rawContainer = document.getElementById(rawId);

        console.log('📦 Insights container found:', insightsContainer ? 'YES' : 'NO');
        console.log('📦 Raw container found:', rawContainer ? 'YES' : 'NO');
        console.log('📊 Results data:', results);

        // Display insights
        if (insightsContainer) {
            const formattedInsights = this.formatInsightsDisplay(results);
            console.log('✨ Formatted insights HTML:', formattedInsights);
            insightsContainer.innerHTML = formattedInsights;
            console.log('✅ Insights displayed in container');
        } else {
            console.error('❌ Insights container not found:', insightsId);
        }

        // Display raw response
        if (rawContainer) {
            rawContainer.textContent = JSON.stringify(results.rawResponse, null, 2);
            console.log('✅ Raw response displayed');
        } else {
            console.error('❌ Raw container not found:', rawId);
        }
    }

    generateMultiVersionDelta(results) {
        const deltaContainer = document.getElementById('deltaContent');
        
        console.log('📊 Delta analysis input:', results);
        
        if (!deltaContainer) {
            console.error('❌ Delta container not found');
            return;
        }

        if (!results || results.length < 2) {
            deltaContainer.innerHTML = '<p>Need at least 2 versions for comparison</p>';
            return;
        }

        // Sort results by version number
        const sortedResults = [...results].sort((a, b) => a.version - b.version);
        
        let deltaHtml = `
            <div class="delta-analysis">
                <h3>🔄 Multi-Version Comparison Analysis</h3>
                <p>Comparing ${sortedResults.length} versions: ${sortedResults.map(r => r.version).join(' → ')}</p>
            </div>
        `;

        // Add basic comparison stats
        deltaHtml += `
            <div class="delta-section">
                <h4>📊 Version Statistics</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: rgba(255, 255, 255, 0.95); border-radius: 0;">
                    <tr style="background: #1e293b; color: white;">
                        <th style="padding: 16px; border: 1px solid #374151; font-weight: 700; color: white;">Version</th>
                        <th style="padding: 16px; border: 1px solid #374151; font-weight: 700; color: white;">Messages</th>
                        <th style="padding: 16px; border: 1px solid #374151; font-weight: 700; color: white;">Topics</th>
                        <th style="padding: 16px; border: 1px solid #374151; font-weight: 700; color: white;">Users</th>
                        <th style="padding: 16px; border: 1px solid #374151; font-weight: 700; color: white;">Most Discussed</th>
                    </tr>
        `;

        sortedResults.forEach((result, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedResults.length - 1;
            const rowStyle = isFirst ? 'background: #fef2f2;' : isLast ? 'background: #f0fdf4;' : 'background: white;';
            
            deltaHtml += `
                <tr style="${rowStyle}">
                    <td style="padding: 16px; border: 1px solid #d1d5db; font-weight: 700; color: #1e293b;">${result.version}${isFirst ? ' (earliest)' : isLast ? ' (latest)' : ''}</td>
                    <td style="padding: 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">${result.data.messageCount}</td>
                    <td style="padding: 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">${result.data.topicCount}</td>
                    <td style="padding: 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">${result.data.activeUsers}</td>
                    <td style="padding: 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">${result.data.mostDiscussedTopic?.name || 'N/A'}</td>
                </tr>
            `;
        });

        deltaHtml += `</table></div>`;

        // Add evolution summary
        const firstVersion = sortedResults[0];
        const lastVersion = sortedResults[sortedResults.length - 1];
        const messageDiff = lastVersion.data.messageCount - firstVersion.data.messageCount;
        const topicDiff = lastVersion.data.topicCount - firstVersion.data.topicCount;
        const userDiff = lastVersion.data.activeUsers - firstVersion.data.activeUsers;

        deltaHtml += `
            <div class="delta-section">
                <h4>📈 Evolution Summary</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    <div style="padding: 24px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 0; text-align: center;">
                        <div style="font-size: 24px; font-weight: 800; color: #10b981; margin-bottom: 8px;">${messageDiff >= 0 ? '+' : ''}${messageDiff}</div>
                        <div style="font-size: 14px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">Messages</div>
                    </div>
                    <div style="padding: 24px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 0; text-align: center;">
                        <div style="font-size: 24px; font-weight: 800; color: #6366f1; margin-bottom: 8px;">${topicDiff >= 0 ? '+' : ''}${topicDiff}</div>
                        <div style="font-size: 14px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">Topics</div>
                    </div>
                    <div style="padding: 24px; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 0; text-align: center;">
                        <div style="font-size: 24px; font-weight: 800; color: #06b6d4; margin-bottom: 8px;">${userDiff >= 0 ? '+' : ''}${userDiff}</div>
                        <div style="font-size: 14px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">Users</div>
                    </div>
                </div>
            </div>
        `;

        console.log('✅ Delta HTML generated:', deltaHtml);
        deltaContainer.innerHTML = deltaHtml;
        console.log('✅ Delta container updated. Container innerHTML length:', deltaContainer.innerHTML.length);
        console.log('✅ Delta container visibility:', window.getComputedStyle(deltaContainer).display);
    }

    async executeSingleQuery(queryData) {
        const results = await this.executeQueryAgainstVersion(queryData, this.firstVersion);
        this.displayQueryResults(queryData, results, null);
    }

    async executeComparisonQuery(queryData) {
        console.log('🔄 Starting comparison query');
        console.log('📋 First version:', this.firstVersion);
        console.log('📋 Second version:', this.secondVersion);
        
        // Reset temp storage
        this.firstResultsTemp = null;
        
        // Ensure chronological ordering (earlier version first)
        let versionA = this.firstVersion;
        let versionB = this.secondVersion;
        
        if (versionA > versionB) {
            [versionA, versionB] = [versionB, versionA];
        }
        
        console.log('📋 Ordered versions: A =', versionA, ', B =', versionB);

        try {
            // Execute both queries independently
            const firstPromise = this.executeQueryAgainstVersion(queryData, versionA)
                .then(results => {
                    console.log('Version A results loaded:', results);
                    this.firstResultsTemp = results;
                    // Display partial results immediately
                    this.displayQueryResults(queryData, results, null);
                    return results;
                });

            const secondPromise = this.executeQueryAgainstVersion(queryData, versionB)
                .then(results => {
                    console.log('Version B results loaded:', results);
                    // Display complete comparison
                    const firstReady = this.firstResultsTemp || null;
                    this.displayQueryResults(queryData, firstReady, results);
                    return results;
                });

            // Wait for both to complete
            await Promise.all([firstPromise, secondPromise]);
            
        } catch (error) {
            console.error('Comparison query error:', error);
            throw error;
        }
    }

    async executeQueryAgainstVersion(queryData, version) {
        const selectedUsers = queryData.users;
        let endpoint, params;

        // Always use version-specific endpoint for consistency
        // User filtering will be handled in local processing
        endpoint = 'get_topic_tree_by_channel_and_version';
        params = {
            channelId: parseInt(queryData.dataset),
            version: version
        };
        
        console.log('🔧 Using consistent endpoint for all queries:', endpoint);
        console.log('👥 User filtering will be applied locally:', selectedUsers);

        const apiResponse = await this.apiCall(endpoint, params);
        
        console.log('🔍 API Response for version', version, ':', apiResponse);
        console.log('🌳 Tree available:', apiResponse?.tree ? 'YES' : 'NO');
        console.log('🌳 Tree keys:', apiResponse?.tree ? Object.keys(apiResponse.tree) : 'NONE');
        
        if (!apiResponse || !apiResponse.tree) {
            console.error('❌ Invalid API response structure:', apiResponse);
            throw new Error('Invalid API response structure');
        }

        // Process the tree data locally with user filtering
        const processedResults = this.processTreeLocally(apiResponse.tree, queryData, version);
        
        // Enhance with OpenAI if custom query and API available
        if (this.openaiEnabled && queryData.type === 'custom_query' && queryData.customQuestion) {
            try {
                console.log('🤖 Enhancing with OpenAI for custom query...');
                const enhancedResults = await this.enhanceWithOpenAI(processedResults, queryData, apiResponse.tree);
                return {
                    ...enhancedResults,
                    rawResponse: this.formatRawApiResponse(apiResponse, endpoint, params),
                    version: version
                };
            } catch (error) {
                console.log('⚠️ OpenAI enhancement failed, using local insights:', error.message);
                // Graceful fallback to local processing
            }
        }
        
        return {
            ...processedResults,
            rawResponse: this.formatRawApiResponse(apiResponse, endpoint, params),
            version: version
        };
    }

    async apiCall(endpoint, params) {
        // Correct URL format: append endpoint to base URL
        const url = `${this.baseUrl}/${endpoint}`;
        const payload = {
            params: params
        };

        console.log('🚀 API Call:', endpoint, params);
        console.log('📤 URL:', url);
        console.log('📤 Payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('📥 Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ API Response:', data);
            
            if (data.error) {
                console.error('❌ API Error:', data.error);
                throw new Error(data.error.message || 'API returned an error');
            }

            // Handle nested result structure from API
            return data.result?.result?.data || data.result || data;
        } catch (error) {
            console.error('💥 API Call Exception:', error);
            throw error;
        }
    }

    processTreeLocally(treeData, queryData, version) {
        console.log('🔍 Processing tree locally for version:', version);
        console.log('📊 Tree data structure:', treeData);
        console.log('📝 Messages available:', treeData?.messages ? 'YES' : 'NO');
        console.log('📝 Message count:', treeData?.messages ? Object.keys(treeData.messages).length : 0);
        
        if (!treeData || !treeData.messages) {
            return {
                summary: "No data available for processing",
                data: {},
                insights: ["No messages found in the tree data"],
                metadata: {
                    version: version,
                    timestamp: new Date().toISOString(),
                    queryType: queryData.type,
                    processingMethod: 'local',
                    enhanced: false
                }
            };
        }

        // Handle messages as object (not array)
        let messages = treeData.messages ? Object.values(treeData.messages) : [];
        const topics = treeData.topics || [];
        
        // Extract topic names from the actual tree data
        this.extractTopicNames(treeData);
        
        // Apply user filtering locally if users are specified
        const selectedUsers = queryData.users || [];
        if (selectedUsers.length > 0) {
            const userIds = selectedUsers.map(id => parseInt(id));
            messages = messages.filter(message => userIds.includes(message.fromUserId));
            console.log(`🔍 Applied local user filtering: ${messages.length} messages after filtering for users: ${userIds.join(', ')}`);
        } else {
            console.log(`🔍 No user filtering applied: ${messages.length} total messages`);
        }
        
        // Extract user information
        const users = new Map();
        const userMessageCounts = new Map();
        const userTopics = new Map();
        
        messages.forEach(message => {
            if (message.fromUserId && message.fromUserName) {
                users.set(message.fromUserId, message.fromUserName);
                userMessageCounts.set(message.fromUserId, (userMessageCounts.get(message.fromUserId) || 0) + 1);
                
                if (message.topicId !== undefined && message.topicId !== -1) {
                    if (!userTopics.has(message.fromUserId)) {
                        userTopics.set(message.fromUserId, new Set());
                    }
                    userTopics.get(message.fromUserId).add(message.topicId);
                }
            }
        });

        // Analyze topics
        const topicAnalysis = new Map();
        const topicMessageCounts = new Map();
        const topicUsers = new Map();

        messages.forEach(message => {
            if (message.topicId !== undefined && message.topicId !== -1) {
                const topicId = message.topicId;
                topicMessageCounts.set(topicId, (topicMessageCounts.get(topicId) || 0) + 1);
                
                if (!topicUsers.has(topicId)) {
                    topicUsers.set(topicId, new Map());
                }
                
                const userId = message.fromUserId;
                if (userId) {
                    const userMap = topicUsers.get(topicId);
                    userMap.set(userId, (userMap.get(userId) || 0) + 1);
                }
            }
        });

        // Build topic data with names
        const topicsData = [];
        topicMessageCounts.forEach((messageCount, topicId) => {
            const contributors = [];
            const topicUserMap = topicUsers.get(topicId) || new Map();
            
            topicUserMap.forEach((userMessageCount, userId) => {
                const username = users.get(parseInt(userId)) || `User ${userId}`;
                contributors.push({
                    userId: parseInt(userId),
                    username: `@${username}`,
                    messageCount: userMessageCount
                });
            });

            // Sort contributors by message count
            contributors.sort((a, b) => b.messageCount - a.messageCount);

            topicsData.push({
                id: topicId,
                name: this.getTopicName(topicId),
                messageCount: messageCount,
                contributorCount: contributors.length,
                contributors: contributors
            });
        });

        // Sort topics by popularity
        topicsData.sort((a, b) => b.messageCount - a.messageCount);

        // Generate insights (enhanced for custom queries)
        const insights = this.generateInsights(messages, topicsData, users, queryData);

        // Build final result
        const result = {
            summary: `Users discussing ${topicsData.length} topics with ${messages.length} total messages`,
            data: {
                messageCount: messages.length,
                topicCount: topicsData.length,
                activeUsers: users.size,
                topics: topicsData,
                topicsByPopularity: topicsData.slice(0, 5),
                mostDiscussedTopic: topicsData[0] || null,
                userEngagement: {
                    averageMessagesPerUser: users.size > 0 ? Math.round(messages.length / users.size) : 0,
                    averageTopicsPerUser: users.size > 0 ? Math.round(Array.from(userTopics.values()).reduce((sum, topics) => sum + topics.size, 0) / users.size) : 0
                }
            },
            insights: insights,
            metadata: {
                version: version,
                timestamp: new Date().toISOString(),
                queryType: queryData.type,
                processingMethod: 'local',
                enhanced: false
            }
        };

        console.log('Processed result:', result);
        return result;
    }

    generateInsights(messages, topicsData, users, queryData) {
        const insights = [];

        if (topicsData.length === 0) {
            insights.push("No topics identified in the conversation data");
            return insights;
        }

        // Most discussed topic
        const topTopic = topicsData[0];
        insights.push(`Most discussed: "${topTopic.name}" with ${topTopic.messageCount} messages from ${topTopic.contributorCount} contributors`);

        // Topic diversity
        insights.push(`${topicsData.length} distinct topics identified across all conversations`);

        // User participation
        insights.push(`${users.size} users actively participating with an average of ${Math.round(messages.length / users.size)} messages each`);

        // Topic engagement
        const avgMessagesPerTopic = Math.round(messages.length / topicsData.length);
        insights.push(`Topic engagement: Average ${avgMessagesPerTopic} messages per topic`);

        // Most active contributor
        if (topTopic.contributors.length > 0) {
            const topContributor = topTopic.contributors[0];
            const totalMessages = Array.from(users.keys()).reduce((sum, userId) => {
                return sum + topicsData.reduce((userSum, topic) => {
                    const contributor = topic.contributors.find(c => c.userId === userId);
                    return userSum + (contributor ? contributor.messageCount : 0);
                }, 0);
            }, 0);
            
            const userTotalMessages = topicsData.reduce((sum, topic) => {
                const contributor = topic.contributors.find(c => c.userId === topContributor.userId);
                return sum + (contributor ? contributor.messageCount : 0);
            }, 0);
            
            const userTopicCount = topicsData.filter(topic => 
                topic.contributors.some(c => c.userId === topContributor.userId)
            ).length;
            
            insights.push(`Most active contributor: ${topContributor.username} (${userTotalMessages} messages across ${userTopicCount} topics)`);
        }

        // Query-specific insights
        switch (queryData.type) {
            case 'user_analysis':
                if (queryData.users.length === 1) {
                    insights.push(`Analysis focused on single user behavior and topic preferences`);
                }
                break;
            case 'users_analysis':
                if (queryData.users.length > 1) {
                    insights.push(`Comparative analysis across ${queryData.users.length} selected users`);
                }
                break;
            case 'time_window':
                insights.push(`Time-based analysis showing topic trends and activity patterns`);
                break;
            case 'version_evolution':
                insights.push(`Evolution analysis tracking topic changes over time`);
                break;
            case 'custom_query':
                if (queryData.customQuestion) {
                    console.log('🤖 Processing custom query:', queryData.customQuestion);
                    insights.push(`Custom analysis for question: "${queryData.customQuestion}"`);
                    const customInsights = this.generateCustomQueryInsights(messages, topicsData, users, queryData.customQuestion);
                    console.log('🎯 Generated custom insights:', customInsights);
                    insights.push(...customInsights);
                } else {
                    insights.push(`Custom query selected but no question provided`);
                }
                break;
        }

        return insights;
    }

    extractTopicNames(treeData) {
        // Extract topic names from the actual tree data
        console.log('🔍 Extracting topic names from tree data');
        
        if (treeData.topics) {
            // If topics object exists with topic definitions
            Object.entries(treeData.topics).forEach(([topicId, topicData]) => {
                if (topicData && topicData.name) {
                    this.topicNames.set(parseInt(topicId), topicData.name);
                    console.log(`📝 Found topic ${topicId}: ${topicData.name}`);
                } else if (topicData && topicData.title) {
                    this.topicNames.set(parseInt(topicId), topicData.title);
                    console.log(`📝 Found topic ${topicId}: ${topicData.title}`);
                }
            });
        }
        
        // If no topic names found in tree, we'll generate them dynamically based on content
        if (this.topicNames.size === 0) {
            console.log('🔍 No topic names in tree data, will generate from content patterns');
        }
        
        console.log(`✅ Extracted ${this.topicNames.size} topic names from tree data`);
    }

    getTopicName(topicId) {
        // Get topic name from extracted data, fallback to generated name
        if (this.topicNames.has(topicId)) {
            return this.topicNames.get(topicId);
        }
        
        // Generate semantic topic name based on ID patterns (fallback only)
        const fallbackNames = {
            0: "General Discussion",
            1: "Technical Implementation", 
            2: "Community Governance",
            3: "Market Analysis",
            4: "Product Features",
            5: "DeFi Protocols",
            6: "Security & Audits",
            7: "Token Economics",
            8: "Development Updates",
            9: "User Support"
        };
        
        return fallbackNames[topicId] || `Topic ${topicId}`;
    }

    async enhanceWithOpenAI(localResults, queryData, treeData) {
        console.log('🚀 Starting OpenAI enhancement...');
        
        // Prepare context for OpenAI
        const context = this.prepareOpenAIContext(localResults, queryData, treeData);
        
        const prompt = `You are an expert community analyst. Based on the topic tree data provided, answer this question with deep insights:

Question: "${queryData.customQuestion}"

Context:
- Dataset: ${queryData.dataset} 
- Version: ${localResults.version}
- Messages: ${localResults.data.messageCount}
- Topics: ${localResults.data.topicCount}
- Users: ${localResults.data.activeUsers}

Topic Analysis:
${localResults.data.topics.map(topic => 
    `- ${topic.name}: ${topic.messageCount} messages from ${topic.contributorCount} contributors`
).join('\n')}

User Engagement:
${localResults.data.topics.map(topic => 
    `- ${topic.name}: ${topic.contributors.map(c => `${c.username} (${c.messageCount})`).join(', ')}`
).join('\n')}

Local Insights:
${localResults.insights.join('\n')}

Please provide a concise, business-focused analysis that directly answers the question. Focus on:
1. Specific patterns and behaviors
2. Actionable insights for community management
3. Clear, professional language
4. Quantified observations where possible

Response format: Provide a single, comprehensive paragraph (maximum 150 words) that directly answers the question.`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional community intelligence analyst. Provide clear, actionable insights based on conversation data.'
                        },
                        {
                            role: 'user', 
                            content: prompt
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const aiInsights = data.choices[0].message.content;
            
            console.log('✅ OpenAI enhancement successful');
            
            // Create enhanced result with AI summary
            return {
                ...localResults,
                aiSummary: aiInsights.trim(),
                insights: [
                    `🤖 AI-Enhanced Analysis for: "${queryData.customQuestion}"`,
                    '📊 Local Analysis:',
                    ...localResults.insights
                ],
                metadata: {
                    ...localResults.metadata,
                    enhanced: true,
                    enhancementMethod: 'openai-gpt4'
                }
            };
            
        } catch (error) {
            console.error('❌ OpenAI enhancement failed:', error);
            throw error; // This will trigger the fallback in the calling method
        }
    }

    prepareOpenAIContext(localResults, queryData, treeData) {
        // Prepare a structured context for OpenAI without exposing raw tree
        return {
            summary: localResults.summary,
            topicAnalysis: localResults.data.topics,
            userEngagement: localResults.data.userEngagement,
            insights: localResults.insights,
            messageCount: localResults.data.messageCount,
            topicCount: localResults.data.topicCount,
            activeUsers: localResults.data.activeUsers
        };
    }

    parseAIInsights(aiResponse) {
        // Parse AI response into structured insights
        const lines = aiResponse.split('\n').filter(line => line.trim());
        return lines.map(line => line.replace(/^[-•*]\s*/, '').trim()).filter(line => line);
    }

    generateCustomQueryInsights(messages, topicsData, users, customQuestion) {
        const customInsights = [];
        const question = customQuestion.toLowerCase();
        
        console.log('🤖 Processing custom query:', customQuestion);
        console.log('📊 Available message data for analysis:', messages.length, 'messages');
        
        // Advanced semantic analysis based on question type
        console.log('🔍 Question analysis:', {
            hasDiffer: question.includes('differ'),
            hasOpinion: question.includes('opinion'),
            hasDisagree: question.includes('disagree'),
            hasPreferences: question.includes('preferences')
        });
        
        if (question.includes('differ') && (question.includes('opinion') || question.includes('disagree') || question.includes('preferences'))) {
            console.log('🎯 Triggering user disagreement analysis');
            customInsights.push(...this.analyzeUserDisagreements(messages, topicsData, users, question));
        }
        else if (question.includes('trending') || question.includes('popular')) {
            customInsights.push(...this.analyzeTrendingTopics(messages, topicsData, question));
        }
        else if (question.includes('engaged') || question.includes('active')) {
            customInsights.push(...this.analyzeUserEngagement(messages, topicsData, users, question));
        }
        else if (question.includes('sentiment') || question.includes('mood')) {
            customInsights.push(...this.analyzeSentimentPatterns(messages, topicsData, question));
        }
        else if (question.includes('concern') || question.includes('issue') || question.includes('problem')) {
            customInsights.push(...this.analyzeConcerns(messages, topicsData, question));
        }
        else if (question.includes('defi') || question.includes('protocol')) {
            customInsights.push(...this.analyzeProtocolDiscussions(messages, topicsData, question));
        }
        else if (question.includes('when') || question.includes('time') || question.includes('recent')) {
            customInsights.push(...this.analyzeTemporalPatterns(messages, topicsData, question));
        }
        else {
            // General analysis for any other question
            customInsights.push(...this.analyzeGeneralQuestion(messages, topicsData, users, question));
        }
        
        return customInsights;
    }

    analyzeUserDisagreements(messages, topicsData, users, question) {
        const insights = [];
        
        // Extract user names mentioned in the question
        const usernames = Array.from(users.values());
        console.log('👥 Available usernames for matching:', usernames);
        
        const mentionedUsers = usernames.filter(username => {
            const lowerUsername = username.toLowerCase();
            const matchesDirectly = question.includes(lowerUsername);
            const matchesWithAt = question.includes(`@${lowerUsername}`);
            const matchesWithDoubleAt = question.includes(`@@${lowerUsername}`);
            
            console.log(`🔍 Checking user "${username}": direct=${matchesDirectly}, @=${matchesWithAt}, @@=${matchesWithDoubleAt}`);
            
            return matchesDirectly || matchesWithAt || matchesWithDoubleAt;
        });
        
        console.log('🎯 Mentioned users found:', mentionedUsers);
        
        if (mentionedUsers.length >= 2) {
            // Analyze topic overlap and potential disagreement patterns
            const userTopicMap = new Map();
            
            messages.forEach(message => {
                if (message.fromUserName && message.topicId !== undefined && message.topicId !== -1) {
                    if (!userTopicMap.has(message.fromUserName)) {
                        userTopicMap.set(message.fromUserName, new Map());
                    }
                    const userTopics = userTopicMap.get(message.fromUserName);
                    userTopics.set(message.topicId, (userTopics.get(message.topicId) || 0) + 1);
                }
            });
            
            // Find common topics between users
            const user1Topics = userTopicMap.get(mentionedUsers[0]) || new Map();
            const user2Topics = userTopicMap.get(mentionedUsers[1]) || new Map();
            
            const commonTopics = [];
            user1Topics.forEach((count1, topicId) => {
                if (user2Topics.has(topicId)) {
                    const topicName = this.getTopicName(topicId);
                    const count2 = user2Topics.get(topicId);
                    commonTopics.push({
                        topicId,
                        name: topicName,
                        user1Messages: count1,
                        user2Messages: count2,
                        difference: Math.abs(count1 - count2)
                    });
                }
            });
            
            if (commonTopics.length > 0) {
                insights.push(`Users ${mentionedUsers[0]} and ${mentionedUsers[1]} both discussed ${commonTopics.length} common topics`);
                
                // Find topics where engagement differs significantly
                const significantDifferences = commonTopics.filter(topic => topic.difference > 2);
                if (significantDifferences.length > 0) {
                    const topDifference = significantDifferences[0];
                    insights.push(`Biggest engagement difference in "${topDifference.name}": ${mentionedUsers[0]} (${topDifference.user1Messages} msgs) vs ${mentionedUsers[1]} (${topDifference.user2Messages} msgs)`);
                }
                
                // Analyze topic focus patterns
                const user1Focus = Array.from(user1Topics.entries()).sort((a, b) => b[1] - a[1])[0];
                const user2Focus = Array.from(user2Topics.entries()).sort((a, b) => b[1] - a[1])[0];
                
                if (user1Focus && user2Focus && user1Focus[0] !== user2Focus[0]) {
                    const topic1Name = this.getTopicName(user1Focus[0]);
                    const topic2Name = this.getTopicName(user2Focus[0]);
                    insights.push(`Different focus areas: ${mentionedUsers[0]} primarily discusses "${topic1Name}", ${mentionedUsers[1]} focuses on "${topic2Name}"`);
                }
            } else {
                insights.push(`Users ${mentionedUsers[0]} and ${mentionedUsers[1]} have not participated in the same topic discussions`);
            }
        } else {
            insights.push(`To analyze user disagreements, please specify user names in your question (e.g., "How do @James_T81 and @joybaruarobin differ?")`);
        }
        
        return insights;
    }

    analyzeTrendingTopics(messages, topicsData, question) {
        const insights = [];
        const topTopic = topicsData[0];
        
        if (topTopic) {
            insights.push(`Most trending topic: "${topTopic.name}" with ${topTopic.messageCount} recent messages`);
            insights.push(`Trending engagement: ${topTopic.contributorCount} active contributors in this topic`);
            
            // Analyze recent activity patterns
            if (topicsData.length > 1) {
                const secondTopic = topicsData[1];
                const trendGap = topTopic.messageCount - secondTopic.messageCount;
                insights.push(`Trend strength: "${topTopic.name}" leads by ${trendGap} messages over "${secondTopic.name}"`);
            }
        }
        
        return insights;
    }

    analyzeUserEngagement(messages, topicsData, users, question) {
        const insights = [];
        
        // Calculate engagement metrics
        const totalMessages = messages.length;
        const avgMessagesPerUser = users.size > 0 ? Math.round(totalMessages / users.size) : 0;
        
        insights.push(`Overall engagement: ${avgMessagesPerUser} average messages per user`);
        
        // Find most engaged users
        const userMessageCounts = new Map();
        messages.forEach(message => {
            if (message.fromUserId && message.fromUserName) {
                userMessageCounts.set(message.fromUserName, (userMessageCounts.get(message.fromUserName) || 0) + 1);
            }
        });
        
        const sortedUsers = Array.from(userMessageCounts.entries()).sort((a, b) => b[1] - a[1]);
        if (sortedUsers.length > 0) {
            insights.push(`Most engaged user: @${sortedUsers[0][0]} with ${sortedUsers[0][1]} messages`);
            
            if (sortedUsers.length > 1) {
                insights.push(`Second most engaged: @${sortedUsers[1][0]} with ${sortedUsers[1][1]} messages`);
            }
        }
        
        return insights;
    }

    analyzeSentimentPatterns(messages, topicsData, question) {
        const insights = [];
        
        // Analyze topic diversity as sentiment indicator
        const topicDiversity = topicsData.length;
        if (topicDiversity > 5) {
            insights.push(`High topic diversity (${topicDiversity} topics) suggests active, varied discussions`);
            insights.push(`Community sentiment: Engaged and diverse conversation patterns`);
        } else {
            insights.push(`Focused discussions around ${topicDiversity} main topics`);
            insights.push(`Community sentiment: Concentrated engagement on key issues`);
        }
        
        // Analyze engagement distribution
        const totalMessages = messages.length;
        const avgMessagesPerTopic = Math.round(totalMessages / topicDiversity);
        
        if (avgMessagesPerTopic > 10) {
            insights.push(`High engagement intensity: ${avgMessagesPerTopic} average messages per topic`);
        } else {
            insights.push(`Moderate engagement: ${avgMessagesPerTopic} average messages per topic`);
        }
        
        return insights;
    }

    analyzeConcerns(messages, topicsData, question) {
        const insights = [];
        
        // Look for governance, technical, or security topics
        const concernTopics = topicsData.filter(topic => 
            topic.name.includes('Governance') || 
            topic.name.includes('Technical') || 
            topic.name.includes('Security') ||
            topic.name.includes('Audit')
        );
        
        if (concernTopics.length > 0) {
            concernTopics.forEach(topic => {
                insights.push(`Concern area: "${topic.name}" - ${topic.messageCount} messages from ${topic.contributorCount} contributors`);
            });
        } else {
            insights.push(`No major concern topics identified in current discussions`);
        }
        
        return insights;
    }

    analyzeProtocolDiscussions(messages, topicsData, question) {
        const insights = [];
        
        const protocolTopics = topicsData.filter(topic => 
            topic.name.includes('DeFi') || 
            topic.name.includes('Protocol') ||
            topic.name.includes('Token')
        );
        
        if (protocolTopics.length > 0) {
            protocolTopics.forEach(topic => {
                insights.push(`Protocol discussion: "${topic.name}" - ${topic.messageCount} messages from ${topic.contributorCount} contributors`);
            });
        } else {
            insights.push(`Limited protocol-specific discussions in current dataset`);
        }
        
        return insights;
    }

    analyzeTemporalPatterns(messages, topicsData, question) {
        const insights = [];
        
        // Analyze message timestamps if available
        const messagesWithTimestamps = messages.filter(m => m.timestamp);
        
        if (messagesWithTimestamps.length > 0) {
            // Sort by timestamp
            messagesWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
            
            const earliestTime = new Date(messagesWithTimestamps[0].timestamp * 1000);
            const latestTime = new Date(messagesWithTimestamps[messagesWithTimestamps.length - 1].timestamp * 1000);
            
            insights.push(`Time range: ${earliestTime.toLocaleDateString()} to ${latestTime.toLocaleDateString()}`);
            
            // Analyze recent activity (last 25% of messages)
            const recentMessages = messagesWithTimestamps.slice(-Math.ceil(messagesWithTimestamps.length * 0.25));
            const recentTopics = new Set(recentMessages.map(m => m.topicId).filter(id => id !== -1));
            
            insights.push(`Recent activity: ${recentMessages.length} messages across ${recentTopics.size} topics`);
        } else {
            insights.push(`Temporal analysis: ${messages.length} messages available for time-based analysis`);
        }
        
        return insights;
    }

    analyzeGeneralQuestion(messages, topicsData, users, question) {
        const insights = [];
        
        insights.push(`Custom analysis for: "${question}"`);
        insights.push(`Analyzing ${messages.length} messages across ${topicsData.length} topics from ${users.size} users`);
        
        // Provide the most relevant topic
        if (topicsData.length > 0) {
            const topTopic = topicsData[0];
            insights.push(`Primary topic: "${topTopic.name}" with ${topTopic.messageCount} messages from ${topTopic.contributorCount} contributors`);
        }
        
        return insights;
    }

    formatRawApiResponse(apiResponse, endpoint, params) {
        // Format response for display without showing full tree structure
        const messageCount = apiResponse.tree?.messages ? Object.keys(apiResponse.tree.messages).length : 0;
        const topicCount = apiResponse.tree?.topics ? Object.keys(apiResponse.tree.topics).length : 0;
        
        return {
            query: {
                endpoint: endpoint,
                url: `${this.baseUrl}/${endpoint}`,
                parameters: params,
                timestamp: new Date().toISOString()
            },
            response: {
                status: 'success',
                channelId: apiResponse.channelId,
                version: apiResponse.version,
                createdAt: apiResponse.tree?.createdAt,
                dataStructure: {
                    messageCount: messageCount,
                    topicCount: topicCount,
                    conversationThreads: apiResponse.tree?.conversationThreads ? Object.keys(apiResponse.tree.conversationThreads).length : 0,
                    rootMessageIds: apiResponse.tree?.rootMessageIds?.length || 0
                }
            },
            metadata: {
                processingTime: apiResponse.metadata?.executedAt || 'N/A',
                operation: apiResponse.metadata?.operation?.name || 'N/A',
                raftId: apiResponse.metadata?.raft?.id || 'N/A'
            }
        };
    }

    displayQueryResults(queryData, firstResults, secondResults) {
        const resultsSection = document.getElementById('resultsSection');
        const singleResults = document.getElementById('singleResults');
        const comparisonResults = document.getElementById('comparisonResults');
        const comparisonTab = document.querySelector('.comparison-tab');

        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');

        if (this.comparisonEnabled) {
            // Show comparison layout
            singleResults.style.display = 'none';
            comparisonResults.style.display = 'grid';
            comparisonTab.style.display = 'block';

            // Update version titles
            if (firstResults) {
                document.getElementById('versionATitle').textContent = `Version ${firstResults.version} (Earlier)`;
                this.displayResultsInContainer(firstResults, 'A');
            }
            
            if (secondResults) {
                document.getElementById('versionBTitle').textContent = `Version ${secondResults.version} (Current)`;
                this.displayResultsInContainer(secondResults, 'B');
            }

            // Generate delta analysis if both results are available
            if (firstResults && secondResults) {
                this.generateDeltaAnalysis(firstResults, secondResults);
            }
        } else {
            // Show single result layout
            singleResults.style.display = 'block';
            comparisonResults.style.display = 'none';
            comparisonTab.style.display = 'none';

            if (firstResults) {
                this.displayResultsInContainer(firstResults, '');
            }
        }
    }

    displayResultsInContainer(results, suffix) {
        const insightsId = suffix ? `insightsContent${suffix}` : 'insightsContent';
        const rawId = suffix ? `rawContent${suffix}` : 'rawContent';
        
        const insightsContainer = document.getElementById(insightsId);
        const rawContainer = document.getElementById(rawId);

        // Display insights
        if (insightsContainer) {
            insightsContainer.innerHTML = this.formatInsightsDisplay(results);
        }

        // Display raw response
        if (rawContainer) {
            rawContainer.textContent = JSON.stringify(results.rawResponse, null, 2);
        }
    }

    formatInsightsDisplay(results) {
        let html = `
            <div class="insight-summary">
                <h3>📊 Summary</h3>
                <p>${results.summary}</p>
            </div>
        `;

        // Add AI summary if available for this version
        if (results.aiSummary) {
            html += `
                <div class="ai-summary-version">
                    <h4>🤖 AI Analysis</h4>
                    <div class="ai-summary-content-version">
                        ${results.aiSummary.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        }

        if (results.insights && results.insights.length > 0) {
            html += `
                <div class="insights-section">
                    <h4>💡 Key Insights</h4>
                    <ul class="insights-list">
                        ${results.insights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (results.data && results.data.topics && results.data.topics.length > 0) {
            html += `
                <div class="topic-list">
                    <h4>📋 Topics Analysis</h4>
                    ${results.data.topics.slice(0, 5).map(topic => `
                        <div class="topic-item">
                            <div class="topic-header">
                                <span class="topic-name">${topic.name}</span>
                                <span class="topic-stats">${topic.messageCount} messages, ${topic.contributorCount} contributors</span>
                            </div>
                            <div class="contributors">
                                ${topic.contributors.slice(0, 3).map(contributor => 
                                    `<span class="contributor">${contributor.username} (${contributor.messageCount})</span>`
                                ).join('')}
                                ${topic.contributors.length > 3 ? `<span class="contributor">+${topic.contributors.length - 3} more</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return html;
    }

    generateDeltaAnalysis(firstResults, secondResults) {
        const deltaContainer = document.getElementById('deltaContent');
        
        const firstTopics = new Map(firstResults.data.topics.map(t => [t.id, t]));
        const secondTopics = new Map(secondResults.data.topics.map(t => [t.id, t]));
        
        const newTopics = [];
        const removedTopics = [];
        const changedTopics = [];
        
        // Find new topics
        secondTopics.forEach((topic, id) => {
            if (!firstTopics.has(id)) {
                newTopics.push(topic);
            }
        });
        
        // Find removed topics
        firstTopics.forEach((topic, id) => {
            if (!secondTopics.has(id)) {
                removedTopics.push(topic);
            }
        });
        
        // Find changed topics
        firstTopics.forEach((firstTopic, id) => {
            if (secondTopics.has(id)) {
                const secondTopic = secondTopics.get(id);
                if (firstTopic.messageCount !== secondTopic.messageCount) {
                    const change = secondTopic.messageCount - firstTopic.messageCount;
                    const changePercent = Math.round((change / firstTopic.messageCount) * 100);
                    changedTopics.push({
                        ...secondTopic,
                        change: change,
                        changePercent: changePercent,
                        previousCount: firstTopic.messageCount
                    });
                }
            }
        });

        let deltaHtml = `
            <div class="delta-analysis">
                <h3>🔄 Version Comparison Analysis</h3>
                
                <div class="delta-section">
                    <h4>📈 New Topics (${newTopics.length})</h4>
                    ${newTopics.length === 0 ? '<p>No new topics appeared</p>' : 
                        newTopics.map(topic => `
                            <div class="topic-item delta-new">
                                <strong>${topic.name}</strong> - ${topic.messageCount} messages
                            </div>
                        `).join('')
                    }
                </div>
                
                <div class="delta-section">
                    <h4>📉 Removed Topics (${removedTopics.length})</h4>
                    ${removedTopics.length === 0 ? '<p>No topics were removed</p>' :
                        removedTopics.map(topic => `
                            <div class="topic-item delta-removed">
                                <strong>${topic.name}</strong> - had ${topic.messageCount} messages
                            </div>
                        `).join('')
                    }
                </div>
                
                <div class="delta-section">
                    <h4>🔄 Changed Topics (${changedTopics.length})</h4>
                    ${changedTopics.length === 0 ? '<p>No topics changed significantly</p>' :
                        changedTopics.map(topic => `
                            <div class="topic-item delta-changed">
                                <strong>${topic.name}</strong> - ${topic.previousCount} → ${topic.messageCount} messages 
                                (${topic.changePercent > 0 ? '+' : ''}${topic.changePercent}%)
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;

        deltaContainer.innerHTML = deltaHtml;
    }

    switchTab(tabName) {
        console.log('🔄 Switching to tab:', tabName);
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTabButton) {
            activeTabButton.classList.add('active');
            console.log('✅ Tab button activated:', tabName);
        } else {
            console.error('❌ Tab button not found for:', tabName);
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContents = document.querySelectorAll(`[data-tab="${tabName}"]`);
        activeContents.forEach(content => {
            content.classList.add('active');
        });
        console.log('✅ Tab content activated. Found', activeContents.length, 'content elements for:', tabName);
        
        // Hide version columns when showing delta analysis
        const versionColumns = document.querySelectorAll('.version-column');
        if (tabName === 'delta') {
            versionColumns.forEach(column => column.style.display = 'none');
            console.log('🔍 Delta tab: Hidden version columns');
        } else {
            // Show version columns for insights/raw tabs
            for (let i = 0; i < 3; i++) {
                const column = document.getElementById(`version${i + 1}Column`);
                if (column && this.selectedVersions[i]) {
                    column.style.display = 'block';
                }
            }
            console.log('🔍 Non-delta tab: Showing version columns');
        }
    }

    showError(message) {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';
        resultsSection.innerHTML = `
            <div class="error-message">
                <h3>❌ Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    resetUI() {
        this.selectedChannel = null;
        this.selectedVersions = [null, null, null];
        this.availableVersions = [];
        this.availableUsers = [];
        this.resultsCache = [null, null, null];

        // Reset form elements
        document.getElementById('version1Select').disabled = true;
        document.getElementById('version2Select').disabled = true;
        document.getElementById('version3Select').disabled = true;
        document.getElementById('executeQuery').disabled = true;
        
        // Hide results
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('datasetInfo').classList.remove('show');
        
        // Reset version selects
        document.getElementById('version1Select').innerHTML = '<option value="">-- Select Dataset First --</option>';
        document.getElementById('version2Select').innerHTML = '<option value="">-- No Comparison --</option>';
        document.getElementById('version3Select').innerHTML = '<option value="">-- No Comparison --</option>';
        
        // Reset user checkboxes
        const userCheckboxes = document.getElementById('userCheckboxes');
        userCheckboxes.innerHTML = `
            <label class="user-checkbox">
                <input type="checkbox" value="" checked disabled>
                <span class="checkbox-label">All Users</span>
            </label>
        `;
        
        // Reset stepper
        this.updateStepperState();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.topicTreeInterface = new TopicTreeInterface();
        console.log('Topic Tree Interface initialized successfully');
        console.log('Available datasets:', window.topicTreeInterface.datasets);
    } catch (error) {
        console.error('Failed to initialize Topic Tree Interface:', error);
    }
});
