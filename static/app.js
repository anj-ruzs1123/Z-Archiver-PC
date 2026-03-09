let currentPath = "";


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

function adjustColorIntensity(hex, percent) {
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');
    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    let r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}

function adjustColorDarkness(hex, percent) {
    // Negative percent makes it darker, positive makes it lighter
    // Implementation to calculate a darkened variant
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if(hex.length == 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }
    const num = parseInt(hex, 16);
    let r = (num >> 16) + percent;
    if (r > 255) r = 255; else if  (r < 0) r = 0;
    let g = (num >> 8 & 0x00FF) + percent;
    if (g > 255) g = 255; else if  (g < 0) g = 0;
    let b = (num & 0x0000FF) + percent;
    if (b > 255) b = 255; else if  (b < 0) b = 0;
    return "#" + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

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
        let hoverHex = accentHex;
        const matchingPreset = accents.find(a => a.hex.toLowerCase() === accentHex.toLowerCase());
        if (matchingPreset) {
            hoverHex = matchingPreset.hover;
        } else {
            // Generate hover shade for custom color
            hoverHex = adjustColorDarkness(accentHex, -20); 
        }
        
        document.documentElement.style.setProperty('--color-accent', accentHex);
        document.documentElement.style.setProperty('--color-accent-hover', hoverHex);
        
        // Define an explicit CSS property for the darker version used for files
        const isDarkTheme = theme.startsWith('dark');
        // If dark theme, lighter looks "brighter/more intense", so we give the file a muted version
        const fileNameColor = isDarkTheme ? adjustColorDarkness(accentHex, -40) : adjustColorDarkness(accentHex, -40);
        document.documentElement.style.setProperty('--color-accent-file', fileNameColor);
        
        const picker = document.getElementById('customAccentPicker');
        if (picker && !matchingPreset) {
            picker.value = accentHex;
        }
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
    
    let isPreset = false;
    
    accents.forEach(a => {
        const btn = document.createElement('button');
        btn.className = `w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-accent`;
        btn.style.backgroundColor = a.hex;
        btn.style.borderColor = currentHex.toLowerCase() === a.hex.toLowerCase() ? 'var(--text-main)' : 'transparent';
        btn.onclick = () => changeAccent(a.hex);
        btn.title = a.name;
        container.appendChild(btn);
        
        if (currentHex.toLowerCase() === a.hex.toLowerCase()) isPreset = true;
    });
    
    // Highlight the custom picker if a non-preset color is active
    const customPicker = document.getElementById('customAccentPicker');
    if (customPicker) {
        customPicker.parentElement.style.borderColor = !isPreset ? 'var(--text-main)' : 'transparent';
        if (!isPreset) customPicker.value = currentHex;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    loadFiles(currentPath);
    
    // Checkbox master listener
    document.getElementById('select-all').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateActionButtons();
    });
});

async function loadFiles(path) {
    try {
        const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error('Failed to load listing');
        
        const data = await response.json();
        currentPath = data.current_path;
        renderBreadcrumbs(data.current_path);
        renderFiles(data.items, data.parent_path);
        
        document.getElementById('select-all').checked = false;
        updateActionButtons();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderBreadcrumbs(path) {
    const container = document.getElementById('breadcrumbs');
    container.innerHTML = '';
    
    // Simple split for path parts
    const isWindows = path.includes('\\');
    const separator = isWindows ? '\\' : '/';
    const parts = path.split(separator).filter(p => p);
    
    // If windows, the first part is drive (e.g. C:). We can also have an arbitrary root.
    // For simplicity, we just rebuild paths by joining
    let pathSoFar = isWindows && path.startsWith('\\\\') ? '\\\\' : ''; // Handle network shares if any, mostly ignore
    
    for (let i = 0; i < parts.length; i++) {
        pathSoFar += (i > 0 && !(isWindows && i === 1 && pathSoFar.endsWith(separator))) ? separator + parts[i] : parts[i];
        if (isWindows && i === 0 && !pathSoFar.endsWith(separator)) pathSoFar += separator; // C: -> C:\
        
        const span = document.createElement('span');
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'hover:underline cursor-pointer';
        link.textContent = parts[i] || (isWindows ? 'Root' : '/');
        const currentLinkPath = pathSoFar;
        link.onclick = (e) => { e.preventDefault(); loadFiles(currentLinkPath); };
        
        span.appendChild(link);
        container.appendChild(span);
        
        if (i < parts.length - 1) {
            const sepSpan = document.createElement('span');
            sepSpan.className = 'text-theme-muted opacity-80 mx-1';
            sepSpan.innerHTML = '<i class="fas fa-chevron-right text-xs"></i>';
            container.appendChild(sepSpan);
        }
    }
}

// Context Menu State
let contextTarget = null;

// Hide context menu when clicking elsewhere
document.addEventListener('click', () => {
    document.getElementById('contextMenu').classList.add('hidden');
});

// Update the renderFiles function to add context menu handler and remove the action buttons
function renderFiles(items, parentPath) {
    const tbody = document.getElementById('file-list');
    tbody.innerHTML = '';
    document.getElementById('item-count').textContent = items.length;

    if (parentPath) {
        const tr = document.createElement('tr');
        tr.className = 'file-row';
        tr.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('input')) {
                loadFiles(parentPath);
            }
        };
        tr.innerHTML = `
            <td class="px-4 py-2 text-center"></td>
            <td class="px-4 py-2 text-center"><i class="fas fa-arrow-up text-theme-muted opacity-80"></i></td>
            <td class="px-4 py-2 font-medium text-theme-text">..</td>
            <td class="px-4 py-2 text-theme-muted"></td>
            <td class="px-4 py-2 text-theme-muted"></td>
            <td class="px-4 py-2 text-right"></td>
        `;
        tbody.appendChild(tr);
    }

    if (items.length === 0) {
        tbody.innerHTML += `<tr><td colspan="6" class="p-8 text-center text-theme-muted opacity-80">Directory is empty</td></tr>`;
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'file-row border-t border-theme-border';
        
        const isDir = item.is_dir;
        let icon = '<i class="far fa-file text-theme-muted opacity-80 text-lg"></i>';
        if (isDir) {
            icon = '<i class="fas fa-folder text-theme-accent text-lg"></i>';
        } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(item.extension)) {
            icon = '<i class="far fa-image text-green-500 text-lg"></i>';
        } else if (['.txt', '.md', '.log'].includes(item.extension)) {
            icon = '<i class="far fa-file-alt text-theme-muted text-lg"></i>';
        } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(item.extension)) {
            icon = '<i class="far fa-file-archive text-yellow-600 text-lg"></i>';
        } else if (['.mp4', '.avi', '.mkv'].includes(item.extension)) {
            icon = '<i class="far fa-file-video text-purple-500 text-lg"></i>';
        } else if (['.mp3', '.wav', '.flac'].includes(item.extension)) {
            icon = '<i class="far fa-file-audio text-pink-500 text-lg"></i>';
        }

        const date = new Date(item.modified).toLocaleString();
        const sizeStr = isDir ? '-' : formatBytes(item.size);

        // Click on row to open folder or file
        tr.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('input')) {
                if (isDir) {
                    loadFiles(item.path);
                } else {
                    openFile(item.path);
                }
            }
        };

        const escapedPath = item.path.replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
        const escapedName = item.name.replace(/"/g, '&quot;');
        
        // Right Click Context Menu
        tr.oncontextmenu = (e) => {
            e.preventDefault();
            contextTarget = { path: escapedPath, name: escapedName, isZip: item.extension === '.zip' };
            showContextMenu(e.clientX, e.clientY);
        };

        // Actions column is now mostly empty, users will rely on right click
        const actionsHtml = `<div class="text-theme-muted opacity-80 text-xs text-right pr-2">Right-click for options</div>`;

        // Determine specific color for the item name based on if it's a folder or file
        const nameColorStyle = isDir ? 'color: var(--color-accent);' : 'color: var(--color-accent-file);';

        tr.innerHTML = `
            <td class="px-4 py-3 text-center"><input type="checkbox" class="file-checkbox rounded" value="${escapedPath}" onchange="updateActionButtons()"></td>
            <td class="px-4 py-3 text-center">${icon}</td>
            <td class="px-4 py-3 font-medium break-all text-theme-text" style="${nameColorStyle}">${item.name}</td>
            <td class="px-4 py-3 text-theme-muted text-xs">${date}</td>
            <td class="px-4 py-3 text-theme-muted text-xs">${sizeStr}</td>
            <td class="px-4 py-3 text-right">${actionsHtml}</td>
        `;

        tbody.appendChild(tr);
    });
}

function showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');
    
    // Conditionally show Unzip
    const unzipContainer = document.getElementById('contextUnzipContainer');
    if (contextTarget && contextTarget.isZip) {
        unzipContainer.innerHTML = `<button onclick="handleContextAction('unzip')" class="w-full text-left px-4 py-2 hover:bg-theme-hover flex items-center"><i class="fas fa-file-export w-5 text-orange-500"></i> Unzip</button>`;
    } else {
        unzipContainer.innerHTML = '';
    }
}

function handleContextAction(action) {
    if (!contextTarget) return;
    const { path, name } = contextTarget;
    
    switch (action) {
        case 'rename': promptRename(path, name); break;
        case 'move': promptMove(path, name); break;
        case 'copy': promptCopy(path, name); break;
        case 'delete': deleteItem(path); break;
        case 'unzip': promptUnzip(path, name); break;
    }
    contextTarget = null;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updateActionButtons() {
    const selectedCount = document.querySelectorAll('.file-checkbox:checked').length;
    const zipBtn = document.getElementById('zip-btn');
    if (selectedCount > 0) {
        zipBtn.classList.remove('hidden');
    } else {
        zipBtn.classList.add('hidden');
    }
}

// Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');
    
    msgEl.textContent = message;
    
    toast.className = 'fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg transition-opacity duration-300 pointer-events-none z-50 flex items-center text-white opacity-100';
    
    if (type === 'error') {
        toast.classList.add('bg-red-600');
        iconEl.className = 'fas fa-exclamation-circle mr-2';
    } else {
        toast.classList.add('bg-green-600');
        iconEl.className = 'fas fa-check-circle mr-2';
    }
    
    setTimeout(() => {
        toast.classList.replace('opacity-100', 'opacity-0');
    }, 3000);
}

// Modals
function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
    // Clear inputs except where readonly
    const inputs = document.getElementById(id).querySelectorAll('input[type="text"]:not([readonly])');
    inputs.forEach(i => i.value = '');
}

// API Calls
async function apiCall(endpoint, method, body) {
    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'An error occurred');
        
        showToast(data.message || 'Success');
        loadFiles(currentPath); // refresh
        return true;
    } catch (err) {
        showToast(err.message, 'error');
        return false;
    }
}

// Actions
async function createItem(isFolder) {
    const inputId = isFolder ? 'newFolderName' : 'newFileName';
    const name = document.getElementById(inputId).value;
    if (!name) return;
    
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const tgtPath = currentPath + (currentPath.endsWith(separator) ? '' : separator) + name;
    
    if (await apiCall('/api/files/create', 'POST', { path: tgtPath, is_folder: isFolder })) {
        hideModal(isFolder ? 'createFolderModal' : 'createFileModal');
    }
}

function promptRename(path, currentName) {
    document.getElementById('renamePath').value = path;
    document.getElementById('renameNewName').value = currentName;
    showModal('renameModal');
}

async function renameItem() {
    const path = document.getElementById('renamePath').value;
    const newName = document.getElementById('renameNewName').value;
    if (!newName) return;
    
    if (await apiCall('/api/files/rename', 'POST', { path, new_name: newName })) {
        hideModal('renameModal');
    }
}

async function deleteItem(path) {
    if (confirm('Are you sure you want to delete this item?')) {
        await apiCall('/api/files/delete', 'POST', { path });
    }
}

function promptTargetAction(action, sourcePath, itemName) {
    document.getElementById('targetAction').value = action;
    document.getElementById('targetSourcePath').value = sourcePath;
    
    const title = action.charAt(0).toUpperCase() + action.slice(1);
    document.getElementById('targetModalTitle').textContent = `${title} Item`;
    document.getElementById('targetModalDesc').textContent = `Select destination for: ${itemName}`;
    
    // Default destination is current path
    const separator = currentPath.includes('\\') ? '\\' : '/';
    let defaultDest = currentPath;
    if (action !== 'unzip') { 
        defaultDest += (defaultDest.endsWith(separator) ? '' : separator) + itemName;
    }

    document.getElementById('targetDestination').value = defaultDest;
    document.getElementById('targetActionBtn').textContent = title;
    
    showModal('targetPathModal');
}

function promptMove(path, name) { promptTargetAction('move', path, name); }
function promptCopy(path, name) { promptTargetAction('copy', path, name); }
function promptUnzip(path, name) { promptTargetAction('unzip', path, name); }

// --- Destination Folder Browser Logic ---
let browserPath = "";

async function openFolderBrowser() {
    browserPath = currentPath;
    await loadBrowserFolder(browserPath);
    showModal('folderBrowserModal');
}

async function loadBrowserFolder(path) {
    try {
        const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error('Failed to load folder');
        
        const data = await response.json();
        browserPath = data.current_path;
        document.getElementById('browserSelectedPath').textContent = browserPath;
        
        // Render Breadcrumbs
        const container = document.getElementById('browserBreadcrumbs');
        container.innerHTML = '';
        const isWindows = browserPath.includes('\\');
        const separator = isWindows ? '\\' : '/';
        const parts = browserPath.split(separator).filter(p => p);
        
        let pathSoFar = isWindows && browserPath.startsWith('\\\\') ? '\\\\' : '';
        for (let i = 0; i < parts.length; i++) {
            pathSoFar += (i > 0 && !(isWindows && i === 1 && pathSoFar.endsWith(separator))) ? separator + parts[i] : parts[i];
            if (isWindows && i === 0 && !pathSoFar.endsWith(separator)) pathSoFar += separator;
            
            const btn = document.createElement('button');
            btn.className = 'hover:underline text-xs';
            btn.textContent = parts[i] || (isWindows ? 'Root' : '/');
            const targetPath = pathSoFar;
            btn.onclick = () => loadBrowserFolder(targetPath);
            container.appendChild(btn);
            
            if (i < parts.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'mx-1 text-theme-muted opacity-80';
                sep.innerHTML = '<i class="fas fa-chevron-right" style="font-size: 0.6rem;"></i>';
                container.appendChild(sep);
            }
        }
        
        // Render List
        const tbody = document.getElementById('browserItemList');
        tbody.innerHTML = '';
        
        if (data.parent_path) {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-theme-surface cursor-pointer border-b border-theme-border';
            tr.onclick = () => loadBrowserFolder(data.parent_path);
            tr.innerHTML = `
                <td class="px-4 py-2 w-8 text-center"><i class="fas fa-arrow-up text-theme-muted opacity-80"></i></td>
                <td class="px-4 py-2 font-medium text-theme-muted">..</td>
            `;
            tbody.appendChild(tr);
        }
        
        const dirs = data.items.filter(item => item.is_dir);
        if (dirs.length === 0 && !data.parent_path) {
            tbody.innerHTML += `<tr><td colspan="2" class="p-4 text-center text-theme-muted opacity-80">No folders here</td></tr>`;
        }
        
        dirs.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-theme-surface cursor-pointer border-b border-theme-border';
            tr.onclick = () => loadBrowserFolder(item.path);
            tr.innerHTML = `
                <td class="px-4 py-2 w-8 text-center"><i class="fas fa-folder text-theme-accent"></i></td>
                <td class="px-4 py-2 text-theme-text">${item.name}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function confirmFolderSelection() {
    const action = document.getElementById('targetAction').value;
    const sourcePath = document.getElementById('targetSourcePath').value;
    const separator = browserPath.includes('\\') ? '\\' : '/';
    
    let finalDest = browserPath;
    // If not unzipping, we typically want to append the filename to the destination path
    if (action !== 'unzip') {
        const itemName = sourcePath.substring(sourcePath.lastIndexOf(separator) + 1);
        finalDest += (finalDest.endsWith(separator) ? '' : separator) + itemName;
    }
    
    document.getElementById('targetDestination').value = finalDest;
    hideModal('folderBrowserModal');
}
// --- End Browser Logic ---

async function executeTargetAction() {
    const action = document.getElementById('targetAction').value;
    const source = document.getElementById('targetSourcePath').value;
    const destination = document.getElementById('targetDestination').value;
    
    if (!destination) return;
    
    let endpoint = `/api/files/${action}`;
    if (action === 'unzip') endpoint = `/api/archive/unzip`;
    
    if (await apiCall(endpoint, 'POST', { source, destination })) {
        hideModal('targetPathModal');
    }
}

async function zipSelectedItems() {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    const paths = Array.from(checkboxes).map(cb => cb.value);
    if (paths.length === 0) return;
    
    let zipName = document.getElementById('zipName').value;
    if (!zipName) zipName = 'archive.zip';
    if (!zipName.endsWith('.zip')) zipName += '.zip';
    
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const destination = currentPath + (currentPath.endsWith(separator) ? '' : separator) + zipName;
    
    if (await apiCall('/api/archive/zip', 'POST', { paths, destination })) {
        hideModal('zipModal');
    }
}

async function openFile(path) {
    // Shows user "Opening file..." toaster
    showToast(`Opening ${path.split('\\').pop().split('/').pop()}...`, 'success');
    await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });
}
