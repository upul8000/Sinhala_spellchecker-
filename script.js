        // ============================================================
        // SINHALA SPELL CHECKER – with Add & Remove
        // ============================================================
        
        class SinhalaSpellChecker {
            constructor() {
                this.dictionary = new Set();
                this.addedWords = new Set();
                this.maxSuggestions = 5;
                this.maxEditDistance = 2;
                this.initialized = false;
                this.filename = 'Built-in';
            }

            static sortSinhala(words) {
                return words.sort((a, b) => a.localeCompare(b, 'si'));
            }

            initialize(baseWordList, filename = 'Built-in') {
                if (!Array.isArray(baseWordList) && !(baseWordList instanceof Set)) {
                    throw new Error('Word list must be an Array or Set');
                }
                const normalizedBase = Array.from(baseWordList)
                    .map(w => this.normalize(w))
                    .filter(w => w.length > 0);
                SinhalaSpellChecker.sortSinhala(normalizedBase);
                const saved = this.loadAddedWordsFromStorage()
                    .map(w => this.normalize(w))
                    .filter(w => w.length > 0);
                SinhalaSpellChecker.sortSinhala(saved);
                const combined = [...normalizedBase, ...saved];
                this.dictionary = new Set(combined);
                this.addedWords = new Set(saved);
                this.initialized = true;
                this.filename = filename;
            }

            normalize(word) {
                return word.trim().replace(/\s+/g, ' ').normalize('NFC');
            }

            check(word) {
                if (!this.initialized) return false;
                return this.dictionary.has(this.normalize(word));
            }

            tokenize(text) {
                const regex = /[\u0D80-\u0DFF\u0E00-\u0E7F\u200C\u200D]+/g;
                const matches = text.match(regex);
                if (!matches) return [];
                return matches.map(w => this.normalize(w)).filter(w => w.length > 0);
            }

            checkText(text) {
                if (!this.initialized) return [];
                const words = this.tokenize(text);
                const misspelled = [];
                for (const word of words) {
                    if (word.length < 2) continue;
                    if (!this.dictionary.has(word)) {
                        misspelled.push({
                            word: word,
                            suggestions: this.getSuggestions(word)
                        });
                    }
                }
                return misspelled;
            }

            getSuggestions(word) {
                if (!this.initialized) return [];
                const normalized = this.normalize(word);
                const candidates = this.generateCandidates(normalized);
                const results = [];
                for (const cand of candidates) {
                    const distance = this.levenshteinDistance(normalized, cand);
                    if (distance <= this.maxEditDistance) {
                        results.push({
                            word: cand,
                            distance: distance,
                            score: 1 - (distance / Math.max(normalized.length, cand.length))
                        });
                    }
                }
                results.sort((a, b) => b.score - a.score);
                return results.slice(0, this.maxSuggestions);
            }

            generateCandidates(word) {
                const candidates = [];
                const wordLen = word.length;
                for (const dictWord of this.dictionary) {
                    const lenDiff = Math.abs(dictWord.length - wordLen);
                    if (lenDiff <= 2) candidates.push(dictWord);
                }
                if (candidates.length < 10) {
                    for (const dictWord of this.dictionary) {
                        const lenDiff = Math.abs(dictWord.length - wordLen);
                        if (lenDiff <= 4 && !candidates.includes(dictWord)) {
                            candidates.push(dictWord);
                        }
                    }
                }
                return candidates;
            }

            levenshteinDistance(s1, s2) {
                const m = s1.length, n = s2.length;
                if (m === 0) return n;
                if (n === 0) return m;
                const dp = Array.from({ length: m + 1 }, (_, i) => i);
                for (let j = 1; j <= n; j++) {
                    let prev = dp[0];
                    dp[0] = j;
                    for (let i = 1; i <= m; i++) {
                        const temp = dp[i];
                        const cost = s1[i-1] === s2[j-1] ? 0 : 1;
                        dp[i] = Math.min(prev + cost, dp[i-1] + 1, dp[i] + 1);
                        prev = temp;
                    }
                }
                return dp[m];
            }

            addWord(word) {
                if (!this.initialized) return false;
                const normalized = this.normalize(word);
                if (!normalized || normalized.length < 2) return false;
                if (this.dictionary.has(normalized)) return false;
                this.dictionary.add(normalized);
                this.addedWords.add(normalized);
                const sortedArray = [...this.dictionary].sort((a, b) => a.localeCompare(b, 'si'));
                this.dictionary = new Set(sortedArray);
                this.saveAddedWordsToStorage();
                return true;
            }

            removeWord(word) {
                if (!this.initialized) return false;
                const normalized = this.normalize(word);
                if (!this.addedWords.has(normalized)) return false;
                this.addedWords.delete(normalized);
                this.dictionary.delete(normalized);
                // Re-sort the dictionary (optional, but keeps it tidy)
                const sortedArray = [...this.dictionary].sort((a, b) => a.localeCompare(b, 'si'));
                this.dictionary = new Set(sortedArray);
                this.saveAddedWordsToStorage();
                return true;
            }

            addWords(words) {
                let added = 0;
                const list = Array.isArray(words) ? words : [words];
                for (const w of list) {
                    if (this.addWord(w)) added++;
                }
                return added;
            }

            saveAddedWordsToStorage() {
                try {
                    localStorage.setItem('sinhala_added_words', JSON.stringify([...this.addedWords]));
                } catch (e) { /* ignore */ }
            }

            loadAddedWordsFromStorage() {
                try {
                    const data = localStorage.getItem('sinhala_added_words');
                    if (data) {
                        const parsed = JSON.parse(data);
                        return parsed.map(w => this.normalize(w));
                    }
                } catch (e) { /* ignore */ }
                return [];
            }

            isAddedWord(word) {
                return this.addedWords.has(this.normalize(word));
            }

            getAllWordsSorted() {
                return [...this.dictionary].sort((a, b) => a.localeCompare(b, 'si'));
            }

            getStats() {
                return {
                    totalWords: this.dictionary.size,
                    addedWords: this.addedWords.size,
                    initialized: this.initialized,
                    filename: this.filename
                };
            }
        }

        // ============================================================
        // APPLICATION
        // ============================================================

        const spellChecker = new SinhalaSpellChecker();

        // DOM refs
        const inputEl = document.getElementById('sinhalaInput');
        const previewEl = document.getElementById('preview');
        const resultsEl = document.getElementById('results');
        const statusText = document.getElementById('statusText');
        const wordCountEl = document.getElementById('wordCount');
        const addedCountEl = document.getElementById('addedCount');
        const wordCountBadge = document.getElementById('wordCountBadge');
        const fileInput = document.getElementById('fileInput');
        const fileStatus = document.getElementById('fileStatus');
        const copyFeedback = document.getElementById('copyFeedback');

        // Context menu elements
        const contextMenu = document.getElementById('contextMenu');

        // ============================================================
        // BUILT-IN DICTIONARY (SORTED)
        // ============================================================
        const BUILT_IN_WORDS = [
            'අධ්‍යාපනය', 'අත්‍යවශ්‍යයි', 'අලුත්', 'ආර්ථිකය', 'ආහාර',
            'ඉගෙනීම', 'උපායමාර්ග', 'එක්ක', 'එය', 'ඒ', 'ඒක',
            'කර්මාන්ත', 'කාර්යාලය', 'කුඩා', 'කළමනාකරණ', 'ගම',
            'ගැන', 'ජනගහනය', 'ජලය', 'තාක්ෂණය', 'දත්ත',
            'දුෂ්කර', 'දිස්ත්‍රික්කය', 'නගරය', 'නවෝත්පාදන', 'නරක',
            'නිවස', 'නිෂ්පාදන', 'නිසා', 'නිවැරදි', 'පරිගණක',
            'පරිසරය', 'පර්යේෂණ', 'පරණ', 'පහසු', 'පාරිභෝගික',
            'පාසල', 'පිළිබඳ', 'පුස්තකාල', 'පළාත', 'ප්‍රදේශය',
            'බැංකුව', 'භාෂාව', 'මම', 'මන්දගාමී', 'මහාද්වීපය',
            'මෙය', 'මේ', 'ය', 'රට', 'රැකගැනීම', 'රෝහල',
            'ලස්සන', 'වන', 'විශාල', 'විශ්වවිද්‍යාල', 'විද්‍යාව',
            'වේගවත්', 'වෙළඳපොළ', 'වෙළඳසැල', 'ව්‍යාපාර', 'වැඩසටහන',
            'වැදගත්', 'වැරදි', 'ශක්තිය', 'සමඟ', 'සමාගම', 'සමාජය',
            'සංවර්ධන', 'සහ', 'සාගරය', 'සිංහල', 'සේවාව', 'සෞඛ්‍යය',
            'හොඳ', 'හා', 'ඔබ', 'ඔහු', 'ඇය', 'අපි', 'ඔවුන්'
        ];

        // Initialize
        spellChecker.initialize(BUILT_IN_WORDS, 'Built-in');
        updateUI();
        statusText.textContent = '✅ Ready! Dictionary is sorted.';
        wordCountBadge.textContent = `${spellChecker.getStats().totalWords} words`;

        // ============================================================
        // PREVIEW UPDATE – wraps every word in a span
        // ============================================================
        function updatePreview() {
            const text = inputEl.value;
            if (!text.trim()) {
                previewEl.innerHTML = '<span style="color:#999;">(Preview will appear here)</span>';
                return;
            }
            const errors = spellChecker.checkText(text);
            const misspelledSet = new Set(errors.map(e => e.word));
            // Regex to match Sinhala words (including ZWJ/ZWNJ) and non-word characters
            const regex = /([\u0D80-\u0DFF\u0E00-\u0E7F\u200C\u200D]+)|([^\u0D80-\u0DFF\u0E00-\u0E7F\u200C\u200D]+)/g;
            let html = '';
            let match;
            while ((match = regex.exec(text)) !== null) {
                const word = match[1];
                if (word) {
                    const isMisspelled = misspelledSet.has(word);
                    const cls = isMisspelled ? 'word misspelled' : 'word';
                    html += `<span class="${cls}">${word}</span>`;
                } else {
                    // Non-word characters (spaces, punctuation, etc.)
                    html += match[0];
                }
            }
            previewEl.innerHTML = html;
        }

        // ============================================================
        // CHECK TEXT – updates preview, results, and stats
        // ============================================================
        function checkText() {
            const text = inputEl.value;
            if (!text.trim()) {
                resultsEl.innerHTML = '<p style="color:#666;">Please enter some text to check.</p>';
                updatePreview();
                return;
            }
            
            if (!spellChecker.initialized) {
                resultsEl.innerHTML = '<p style="color:#e65100;">⏳ Dictionary is loading...</p>';
                return;
            }
            
            updatePreview();
            
            const results = spellChecker.checkText(text);
            if (results.length === 0) {
                resultsEl.innerHTML = `
                    <div class="success">
                        ✅ සියලුම වචන නිවැරදියි!<br>
                        <span style="font-size:14px;color:#666;">All words appear to be spelled correctly!</span>
                    </div>
                `;
                return;
            }
            
            let html = '<h3>🔍 වැරදි අක්ෂර වින්‍යාසය සහිත වචන:</h3>';
            html += '<p style="color:#666;font-size:14px;">Click a suggestion to replace, or use Add/Remove.</p>';
            
            for (const result of results) {
                const isAdded = spellChecker.isAddedWord(result.word);
                html += `<div class="error-item">
                    <span class="word-text">❌ "${result.word}"</span>
                    <div class="suggestion-area">
                        <span class="label">යෝජනා:</span>
                        ${result.suggestions.length > 0 ?
                            result.suggestions.map(s =>
                                `<span class="suggestion" onclick="replaceWord('${escapeString(result.word)}', '${escapeString(s.word)}')">${s.word}</span>`
                            ).join(' ') :
                            '<span style="color:#999;">කිසිදු යෝජනාවක් නැත</span>'
                        }
                        <button class="action-btn ${isAdded ? 'remove-btn' : 'add-btn'}" 
                                onclick="${isAdded ? `removeWord('${escapeString(result.word)}')` : `addWord('${escapeString(result.word)}')`}">
                            ${isAdded ? '🗑️ Remove' : '➕ Add'}
                        </button>
                    </div>
                </div>`;
            }
            resultsEl.innerHTML = html;
        }

        function escapeString(str) {
            return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        }

        // ============================================================
        // REPLACE WORD – updates textarea, preview, and results
        // ============================================================
        function replaceWord(oldWord, newWord) {
            const text = inputEl.value;
            const newText = text.split(oldWord).join(newWord);
            inputEl.value = newText;
            checkText();
        }

        // ============================================================
        // ADD & REMOVE WORD
        // ============================================================
        function addWord(word) {
            if (spellChecker.addWord(word)) {
                showToast(`✅ "${word}" added to dictionary! (List is re-sorted)`, 'success');
                updateUI();
                checkText();
            } else {
                if (spellChecker.check(word)) {
                    showToast(`"${word}" is already in the dictionary.`, 'info');
                } else {
                    showToast(`❌ Could not add "${word}".`, 'error');
                }
            }
        }

        function removeWord(word) {
            if (spellChecker.removeWord(word)) {
                showToast(`🗑️ "${word}" removed from dictionary.`, 'success');
                updateUI();
                checkText();
            } else {
                showToast(`"${word}" is not a custom word.`, 'error');
            }
        }

        // ============================================================
        // CLEAR
        // ============================================================
        function clearAll() {
            inputEl.value = '';
            previewEl.innerHTML = '<span style="color:#999;">(Preview will appear here)</span>';
            resultsEl.innerHTML = '<p style="color:#666;margin:0;">Spelling results will appear here after checking.</p>';
        }

        // ============================================================
        // COPY TEXT – copies plain text from textarea
        // ============================================================
        function copyText() {
            const text = inputEl.value;
            if (!text.trim()) {
                showToast('Nothing to copy.', 'error');
                return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    showCopyFeedback(true);
                    showToast('✅ Text copied to clipboard!', 'success');
                }).catch(() => {
                    fallbackCopy(text);
                });
            } else {
                fallbackCopy(text);
            }
        }

        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                showCopyFeedback(true);
                showToast('✅ Text copied to clipboard!', 'success');
            } catch (e) {
                showToast('❌ Copy failed. Please copy manually.', 'error');
            }
            document.body.removeChild(ta);
        }

        function showCopyFeedback(show) {
            copyFeedback.classList.toggle('show', show);
            if (show) {
                setTimeout(() => copyFeedback.classList.remove('show'), 3000);
            }
        }

        // ============================================================
        // CONTEXT MENU LOGIC
        // ============================================================
        let currentContextWord = null;
        let currentContextSpan = null;

        function showContextMenu(e, word, span) {
            e.preventDefault();
            currentContextWord = word;
            currentContextSpan = span;

            const suggestions = spellChecker.getSuggestions(word);
            const isAdded = spellChecker.isAddedWord(word);
            const isMisspelled = span.classList.contains('misspelled');

            let html = '';

            // If misspelled, show suggestions
            if (isMisspelled) {
                if (suggestions.length > 0) {
                    suggestions.forEach(s => {
                        html += `<button class="menu-item" data-action="suggest" data-word="${escapeString(s.word)}">
                            <span class="suggestion-text">${s.word}</span>
                        </button>`;
                    });
                } else {
                    html += `<div class="menu-item" style="color:#999; cursor:default;">(කිසිදු යෝජනාවක් නැත)</div>`;
                }
                html += `<div class="menu-divider"></div>`;
            }

            // Add / Remove option
            if (isAdded) {
                html += `<button class="menu-item remove-word" data-action="remove" data-word="${escapeString(word)}">
                    🗑️ Remove from Dictionary
                </button>`;
            } else {
                // Only show "Add" if the word is not already in the dictionary (i.e., misspelled)
                // If it's correctly spelled but not added, we don't show Add (it's already in built-in)
                if (isMisspelled) {
                    html += `<button class="menu-item add-word" data-action="add" data-word="${escapeString(word)}">
                        ➕ Add to Dictionary
                    </button>`;
                } else {
                    // Correctly spelled, not added – no action
                    html += `<div class="menu-item" style="color:#999; cursor:default;">(Already in dictionary)</div>`;
                }
            }

            if (!html) {
                hideContextMenu();
                return;
            }

            contextMenu.innerHTML = html;
            contextMenu.style.display = 'block';
            // Position menu within viewport
            let left = e.clientX;
            let top = e.clientY;
            const menuWidth = 200;
            const menuHeight = 300;
            if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 10;
            if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 10;
            contextMenu.style.left = left + 'px';
            contextMenu.style.top = top + 'px';

            // Attach click handlers
            contextMenu.querySelectorAll('.menu-item[data-action]').forEach(item => {
                item.addEventListener('click', function(ev) {
                    const action = this.dataset.action;
                    const word = this.dataset.word;
                    if (action === 'suggest') {
                        replaceWord(currentContextWord, word);
                        hideContextMenu();
                    } else if (action === 'add') {
                        addWord(currentContextWord);
                        hideContextMenu();
                    } else if (action === 'remove') {
                        removeWord(currentContextWord);
                        hideContextMenu();
                    }
                });
            });
        }

        function hideContextMenu() {
            contextMenu.style.display = 'none';
            currentContextWord = null;
            currentContextSpan = null;
        }

        // ============================================================
        // EVENT LISTENERS FOR CONTEXT MENU
        // ============================================================
        previewEl.addEventListener('contextmenu', function(e) {
            let target = e.target;
            let span = null;
            while (target && target !== previewEl) {
                if (target.classList && target.classList.contains('word')) {
                    span = target;
                    break;
                }
                target = target.parentNode;
            }
            if (span) {
                const word = span.textContent.trim();
                if (word) {
                    showContextMenu(e, word, span);
                    return;
                }
            }
            // Not on a word – prevent default browser menu
            e.preventDefault();
            hideContextMenu();
        });

        // Hide menu when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (contextMenu.style.display === 'block' && !contextMenu.contains(e.target)) {
                hideContextMenu();
            }
        });

        window.addEventListener('scroll', hideContextMenu);
        window.addEventListener('resize', hideContextMenu);

        // ============================================================
        // TEST & UTILITY
        // ============================================================
        function insertTestText() {
            const testText = `සිංහල භාෂාව ලස්සන භාෂාවකි.
        විද්‍යාව ඉගෙනීම වැදගත් වේ.
        සෞඛ්‍යය රැකගැනීම අත්‍යවශ්‍යයි.
        පරිගණක වැඩසටහන් සෑදීම අපගේ කාර්යයයි.
        නවෝත්පාදන සහ තාක්ෂණය එකට එකතු වේ.
        
        මෙම වචනය වැරදි ලෙස ලියා ඇත: පරිගනක (should be පරිගණක)`;
            inputEl.value = testText;
            checkText();
        }

        function addCommonWords() {
            const more = ['අතිරේක', 'වචන', 'එකතු', 'කිරීම', 'සඳහා', 'මෙම', 'කාර්යය', 'සිදු', 'කරන්න'];
            const added = spellChecker.addWords(more);
            updateUI();
            showToast(`✅ Added ${added} common words. Dictionary re-sorted.`, 'success');
            checkText();
        }

        function exportDictionary() {
            const words = spellChecker.getAllWordsSorted();
            if (words.length === 0) {
                showToast('❌ Dictionary is empty.', 'error');
                return;
            }
            let content = '# Sinhala Word List (Sorted Export)\n';
            content += `# Total words: ${words.length}\n`;
            content += '# One word per line, UTF-8\n\n';
            content += words.join('\n');
            
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sinhala-dictionary-sorted.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`💾 Exported ${words.length} sorted words.`, 'success');
        }

        function showDictionaryStats() {
            const stats = spellChecker.getStats();
            showToast(
                `📊 Dictionary: ${stats.totalWords} total\n` +
                `   Added: ${stats.addedWords} custom\n` +
                `   Source: ${stats.filename}\n` +
                `   📌 Always sorted alphabetically.`,
                'info'
            );
        }

        // ============================================================
        // UI UPDATE
        // ============================================================
        function updateUI() {
            const stats = spellChecker.getStats();
            wordCountEl.textContent = stats.totalWords;
            addedCountEl.textContent = stats.addedWords;
            wordCountBadge.textContent = `${stats.totalWords} words`;
        }

        // ============================================================
        // FILE UPLOAD
        // ============================================================
        fileInput.addEventListener('change', function(e) {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const text = event.target.result;
                const lines = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'));
                if (lines.length === 0) {
                    showToast('❌ No valid words found in the file.', 'error');
                    return;
                }
                const existingAdded = spellChecker.loadAddedWordsFromStorage();
                const combined = [...lines, ...existingAdded];
                spellChecker.initialize(combined, file.name);
                updateUI();
                fileStatus.textContent = `✅ Loaded ${lines.length} words from "${file.name}" (sorted)`;
                fileStatus.style.color = '#2e7d32';
                showToast(`✅ Loaded ${lines.length} words from ${file.name}`, 'success');
                checkText();
            };
            reader.onerror = function() {
                showToast('❌ Error reading file.', 'error');
            };
            reader.readAsText(file, 'UTF-8');
        });

        // ============================================================
        // TOAST
        // ============================================================
        let toastTimeout;

        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast ' + type;
            void toast.offsetWidth;
            toast.classList.add('show');
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 4000);
        }

        // ============================================================
        // AUTO-CHECK WITH DEBOUNCE
        // ============================================================
        let debounceTimer;
        inputEl.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(checkText, 600);
        });

        inputEl.addEventListener('paste', function() {
            setTimeout(checkText, 100);
        });

        // Initial check after load
        setTimeout(checkText, 300);