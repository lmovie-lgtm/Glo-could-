// Global Pilgrim Bank - Cloud Engine JavaScript

const CLOUD_CONFIG = {
    owner: "Olawale Abdul-Ganiyu Adeshina",
    platform: "Pilgrim Cloud Engine",
    maxProjectSize: 1024, // 1GB in MB
    storage: "unlimited",
    defaultDomain: "globalpilgrim.com"
};

let currentProject = null;
let projects = [];

// ============================================
// INITIALIZATION
// ============================================

function initializeCloudEngine() {
    loadProjects();
    updateStats();
    setupDragDrop();
    logToTerminal('Cloud Engine initialized', 'info');
    logToTerminal('Connected to gateway server', 'success');
}

function loadProjects() {
    const savedProjects = localStorage.getItem('cloudProjects');
    if (savedProjects) {
        projects = JSON.parse(savedProjects);
    }
    renderProjects();
}

function saveProjects() {
    localStorage.setItem('cloudProjects', JSON.stringify(projects));
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

function createNewProject() {
    const projectName = document.getElementById('projectName').value.trim();
    const visibility = document.getElementById('visibility').value;
    
    if (!projectName) {
        showToast('Please enter a project name', 'error');
        return;
    }
    
    // Check if project already exists
    if (projects.find(p => p.name === projectName)) {
        showToast('Project with this name already exists', 'error');
        return;
    }
    
    const newProject = {
        id: generateProjectId(),
        name: projectName,
        visibility: visibility,
        files: [],
        size: 0,
        domain: `${projectName}.${CLOUD_CONFIG.defaultDomain}`,
        deployed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    projects.push(newProject);
    saveProjects();
    renderProjects();
    updateStats();
    
    document.getElementById('projectName').value = '';
    
    logToTerminal(`Project created: ${projectName}`, 'success');
    showToast(`Project "${projectName}" created successfully!`, 'success');
    
    // Auto-select the new project
    selectProject(newProject.id);
}

function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? All files will be permanently deleted.')) {
        return;
    }
    
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
        const projectName = projects[projectIndex].name;
        projects.splice(projectIndex, 1);
        saveProjects();
        renderProjects();
        updateStats();
        
        if (currentProject && currentProject.id === projectId) {
            currentProject = null;
            document.getElementById('fileManager').innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 40px;">Select a project to view files</p>';
        }
        
        logToTerminal(`Project deleted: ${projectName}`, 'warning');
        showToast(`Project "${projectName}" deleted`, 'success');
    }
}

function selectProject(projectId) {
    currentProject = projects.find(p => p.id === projectId);
    if (currentProject) {
        renderFileManager();
        logToTerminal(`Selected project: ${currentProject.name}`, 'info');
    }
}

// ============================================
// FILE MANAGEMENT
// ============================================

function handleFileUpload(files) {
    if (!currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    // Check project size limit
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    
    if (currentProject.size + totalSizeMB > CLOUD_CONFIG.maxProjectSize) {
        showToast('Project size limit exceeded (max: 1GB)', 'error');
        return;
    }
    
    Array.from(files).forEach(file => {
        // Create file record
        const fileRecord = {
            id: generateFileId(),
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            path: file.webkitRelativePath || file.name,
            content: null, // For text files
            binary: false, // For binary files
            createdAt: new Date().toISOString()
        };
        
        // Try to read text files
        if (file.type.startsWith('text/') || file.name.endsWith('.js') || file.name.endsWith('.html') || file.name.endsWith('.css') || file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                fileRecord.content = e.target.result;
                fileRecord.binary = false;
                addFileToProject(fileRecord);
            };
            reader.readAsText(file);
        } else {
            fileRecord.binary = true;
            addFileToProject(fileRecord);
        }
    });
}

function addFileToProject(fileRecord) {
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        // Check if file already exists
        const existingFileIndex = projects[projectIndex].files.findIndex(f => f.path === fileRecord.path);
        
        if (existingFileIndex !== -1) {
            // Update existing file
            projects[projectIndex].files[existingFileIndex] = fileRecord;
            logToTerminal(`File updated: ${fileRecord.name}`, 'info');
        } else {
            // Add new file
            projects[projectIndex].files.push(fileRecord);
            logToTerminal(`File added: ${fileRecord.name}`, 'success');
        }
        
        // Update project size
        projects[projectIndex].size += fileRecord.size / (1024 * 1024);
        projects[projectIndex].updatedAt = new Date().toISOString();
        
        saveProjects();
        renderFileManager();
        updateStats();
    }
}

function deleteFile(fileId) {
    if (!currentProject) return;
    
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        const fileIndex = projects[projectIndex].files.findIndex(f => f.id === fileId);
        
        if (fileIndex !== -1) {
            const fileName = projects[projectIndex].files[fileIndex].name;
            
            // Update project size
            projects[projectIndex].size -= projects[projectIndex].files[fileIndex].size / (1024 * 1024);
            
            // Remove file
            projects[projectIndex].files.splice(fileIndex, 1);
            projects[projectIndex].updatedAt = new Date().toISOString();
            
            saveProjects();
            renderFileManager();
            updateStats();
            
            logToTerminal(`File deleted: ${fileName}`, 'warning');
            showToast(`File "${fileName}" deleted`, 'success');
        }
    }
}

function editFile(fileId) {
    if (!currentProject) return;
    
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        const file = projects[projectIndex].files.find(f => f.id === fileId);
        
        if (file && !file.binary && file.content !== null) {
            const newContent = prompt(`Edit file: ${file.name}`, file.content);
            
            if (newContent !== null) {
                file.content = newContent;
                projects[projectIndex].updatedAt = new Date().toISOString();
                
                saveProjects();
                renderFileManager();
                
                logToTerminal(`File edited: ${file.name}`, 'info');
                showToast(`File "${file.name}" updated`, 'success');
            }
        } else {
            showToast('Cannot edit binary files', 'error');
        }
    }
}

// ============================================
// DEPLOYMENT
// ============================================

function deployProject() {
    if (!currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    // Find index.html
    let indexFile = currentProject.files.find(f => 
        f.name === 'index.html' || 
        f.path.endsWith('/index.html')
    );
    
    // If no index.html, find any HTML file
    if (!indexFile) {
        indexFile = currentProject.files.find(f => f.name.endsWith('.html'));
    }
    
    if (!indexFile) {
        showToast('No HTML file found in project', 'error');
        return;
    }
    
    const domainName = document.getElementById('domainName').value.trim() || currentProject.domain;
    
    logToTerminal('Starting deployment...', 'info');
    
    // Simulate deployment
    setTimeout(() => {
        currentProject.deployed = true;
        currentProject.domain = domainName;
        currentProject.indexFile = indexFile.path;
        currentProject.deployedAt = new Date().toISOString();
        
        const projectIndex = projects.findIndex(p => p.id === currentProject.id);
        projects[projectIndex] = currentProject;
        
        saveProjects();
        renderProjects();
        
        document.getElementById('deploymentStatus').innerHTML = `
            <div style="background: rgba(34, 197, 94, 0.1); padding: 20px; border-radius: 10px; border: 1px solid #22c55e;">
                <h3 style="color: #22c55e; margin-bottom: 10px;">✅ Deployment Successful!</h3>
                <p><strong>Domain:</strong> ${domainName}</p>
                <p><strong>URL:</strong> https://${domainName}</p>
                <p><strong>Index File:</strong> ${indexFile.path}</p>
                <p><strong>Deployed At:</strong> ${new Date().toLocaleString()}</p>
                <a href="#" style="color: #22c55e; text-decoration: underline;">🌐 Open Site</a>
            </div>
        `;
        
        logToTerminal(`Deployment completed: ${domainName}`, 'success');
        showToast(`Project deployed to https://${domainName}`, 'success');
    }, 2000);
}

// ============================================
// UI RENDERING
// ============================================

function renderProjects() {
    const projectsList = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        projectsList.innerHTML = '<p style="color: #94a3b8; grid-column: 1/-1; text-align: center;">No projects yet. Create your first project!</p>';
        return;
    }
    
    let projectsHTML = '';
    projects.forEach(project => {
        const visibilityColor = project.visibility === 'public' ? '#22c55e' : '#f59e0b';
        const deployedBadge = project.deployed ? '<span style="color: #22c55e;">🟢 Deployed</span>' : '<span style="color: #64748b;">⚪ Not Deployed</span>';
        
        projectsHTML += `
            <div class="project-card" style="background: rgba(30, 41, 59, 0.8); padding: 20px; border-radius: 10px; border: 1px solid #334155; cursor: pointer;" onclick="selectProject('${project.id}')">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <h3 style="color: #22c55e; margin: 0;">${project.name}</h3>
                    <span style="color: ${visibilityColor}; font-size: 0.8rem;">${project.visibility}</span>
                </div>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">📁 ${project.files.length} files</p>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">💾 ${(project.size).toFixed(2)} MB</p>
                <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 15px;">🌐 ${project.domain}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    ${deployedBadge}
                    <button onclick="event.stopPropagation(); deleteProject('${project.id}')" style="width: auto; padding: 5px 15px; background: linear-gradient(135deg, #ef4444, #dc2626); font-size: 0.85rem;">Delete</button>
                </div>
            </div>
        `;
    });
    
    projectsList.innerHTML = projectsHTML;
}

function renderFileManager() {
    const fileManager = document.getElementById('fileManager');
    
    if (!currentProject) {
        fileManager.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 40px;">Select a project to view files</p>';
        return;
    }
    
    if (currentProject.files.length === 0) {
        fileManager.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3 style="color: #22c55e; margin-bottom: 15px;">${currentProject.name}</h3>
                <p style="color: #94a3b8;">No files yet. Upload files to get started!</p>
            </div>
        `;
        return;
    }
    
    let filesHTML = `
        <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #334155;">
            <h3 style="color: #22c55e;">${currentProject.name}</h3>
            <p style="color: #94a3b8; font-size: 0.9rem;">${currentProject.files.length} files | ${(currentProject.size).toFixed(2)} MB</p>
        </div>
    `;
    
    currentProject.files.forEach(file => {
        const fileSize = (file.size / 1024).toFixed(2) + ' KB';
        const fileIcon = getFileIcon(file.name);
        
        filesHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; border-left: 3px solid #22c55e;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5rem;">${fileIcon}</span>
                    <div>
                        <p style="color: #e2e8f0; font-weight: 600; margin: 0;">${file.name}</p>
                        <p style="color: #64748b; font-size: 0.8rem; margin: 0;">${fileSize} | ${file.type}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editFile('${file.id}')" style="width: auto; padding: 5px 12px; font-size: 0.8rem;">Edit</button>
                    <button onclick="deleteFile('${file.id}')" style="width: auto; padding: 5px 12px; background: linear-gradient(135deg, #ef4444, #dc2626); font-size: 0.8rem;">Delete</button>
                </div>
            </div>
        `;
    });
    
    fileManager.innerHTML = filesHTML;
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'html': '🌐',
        'css': '🎨',
        'js': '⚡',
        'json': '📋',
        'png': '🖼️',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'gif': '🖼️',
        'pdf': '📄',
        'doc': '📝',
        'docx': '📝',
        'zip': '📦',
        'rar': '📦'
    };
    return icons[ext] || '📄';
}

function updateStats() {
    document.getElementById('totalProjects').textContent = projects.length;
    
    const totalSize = projects.reduce((sum, p) => sum + p.size, 0);
    document.getElementById('storageUsed').textContent = totalSize.toFixed(2) + ' GB';
    
    const deployedProjects = projects.filter(p => p.deployed).length;
    document.getElementById('activeDeployments').textContent = deployedProjects;
    
    const totalFiles = projects.reduce((sum, p) => sum + p.files.length, 0);
    document.getElementById('totalFiles').textContent = totalFiles;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function setupDragDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#22c55e';
        dropZone.style.background = 'rgba(34, 197, 94, 0.1)';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#334155';
        dropZone.style.background = 'transparent';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#334155';
        dropZone.style.background = 'transparent';
        
        handleFileUpload(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });
}

function generateProjectId() {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(8);
    return 'PRJ' + timestamp + random;
}

function generateFileId() {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(6);
    return 'FILE' + timestamp + random;
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function logToTerminal(message, type = 'info') {
    const terminal = document.getElementById('terminal');
    const timestamp = new Date().toLocaleTimeString();
    
    const colorMap = {
        'info': '#22c55e',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444'
    };
    
    const logEntry = document.createElement('p');
    logEntry.innerHTML = `<span style="color: #64748b;">[${timestamp}]</span> <span style="color: ${colorMap[type]};">${message}</span>`;
    terminal.appendChild(logEntry);
    terminal.scrollTop = terminal.scrollHeight;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'success' ? '#16a34a' : '#ef4444';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function logout() {
    window.location.href = '../index.html';
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeCloudEngine();
    console.log('Pilgrim Cloud Engine Initialized');
    console.log('Owner: ' + CLOUD_CONFIG.owner);
});