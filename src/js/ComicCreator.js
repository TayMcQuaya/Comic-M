import { jsPDF } from 'jspdf';
import { createGridLayout } from './layouts.js';

export class ComicCreator {
    constructor(layouts) {
        this.layouts = layouts;
        this.currentLayout = null;
        this.uploadedImages = [];
        this.textBoxes = [];
        this.selectedPanel = null;
        this.selectedTextBox = null;
        this.canvasWidth = 800;
        this.canvasHeight = 1000;
        
        // Bind methods
        this.handleImageUpload = this.handleImageUpload.bind(this);
        this.deleteImage = this.deleteImage.bind(this);
        this.initDragAndDrop = this.initDragAndDrop.bind(this);
    }

    async handleImageUpload(files) {
        const imagePromises = Array.from(files).map(file => {
            return new Promise((resolve, reject) => {
                if (!file.type.startsWith('image/')) {
                    reject(new Error('Not an image file'));
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    // Create an image element to get the original dimensions
                    const img = new Image();
                    img.onload = () => {
                        resolve({
                            id: `img_${Date.now()}_${this.uploadedImages.length}`,
                            dataUrl: e.target.result,
                            filename: file.name,
                            width: img.width,
                            height: img.height,
                            aspectRatio: img.width / img.height
                        });
                    };
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
        });

        try {
            const newImages = await Promise.all(imagePromises);
            this.uploadedImages.push(...newImages);
            this.updateImageLibrary();
        } catch (error) {
            console.error('Error uploading images:', error);
        }
    }

    updateImageLibrary() {
        const thumbnails = document.getElementById('image-thumbnails');
        thumbnails.innerHTML = '';

        this.uploadedImages.forEach(image => {
            const container = document.createElement('div');
            container.className = 'thumbnail-container';
            container.draggable = true;
            container.dataset.imageId = image.id;

            const img = document.createElement('img');
            img.src = image.dataUrl;
            img.alt = image.filename;
            img.className = 'thumbnail';

            const nameLabel = document.createElement('div');
            nameLabel.className = 'image-name';
            nameLabel.textContent = image.filename;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteImage(image.id);
            };

            container.appendChild(img);
            container.appendChild(nameLabel);
            container.appendChild(deleteBtn);
            thumbnails.appendChild(container);

            // Initialize drag and drop for this thumbnail
            this.initDragAndDrop(container);
        });

        // Update the editor thumbnails if they exist
        const editorThumbnails = document.getElementById('editor-thumbnails');
        if (editorThumbnails) {
            editorThumbnails.innerHTML = thumbnails.innerHTML;
        }
    }

    deleteImage(imageId) {
        this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);
        this.updateImageLibrary();

        // Disable the "Next" button if no images are left
        const createComicBtn = document.getElementById('create-comic-btn');
        if (createComicBtn) {
            createComicBtn.disabled = this.uploadedImages.length === 0;
        }
    }

    initDragAndDrop(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', element.dataset.imageId);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });
    }

    initializeLayoutSelection() {
        const layoutGrid = document.querySelector('.layout-grid');
        layoutGrid.innerHTML = '';

        this.layouts.forEach(layout => {
            const layoutElement = document.createElement('div');
            layoutElement.className = 'layout-option';
            layoutElement.innerHTML = `
                <h3>${layout.name}</h3>
                <p>${layout.description}</p>
                <div class="layout-preview">
                    ${this.createLayoutPreview(layout)}
                </div>
            `;
            layoutElement.addEventListener('click', () => this.selectLayout(layout));
            layoutGrid.appendChild(layoutElement);
        });
    }

    createLayoutPreview(layout) {
        const previewHtml = layout.panels.map(panel => {
            const style = `
                position: absolute;
                left: ${panel.x * 100}%;
                top: ${panel.y * 100}%;
                width: ${panel.width * 100}%;
                height: ${panel.height * 100}%;
                border: 1px solid var(--border-color);
                background-color: #f0f0f0;
            `;
            return `<div style="${style}"></div>`;
        }).join('');

        return `<div style="position: relative; width: 100%; padding-bottom: 100%;">${previewHtml}</div>`;
    }

    createCustomLayout(rows, cols) {
        const layout = createGridLayout(rows, cols);
        this.selectLayout(layout);
    }

    selectLayout(layout) {
        this.currentLayout = layout;
        document.getElementById('layout-selection').classList.remove('active');
        document.getElementById('comic-editor').classList.add('active');
        this.initializeComicCanvas();
    }

    initializeComicCanvas() {
        const canvas = document.getElementById('comic-canvas');
        canvas.style.width = `${this.canvasWidth}px`;
        canvas.style.height = `${this.canvasHeight}px`;
        canvas.innerHTML = '';

        this.currentLayout.panels.forEach((panel, index) => {
            const panelElement = document.createElement('div');
            panelElement.className = 'comic-panel';
            panelElement.style.position = 'absolute';
            panelElement.style.left = `${panel.x * this.canvasWidth}px`;
            panelElement.style.top = `${panel.y * this.canvasHeight}px`;
            panelElement.style.width = `${panel.width * this.canvasWidth}px`;
            panelElement.style.height = `${panel.height * this.canvasHeight}px`;
            panelElement.dataset.panelIndex = index;

            // Make panel a drop target
            panelElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                panelElement.classList.add('drop-target');
            });

            panelElement.addEventListener('dragleave', () => {
                panelElement.classList.remove('drop-target');
            });

            panelElement.addEventListener('drop', (e) => {
                e.preventDefault();
                panelElement.classList.remove('drop-target');
                const imageId = e.dataTransfer.getData('text/plain');
                const image = this.uploadedImages.find(img => img.id === imageId);
                if (image) {
                    this.assignImageToPanel(image, panelElement);
                }
            });

            panelElement.addEventListener('click', () => this.selectPanel(panelElement));
            canvas.appendChild(panelElement);
        });
    }

    selectPanel(panelElement) {
        if (this.selectedPanel) {
            this.selectedPanel.classList.remove('selected');
        }
        this.selectedPanel = panelElement;
        panelElement.classList.add('selected');
    }

    assignImageToPanel(image, panelElement) {
        // Clear existing content
        panelElement.innerHTML = '';

        // Create and add new image
        const img = document.createElement('img');
        img.src = image.dataUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        panelElement.appendChild(img);

        // Add image controls
        this.addImageControls(panelElement, img);
    }

    addImageControls(panelElement, img) {
        const controls = document.createElement('div');
        controls.className = 'image-controls';
        controls.innerHTML = `
            <input type="range" min="100" max="200" value="100" class="zoom-control">
            <div class="pan-controls">
                <button class="pan-left"><i class="fas fa-arrow-left"></i></button>
                <button class="pan-right"><i class="fas fa-arrow-right"></i></button>
                <button class="pan-up"><i class="fas fa-arrow-up"></i></button>
                <button class="pan-down"><i class="fas fa-arrow-down"></i></button>
            </div>
        `;

        const zoomControl = controls.querySelector('.zoom-control');
        zoomControl.addEventListener('input', (e) => {
            const zoom = e.target.value / 100;
            img.style.transform = `scale(${zoom})`;
        });

        controls.querySelectorAll('.pan-controls button').forEach(button => {
            button.addEventListener('click', () => {
                const currentTransform = img.style.transform || 'scale(1)';
                const currentTranslate = currentTransform.match(/translate\((.*?)\)/) || ['', '0px, 0px'];
                const [currentX, currentY] = currentTranslate[1].split(',').map(val => parseInt(val) || 0);

                const step = 10;
                let newX = currentX;
                let newY = currentY;

                if (button.classList.contains('pan-left')) newX -= step;
                if (button.classList.contains('pan-right')) newX += step;
                if (button.classList.contains('pan-up')) newY -= step;
                if (button.classList.contains('pan-down')) newY += step;

                img.style.transform = `${currentTransform.replace(/translate\(.*?\)/, '')} translate(${newX}px, ${newY}px)`;
            });
        });

        panelElement.appendChild(controls);
    }

    addTextBox() {
        const textBox = document.createElement('div');
        textBox.className = 'text-overlay';
        textBox.contentEditable = true;
        textBox.innerHTML = 'Click to edit text';
        textBox.style.position = 'absolute';
        textBox.style.left = '50%';
        textBox.style.top = '50%';
        textBox.style.transform = 'translate(-50%, -50%)';

        this.makeDraggable(textBox);
        document.getElementById('comic-canvas').appendChild(textBox);
        this.textBoxes.push(textBox);

        this.updateTextProperties(textBox);
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            if (e.target !== element) return; // Allow text editing
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    updateTextProperties(textBox) {
        const properties = document.getElementById('text-properties');
        properties.innerHTML = `
            <div class="text-controls">
                <select class="font-family">
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                </select>
                <input type="number" class="font-size" value="16" min="8" max="72">
                <input type="color" class="font-color" value="#000000">
            </div>
        `;

        const fontFamily = properties.querySelector('.font-family');
        const fontSize = properties.querySelector('.font-size');
        const fontColor = properties.querySelector('.font-color');

        fontFamily.addEventListener('change', (e) => {
            textBox.style.fontFamily = e.target.value;
        });

        fontSize.addEventListener('input', (e) => {
            textBox.style.fontSize = `${e.target.value}px`;
        });

        fontColor.addEventListener('input', (e) => {
            textBox.style.color = e.target.value;
        });
    }

    async downloadComic() {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvasWidth;
        canvas.height = this.canvasHeight;
        const ctx = canvas.getContext('2d');

        // Draw background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Convert the comic canvas to an image
        const comicCanvas = document.getElementById('comic-canvas');
        const data = await html2canvas(comicCanvas);
        ctx.drawImage(data, 0, 0);

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [this.canvasWidth, this.canvasHeight]
        });

        // Add the image to PDF
        pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 0, 0, this.canvasWidth, this.canvasHeight);

        // Download the PDF
        pdf.save('my-comic.pdf');
    }
}

// Helper function to convert HTML to canvas
function html2canvas(element) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = element.offsetWidth;
        canvas.height = element.offsetHeight;
        const ctx = canvas.getContext('2d');

        // Convert HTML to image
        const data = new XMLSerializer().serializeToString(element);
        const DOMURL = window.URL || window.webkitURL || window;
        const img = new Image();
        const svg = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const url = DOMURL.createObjectURL(svg);

        img.onload = function () {
            ctx.drawImage(img, 0, 0);
            DOMURL.revokeObjectURL(url);
            resolve(canvas);
        };
        img.src = url;
    });
} 