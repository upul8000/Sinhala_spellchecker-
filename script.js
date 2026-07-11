// ... (class definition remains unchanged) ...

const spellChecker = new SinhalaSpellChecker();

// ============================================================
// BUILT-IN DICTIONARY (fallback)
// ============================================================
const BUILT_IN_WORDS = [
    'අධ්‍යාපනය', 'අත්‍යවශ්‍යයි', /* ... all your words ... */
];

// ============================================================
// LOAD FROM SAME FOLDER
// ============================================================
async function loadDictionaryFromSameFolder(filename = 'dictionary.txt') {
    // ... (as above) ...
}

// Start the app – load from dictionary.txt in the same folder
loadDictionaryFromSameFolder('dictionary.txt');

// ============================================================
// The rest of your code (event listeners, checkText, etc.) stays the same
// ============================================================
