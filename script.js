// State Management
let tasks = [];
let conflicts = []; // Graph Edges
let resources = [];
let capabilities = []; // Bipartite Edges (Resource -> Task)

let graphColorResults = {};
let bipartiteResults = {};

// Color Palette for Slots
const slotColors = [
    { bg: 'rgba(99, 102, 241, 0.2)', border: '#6366f1', text: '#a5b4fc', name: 'Slot 1 (ฟ้าอมม่วง)' },
    { bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899', text: '#fbcfe8', name: 'Slot 2 (ชมพู)' },
    { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', text: '#a7f3d0', name: 'Slot 3 (เขียว)' },
    { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#fde68a', name: 'Slot 4 (ส้ม)' },
    { bg: 'rgba(14, 165, 233, 0.2)', border: '#0ea5e9', text: '#bae6fd', name: 'Slot 5 (ฟ้าสด)' }
];

// Switch Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('active');
        el.classList.add('text-slate-400');
    });

    document.getElementById(tabId).classList.add('active');
    const activeBtn = document.getElementById(`nav-${tabId}`);
    activeBtn.classList.add('active');
    activeBtn.classList.remove('text-slate-400');

    if (tabId === 'page2') drawGraphCanvas();
    if (tabId === 'page3') drawBipartiteCanvas();
    if (tabId === 'page4') renderFinalSchedule();
}

// Load Preset Sample Data
function loadSampleData() {
    tasks = ['Math 101', 'Physics 202', 'Chemistry 105', 'Biology 301', 'English 102'];
    conflicts = [
        ['Math 101', 'Physics 202'],
        ['Math 101', 'Chemistry 105'],
        ['Physics 202', 'Biology 301'],
        ['Chemistry 105', 'Biology 301'],
        ['Chemistry 105', 'English 102']
    ];
    resources = ['ดร. สมชาย', 'อ. สมศรี', 'ดร. วิทยา'];
    capabilities = [
        ['ดร. สมชาย', 'Math 101'],
        ['ดร. สมชาย', 'Physics 202'],
        ['อ. สมศรี', 'Chemistry 105'],
        ['อ. สมศรี', 'Biology 301'],
        ['ดร. วิทยา', 'English 102'],
        ['ดร. วิทยา', 'Math 101']
    ];

    updateSelectOptions();
    renderDataLists();
    runGraphColoring();
    runBipartiteMatching();
    alert('โหลดข้อมูลตัวอย่างเรียบร้อยแล้ว!');
}

// UI Select Option Refresh
function updateSelectOptions() {
    const t1 = document.getElementById('conflict-task1-select');
    const t2 = document.getElementById('conflict-task2-select');
    const mRes = document.getElementById('match-resource-select');
    const mTask = document.getElementById('match-task-select');

    t1.innerHTML = ''; t2.innerHTML = ''; mTask.innerHTML = ''; mRes.innerHTML = '';

    tasks.forEach(task => {
        t1.innerHTML += `<option value="${task}">${task}</option>`;
        t2.innerHTML += `<option value="${task}">${task}</option>`;
        mTask.innerHTML += `<option value="${task}">${task}</option>`;
    });

    resources.forEach(res => {
        mRes.innerHTML += `<option value="${res}">${res}</option>`;
    });
}

// Add Item Handlers
function addTask() {
    const input = document.getElementById('task-name-input');
    const val = input.value.trim();
    if (val && !tasks.includes(val)) {
        tasks.push(val);
        input.value = '';
        updateSelectOptions();
        renderDataLists();
    }
}

function addConflict() {
    const t1 = document.getElementById('conflict-task1-select').value;
    const t2 = document.getElementById('conflict-task2-select').value;

    if (t1 && t2 && t1 !== t2) {
        const exists = conflicts.some(c => (c[0] === t1 && c[1] === t2) || (c[0] === t2 && c[1] === t1));
        if (!exists) {
            conflicts.push([t1, t2]);
            renderDataLists();
        }
    }
}

function addResource() {
    const input = document.getElementById('resource-name-input');
    const val = input.value.trim();
    if (val && !resources.includes(val)) {
        resources.push(val);
        input.value = '';
        updateSelectOptions();
        renderDataLists();
    }
}

function addResourceCapability() {
    const res = document.getElementById('match-resource-select').value;
    const task = document.getElementById('match-task-select').value;

    if (res && task) {
        const exists = capabilities.some(c => c[0] === res && c[1] === task);
        if (!exists) {
            capabilities.push([res, task]);
            renderDataLists();
        }
    }
}

// Render Input Lists
function renderDataLists() {
    document.getElementById('task-count-badge').innerText = tasks.length;
    document.getElementById('conflict-count-badge').innerText = conflicts.length;
    document.getElementById('resource-count-badge').innerText = resources.length;

    document.getElementById('task-list-display').innerHTML = tasks.map(t => `<li class="p-2 bg-slate-900/60 rounded-lg border border-slate-800">${t}</li>`).join('');
    document.getElementById('conflict-list-display').innerHTML = conflicts.map(c => `<li class="p-2 bg-slate-900/60 rounded-lg border border-slate-800 text-pink-300">${c[0]} ⚡ ${c[1]}</li>`).join('');
    document.getElementById('resource-list-display').innerHTML = resources.map(r => {
        const caps = capabilities.filter(c => c[0] === r).map(c => c[1]).join(', ');
        return `<li class="p-2 bg-slate-900/60 rounded-lg border border-slate-800"><span class="font-semibold text-emerald-400">${r}</span>: <span class="text-slate-400">${caps || 'ยังไม่มีงานที่มอบหมาย'}</span></li>`;
    }).join('');
}

// Greedy Graph Coloring Algorithm
function runGraphColoring() {
    graphColorResults = {};
    if (tasks.length === 0) return;

    // Create Adjacency List
    const adj = {};
    tasks.forEach(t => adj[t] = []);
    conflicts.forEach(([u, v]) => {
        if (adj[u]) adj[u].push(v);
        if (adj[v]) adj[v].push(u);
    });

    // Greedy Coloring
    tasks.forEach(task => {
        const neighborColors = new Set();
        adj[task].forEach(neighbor => {
            if (graphColorResults[neighbor] !== undefined) {
                neighborColors.add(graphColorResults[neighbor]);
            }
        });

        let color = 0;
        while (neighborColors.has(color)) {
            color++;
        }
        graphColorResults[task] = color;
    });

    renderColoringResults();
    drawGraphCanvas();
}

function renderColoringResults() {
    const container = document.getElementById('slot-results-container');
    container.innerHTML = '';

    const numSlots = Math.max(...Object.values(graphColorResults), -1) + 1;
    document.getElementById('chromatic-number').innerText = tasks.length ? numSlots : 0;

    for (let i = 0; i < numSlots; i++) {
        const slotTasks = Object.keys(graphColorResults).filter(t => graphColorResults[t] === i);
        const palette = slotColors[i % slotColors.length];

        container.innerHTML += `
            <div class="p-3.5 rounded-xl border" style="background:${palette.bg}; border-color:${palette.border};">
                <div class="text-xs font-bold mb-1" style="color:${palette.text}">${palette.name}</div>
                <div class="text-xs text-white font-medium">${slotTasks.join(', ')}</div>
            </div>
        `;
    }
}

// Canvas Visualizer for Graph Coloring
function drawGraphCanvas() {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tasks.length === 0) return;

    // Position Nodes in a Circle
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 130;
    const nodeCoords = {};

    tasks.forEach((task, idx) => {
        const angle = (idx / tasks.length) * 2 * Math.PI;
        nodeCoords[task] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    });

    // Draw Edges (Conflicts)
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
    conflicts.forEach(([u, v]) => {
        if (nodeCoords[u] && nodeCoords[v]) {
            ctx.beginPath();
            ctx.moveTo(nodeCoords[u].x, nodeCoords[u].y);
            ctx.lineTo(nodeCoords[v].x, nodeCoords[v].y);
            ctx.stroke();
        }
    });

    // Draw Nodes
    tasks.forEach(task => {
        const pos = nodeCoords[task];
        const colorIdx = graphColorResults[task] ?? 0;
        const palette = slotColors[colorIdx % slotColors.length];

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 22, 0, 2 * Math.PI);
        ctx.fillStyle = palette.border;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Kanit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(task, pos.x, pos.y);
    });
}

// Maximum Bipartite Matching Algorithm (Augmenting Path / DFS)
function runBipartiteMatching() {
    bipartiteResults = {};

    function bpm(u, visited, matchR) {
        const resCaps = capabilities.filter(c => c[0] === u).map(c => c[1]);
        for (let v of resCaps) {
            if (!visited[v]) {
                visited[v] = true;
                if (!matchR[v] || bpm(matchR[v], visited, matchR)) {
                    matchR[v] = u;
                    return true;
                }
            }
        }
        return false;
    }

    const matchR = {};
    resources.forEach(r => {
        const visited = {};
        bpm(r, visited, matchR);
    });

    // Invert matchR -> bipartiteResults (Resource -> Task)
    Object.keys(matchR).forEach(task => {
        const res = matchR[task];
        bipartiteResults[res] = task;
    });

    renderBipartiteResults();
    drawBipartiteCanvas();
}

function renderBipartiteResults() {
    const container = document.getElementById('bipartite-results-container');
    container.innerHTML = '';

    const matchedCount = Object.keys(bipartiteResults).length;
    document.getElementById('matching-count').innerText = matchedCount;

    resources.forEach(res => {
        const matchedTask = bipartiteResults[res];
        if (matchedTask) {
            container.innerHTML += `
                <div class="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <span class="font-semibold text-emerald-400">${res}</span>
                    <i class="fa-solid fa-arrow-right text-slate-500"></i>
                    <span class="text-slate-200">${matchedTask}</span>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>${res}</span>
                    <span>ไม่อยู่ในเงื่อนไขจับคู่</span>
                </div>
            `;
        }
    });
}

// Draw Bipartite Graph Canvas
function drawBipartiteCanvas() {
    const canvas = document.getElementById('bipartite-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const leftX = 150;
    const rightX = 550;

    const resYStep = canvas.height / (resources.length + 1);
    const taskYStep = canvas.height / (tasks.length + 1);

    const resPos = {};
    const taskPos = {};

    resources.forEach((r, idx) => {
        resPos[r] = { x: leftX, y: resYStep * (idx + 1) };
    });

    tasks.forEach((t, idx) => {
        taskPos[t] = { x: rightX, y: taskYStep * (idx + 1) };
    });

    // Draw All Capability Lines (Dashed Gray)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.setLineDash([4, 4]);
    capabilities.forEach(([r, t]) => {
        if (resPos[r] && taskPos[t]) {
            ctx.beginPath();
            ctx.moveTo(resPos[r].x, resPos[r].y);
            ctx.lineTo(taskPos[t].x, taskPos[t].y);
            ctx.stroke();
        }
    });
    ctx.setLineDash([]);

    // Draw Matched Lines (Solid Emerald)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#10b981';
    Object.keys(bipartiteResults).forEach(res => {
        const task = bipartiteResults[res];
        if (resPos[res] && taskPos[task]) {
            ctx.beginPath();
            ctx.moveTo(resPos[res].x, resPos[res].y);
            ctx.lineTo(taskPos[task].x, taskPos[task].y);
            ctx.stroke();
        }
    });

    // Draw Left Nodes (Resources)
    resources.forEach(r => {
        const pos = resPos[r];
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11px Kanit';
        ctx.textAlign = 'right';
        ctx.fillText(r, pos.x - 25, pos.y + 4);
    });

    // Draw Right Nodes (Tasks)
    tasks.forEach(t => {
        const pos = taskPos[t];
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#a855f7';
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11px Kanit';
        ctx.textAlign = 'left';
        ctx.fillText(t, pos.x + 25, pos.y + 4);
    });
}

// Render Final Schedule Table
function renderFinalSchedule() {
    const tbody = document.getElementById('final-schedule-tbody');
    tbody.innerHTML = '';

    if (tasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">ยังไม่มีข้อมูลการจัดตาราง</td></tr>`;
        return;
    }

    tasks.forEach(task => {
        const slotIdx = graphColorResults[task] ?? 0;
        const palette = slotColors[slotIdx % slotColors.length];
        
        // Find assigned resource
        const assignedRes = Object.keys(bipartiteResults).find(key => bipartiteResults[key] === task) || 'ยังไม่ได้รับมอบหมาย';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-900/40 transition-colors">
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold" style="background:${palette.bg}; color:${palette.text}; border: 1px solid ${palette.border}">
                        Slot ${slotIdx + 1}
                    </span>
                </td>
                <td class="py-3 px-4 font-medium text-white">${task}</td>
                <td class="py-3 px-4 text-emerald-400 font-medium">${assignedRes}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> พร้อมใช้งาน
                    </span>
                </td>
            </tr>
        `;
    });
}

// Export JSON
function exportToJSON() {
    const data = {
        tasks,
        conflicts,
        resources,
        capabilities,
        graphColorResults,
        bipartiteResults
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discrete-schedule-data.json';
    a.click();
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadSampleData();
});
