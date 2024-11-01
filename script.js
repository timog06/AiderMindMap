class MindMap {
    constructor(container) {
        this.container = container;
        this.nodes = [];
        this.lines = [];
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.lineStartNode = null;
        this.setupDragListeners();
        this.setupPopup();
        this.load();
    }

    save() {
        const data = {
            nodes: this.nodes.map(node => ({
                id: node.id,
                text: node.element.querySelector('.node-text').textContent,
                x: node.x,
                y: node.y,
                parentId: node.parentId
            })),
            lines: this.lines.map(line => ({
                fromId: line.fromId,
                toId: line.toId
            }))
        };
        localStorage.setItem('mindMapData', JSON.stringify(data));
    }

    load() {
        const savedData = localStorage.getItem('mindMapData');
        if (savedData) {
            const data = JSON.parse(savedData);
            data.nodes.forEach(node => {
                this.addNode(node.text, node.x, node.y, node.parentId, node.id);
            });
            data.lines.forEach(line => {
                this.addLine(line.fromId, line.toId);
            });
        } else {
            this.addNode('Root', 0, 0);
        }
    }

    addNode(text, x, y, parentId = null, id = null) {
        const node = document.createElement('div');
        node.className = 'node';
        node.innerHTML = `
            <span class="node-text">${text}</span>
            <div class="add-button">+</div>
            <div class="add-line-button">↔</div>
        `;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        
        if (id === null) {
            id = Date.now();
        }
        node.dataset.id = id;

        this.container.appendChild(node);
        this.nodes.push({ id, element: node, parentId, x, y });

        if (parentId !== null) {
            this.addLine(parentId, id);
        }

        this.setupNodeListeners(node);
        this.save();
    }

    setupDragListeners() {
        this.container.addEventListener('mousemove', this.onDrag.bind(this));
        this.container.addEventListener('mouseup', this.onDragEnd.bind(this));
        this.container.addEventListener('mouseleave', this.onDragEnd.bind(this));
    }

    setupNodeListeners(node) {
        node.addEventListener('mousedown', this.onDragStart.bind(this));
        node.addEventListener('click', this.onNodeClick.bind(this));
        node.querySelector('.add-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.promptNewNode(parseInt(node.dataset.id));
        });
        node.querySelector('.add-line-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.startLineCreation(parseInt(node.dataset.id));
        });
    }

    onNodeClick(e) {
        if (this.lineStartNode !== null || this.draggedNode) {
            return;
        }
        if (!e.target.classList.contains('add-button') && !e.target.classList.contains('add-line-button')) {
            this.showPopup(parseInt(e.currentTarget.dataset.id));
        }
    }

    onDragStart(e) {
        if (e.target.classList.contains('add-button')) return;
        
        const node = e.target.closest('.node');
        if (!node) return;

        this.draggedNode = node;
        this.dragOffset = {
            x: e.clientX - node.offsetLeft,
            y: e.clientY - node.offsetTop
        };
        
        // Prevent text selection during drag
        e.preventDefault();
        
        // Hide popup when starting to drag
        this.hidePopup();
    }

    onDrag(e) {
        if (!this.draggedNode) return;

        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;

        this.draggedNode.style.left = `${x}px`;
        this.draggedNode.style.top = `${y}px`;

        const nodeData = this.nodes.find(n => n.id === parseInt(this.draggedNode.dataset.id));
        nodeData.x = x;
        nodeData.y = y;

        this.updateLines();
    }

    onDragEnd() {
        if (this.draggedNode) {
            this.save();
            this.draggedNode = null;
        }
    }

    onDrag(e) {
        if (!this.draggedNode) return;

        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;

        this.draggedNode.style.left = `${x}px`;
        this.draggedNode.style.top = `${y}px`;

        const nodeData = this.nodes.find(n => n.id === parseInt(this.draggedNode.dataset.id));
        nodeData.x = x;
        nodeData.y = y;

        this.updateLines();

        // Set a flag to indicate that dragging occurred
        this.wasDragged = true;
    }

    setupPopup() {
        this.popup = document.getElementById('popup');

        document.addEventListener('click', (e) => {
            if (!this.popup.contains(e.target) && !e.target.closest('.node')) {
                this.hidePopup();
            }
        });
    }

    showPopup(nodeId, action = 'edit') {
        const node = this.nodes.find(n => n.id === nodeId);
        let currentText = action === 'edit' ? node.element.querySelector('.node-text').textContent : '';
        
        this.popup.innerHTML = `
            <input type="text" value="${currentText}" placeholder="Enter node text">
            <div class="error-message" style="display: none; color: red; margin-top: 5px;"></div>
            <button class="confirm">${action === 'edit' ? 'Update' : 'Create'}</button>
            <button class="cancel">Cancel</button>
            ${action === 'edit' ? '<button class="delete">Delete</button>' : ''}
        `;
        
        // Position the popup in the center of the screen
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        
        this.popup.style.left = `${viewportWidth / 2 - 150}px`;  // Assuming popup width is 300px
        this.popup.style.top = `${viewportHeight / 2 - 100}px`;  // Assuming popup height is 200px
        this.popup.style.display = 'block';

        const input = this.popup.querySelector('input');
        const errorMessage = this.popup.querySelector('.error-message');
        input.focus();

        const saveNode = () => {
            const newText = input.value.trim();
            if (newText !== '') {
                if (action === 'edit') {
                    this.editNodeText(nodeId, newText);
                } else {
                    this.addNode(newText, 0, 0, nodeId);
                }
                this.hidePopup();
            } else {
                errorMessage.textContent = 'Node text cannot be empty';
                errorMessage.style.display = 'block';
            }
        };

        this.popup.querySelector('.confirm').addEventListener('click', saveNode);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveNode();
            }
        });

        this.popup.querySelector('.cancel').addEventListener('click', () => {
            this.hidePopup();
        });

        if (action === 'edit') {
            this.popup.querySelector('.delete').addEventListener('click', () => {
                this.deleteNode(nodeId);
                this.hidePopup();
            });
        }
    }

    hidePopup() {
        this.popup.style.display = 'none';
    }

    editNodeText(id, newText) {
        const node = this.nodes.find(n => n.id === id);
        const textElement = node.element.querySelector('.node-text');
        textElement.textContent = newText;
        this.save();
    }

    deleteNode(id) {
        const nodeIndex = this.nodes.findIndex(n => n.id === id);
        if (nodeIndex === -1) return;

        const node = this.nodes[nodeIndex];
        
        // Remove child nodes recursively
        this.nodes.filter(n => n.parentId === id).forEach(child => {
            this.deleteNode(child.id);
        });

        // Remove lines connected to this node
        this.lines = this.lines.filter(line => {
            if (line.fromId === id || line.toId === id) {
                line.element.remove();
                return false;
            }
            return true;
        });

        // Remove the node element from DOM
        node.element.remove();

        // Remove the node from the nodes array
        this.nodes.splice(nodeIndex, 1);

        this.save();
        this.updateLines();
    }

    addLine(fromId, toId) {
        const line = document.createElement('div');
        line.className = 'line';
        this.container.appendChild(line);
        const lineObj = { fromId, toId, element: line };
        this.lines.push(lineObj);
        line.onclick = (e) => {
            e.stopPropagation();
            this.showDeleteLinePopup(lineObj);
        };
        this.updateLines();
    }

    updateLines() {
        this.lines.forEach(line => {
            const fromNode = this.nodes.find(n => n.id === line.fromId);
            const toNode = this.nodes.find(n => n.id === line.toId);

            if (!fromNode || !toNode) {
                line.element.remove();
                return;
            }

            const fromRect = fromNode.element.getBoundingClientRect();
            const toRect = toNode.element.getBoundingClientRect();

            const fromCenterX = fromNode.x + fromRect.width / 2;
            const fromCenterY = fromNode.y + fromRect.height / 2;
            const toCenterX = toNode.x + toRect.width / 2;
            const toCenterY = toNode.y + toRect.height / 2;

            const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
            const fromX = fromCenterX + Math.cos(angle) * (fromRect.width / 2);
            const fromY = fromCenterY + Math.sin(angle) * (fromRect.height / 2);
            const toX = toCenterX - Math.cos(angle) * (toRect.width / 2);
            const toY = toCenterY - Math.sin(angle) * (toRect.height / 2);

            const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));

            line.element.style.width = `${length}px`;
            line.element.style.left = `${fromX}px`;
            line.element.style.top = `${fromY}px`;
            line.element.style.transform = `rotate(${angle}rad)`;

            // Add click event listener to the line
            line.element.onclick = (e) => {
                e.stopPropagation();
                this.showDeleteLinePopup(line);
            };
        });
    }

    showDeleteLinePopup(line) {
        const popup = document.createElement('div');
        popup.className = 'custom-popup';
        popup.innerHTML = `
            <p>Do you want to delete this connector?</p>
            <button class="confirm">Delete</button>
            <button class="cancel">Cancel</button>
        `;

        popup.style.position = 'absolute';
        popup.style.left = `${line.element.offsetLeft + line.element.offsetWidth / 2}px`;
        popup.style.top = `${line.element.offsetTop}px`;

        this.container.appendChild(popup);

        popup.querySelector('.confirm').onclick = () => {
            this.deleteLine(line);
            popup.remove();
        };

        popup.querySelector('.cancel').onclick = () => {
            popup.remove();
        };

        // Close popup when clicking outside
        const closePopup = (e) => {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closePopup);
        }, 0);
    }

    deleteLine(line) {
        const index = this.lines.indexOf(line);
        if (index > -1) {
            this.lines.splice(index, 1);
            line.element.remove();
            this.save();
        }
    }

    promptNewNode(parentId) {
        this.showPopup(parentId, 'create');
    }

    startLineCreation(nodeId) {
        this.lineStartNode = nodeId;
        this.container.style.cursor = 'crosshair';
        this.container.addEventListener('click', this.finishLineCreation);
    }

    finishLineCreation = (e) => {
        const clickedNode = e.target.closest('.node');
        if (clickedNode && parseInt(clickedNode.dataset.id) !== this.lineStartNode) {
            this.addLine(this.lineStartNode, parseInt(clickedNode.dataset.id));
            this.save();
        }
        this.lineStartNode = null;
        this.container.style.cursor = 'default';
        this.container.removeEventListener('click', this.finishLineCreation);
        // Prevent the click event from triggering the node's click handler
        e.stopPropagation();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('mindmap');
    const mindMap = new MindMap(container);

    window.addEventListener('resize', () => mindMap.updateLines());

    // Export functionality
    const exportButton = document.getElementById('export-button');
    let exportPopup = null;

    exportButton.addEventListener('click', () => {
        if (exportPopup) {
            exportPopup.remove();
            exportPopup = null;
            return;
        }

        exportPopup = document.createElement('div');
        exportPopup.className = 'export-popup';
        exportPopup.innerHTML = `
            <button id="export-pdf">Export as PDF</button>
            <button id="export-image">Export as Image</button>
        `;
        document.body.appendChild(exportPopup);

        document.getElementById('export-pdf').addEventListener('click', async () => {
            const canvas = await html2canvas(container);
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('mindmap.pdf');
            exportPopup.remove();
            exportPopup = null;
        });

        document.getElementById('export-image').addEventListener('click', async () => {
            const canvas = await html2canvas(container);
            const link = document.createElement('a');
            link.download = 'mindmap.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            exportPopup.remove();
            exportPopup = null;
        });

        // Close popup when clicking outside
        document.addEventListener('click', (e) => {
            if (exportPopup && !exportPopup.contains(e.target) && e.target !== exportButton) {
                exportPopup.remove();
                exportPopup = null;
            }
        });
    });
});
