import re

def repl(text, pattern, replacement):
    return re.sub(pattern, replacement, text)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('static/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

def update_classes(c):
    c = repl(c, r'\bbg-white\b', 'bg-theme-bg')
    c = repl(c, r'\bbg-gray-50\b', 'bg-theme-surface')
    c = repl(c, r'\bbg-gray-100\b', 'bg-theme-hover')
    c = repl(c, r'\bbg-gray-800\b', 'bg-theme-surface text-theme-text')
    
    c = repl(c, r'\btext-gray-800\b', 'text-theme-text')
    c = repl(c, r'\btext-gray-700\b', 'text-theme-text')
    c = repl(c, r'\btext-gray-600\b', 'text-theme-muted')
    c = repl(c, r'\btext-gray-500\b', 'text-theme-muted')
    c = repl(c, r'\btext-gray-400\b', 'text-theme-muted opacity-80')
    
    c = repl(c, r'\bborder-gray-100\b', 'border-theme-border')
    c = repl(c, r'\bborder-gray-200\b', 'border-theme-border')
    c = repl(c, r'\bborder-gray-300\b', 'border-theme-border')
    
    c = repl(c, r'\bbg-blue-600\b', 'bg-theme-accent')
    c = repl(c, r'\bhover:bg-blue-700\b', 'hover:bg-theme-accentHover')
    c = repl(c, r'\btext-blue-600\b', 'text-theme-accent')
    c = repl(c, r'\btext-blue-500\b', 'text-theme-accent')
    c = repl(c, r'\bhover:text-blue-600\b', 'hover:text-theme-accent')
    c = repl(c, r'\bhover:text-blue-700\b', 'hover:text-theme-accentHover')
    c = repl(c, r'\bring-blue-500\b', 'ring-theme-accent')
    
    c = repl(c, r'\bhover:bg-gray-50\b', 'hover:bg-theme-hover')
    c = repl(c, r'\bhover:bg-gray-100\b', 'hover:bg-theme-hover')
    c = repl(c, r'\bhover:bg-gray-200\b', 'hover:bg-theme-hover')
    c = repl(c, r'\bdivide-gray-100\b', 'divide-theme-border')
    return c

html = update_classes(html)
js = update_classes(js)

head_injection = """
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        theme: {
                            bg: 'var(--bg-main)',
                            surface: 'var(--bg-surface)',
                            hover: 'var(--bg-hover)',
                            border: 'var(--border-color)',
                            text: 'var(--text-main)',
                            muted: 'var(--text-muted)',
                            accent: 'var(--color-accent)',
                            accentHover: 'var(--color-accent-hover)',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        :root {
            --bg-main: #ffffff;
            --bg-surface: #f9fafb;
            --bg-hover: #f3f4f6;
            --border-color: #e5e7eb;
            --text-main: #1f2937;
            --text-muted: #6b7280;
            --color-accent: #3b82f6;
            --color-accent-hover: #2563eb;
        }

        [data-theme="dark-soft"] {
            --bg-main: #1e293b;
            --bg-surface: #334155;
            --bg-hover: #475569;
            --border-color: #475569;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }

        [data-theme="dark-hc"] {
            --bg-main: #000000;
            --bg-surface: #111111;
            --bg-hover: #222222;
            --border-color: #333333;
            --text-main: #ffffff;
            --text-muted: #a3a3a3;
        }
        
        body { 
            background-color: var(--bg-main); 
            color: var(--text-main); 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        }
        .jupyter-header { background-color: var(--bg-surface); border-bottom: 1px solid var(--border-color); }
        .modal { background-color: rgba(0,0,0,0.6); }
    </style>
"""

html = re.sub(r'<script src="https://cdn.tailwindcss.com"></script>[\s\S]*?</style>', head_injection, html)

theme_modal = """
    <!-- Settings Modal -->
    <div id="settingsModal" class="modal fixed inset-0 flex items-center justify-center hidden z-[100]">
        <div class="bg-theme-bg text-theme-text border border-theme-border rounded-lg shadow-xl w-96 p-6">
            <h3 class="text-lg font-medium mb-4">Settings & Themes</h3>
            
            <label class="block text-sm font-medium mb-1">Theme</label>
            <select id="themeSelect" onchange="changeTheme()" class="w-full bg-theme-surface border border-theme-border text-theme-text rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-theme-accent">
                <option value="light">Light</option>
                <option value="dark-soft">Dark (Soft)</option>
                <option value="dark-hc">Dark (High Contrast)</option>
            </select>
            
            <label class="block text-sm font-medium mb-1">Accent Color</label>
            <div class="flex space-x-2 mb-6" id="accentPicker">
                <!-- populated by JS -->
            </div>
            
            <div class="flex justify-end space-x-2">
                <button onclick="hideModal('settingsModal')" class="px-4 py-2 hover:bg-theme-hover border border-theme-border text-theme-text rounded">Close</button>
            </div>
        </div>
    </div>
"""

html = html.replace('<!-- Target Path Modal (Move/Copy/Unzip) -->', theme_modal + '\n    <!-- Target Path Modal (Move/Copy/Unzip) -->')

settings_btn = '<button onclick="showModal(\'settingsModal\')" class="px-3 py-1.5 bg-theme-bg border border-theme-border rounded text-sm hover:bg-theme-hover shadow-sm text-theme-text"><i class="fas fa-cog mr-1"></i> Settings</button>'
html = html.replace('<!-- Actions -->\n        <div class="flex items-center space-x-3">', '<!-- Actions -->\n        <div class="flex items-center space-x-3">\n            ' + settings_btn)

theme_js = """
// --- Theming Logic ---
const themes = {
    'light': '',
    'dark-soft': 'dark-soft',
    'dark-hc': 'dark-hc'
};

const accents = [
    { name: 'Blue', hex: '#3b82f6', hover: '#2563eb' },
    { name: 'Purple', hex: '#8b5cf6', hover: '#7c3aed' },
    { name: 'Green', hex: '#10b981', hover: '#059669' },
    { name: 'Red', hex: '#ef4444', hover: '#dc2626' },
    { name: 'Orange', hex: '#f97316', hover: '#ea580c' },
];

function initTheme() {
    const savedTheme = localStorage.getItem('fm_theme') || 'light';
    const savedAccent = localStorage.getItem('fm_accent') || '#3b82f6';
    
    document.getElementById('themeSelect').value = savedTheme;
    applyTheme(savedTheme, savedAccent);
    renderAccentPicker(savedAccent);
}

function applyTheme(theme, accentHex) {
    if (themes[theme]) {
        document.documentElement.setAttribute('data-theme', themes[theme]);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    
    if (accentHex) {
        const accentObj = accents.find(a => a.hex === accentHex) || accents[0];
        document.documentElement.style.setProperty('--color-accent', accentObj.hex);
        document.documentElement.style.setProperty('--color-accent-hover', accentObj.hover);
    }
}

function changeTheme() {
    const theme = document.getElementById('themeSelect').value;
    localStorage.setItem('fm_theme', theme);
    const savedAccent = localStorage.getItem('fm_accent') || '#3b82f6';
    applyTheme(theme, savedAccent);
}

function changeAccent(hex) {
    localStorage.setItem('fm_accent', hex);
    const savedTheme = localStorage.getItem('fm_theme') || 'light';
    applyTheme(savedTheme, hex);
    renderAccentPicker(hex);
}

function renderAccentPicker(currentHex) {
    const container = document.getElementById('accentPicker');
    if (!container) return;
    container.innerHTML = '';
    
    accents.forEach(a => {
        const btn = document.createElement('button');
        btn.className = `w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-accent`;
        btn.style.backgroundColor = a.hex;
        btn.style.borderColor = currentHex === a.hex ? 'var(--text-main)' : 'transparent';
        btn.onclick = () => changeAccent(a.hex);
        btn.title = a.name;
        container.appendChild(btn);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
"""

js = re.sub(r"document\.addEventListener\('DOMContentLoaded', \(\) => \{", theme_js, js)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(js)
