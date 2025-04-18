/**
 * Project Storage Manager
 * Handles saving and loading comic projects to/from local storage
 */
export class ProjectStorageManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
        this.storageKey = 'comicCreatorProjects';
        this.projectList = this.loadProjectList();
    }

    /**
     * Load the list of saved projects from local storage
     * @returns {Array} Array of project metadata objects
     */
    loadProjectList() {
        try {
            const projectListJSON = localStorage.getItem(this.storageKey);
            return projectListJSON ? JSON.parse(projectListJSON) : [];
        } catch (error) {
            console.error('Error loading project list:', error);
            return [];
        }
    }

    /**
     * Save the project list to local storage
     */
    saveProjectList() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.projectList));
        } catch (error) {
            console.error('Error saving project list:', error);
            this.comicCreator.uiManager.showNotification(
                'Error saving project list. Local storage may be full.',
                'error'
            );
        }
    }

    /**
     * Save the current project to local storage
     * @param {string} projectName - Name to save the project under
     * @returns {Promise<boolean>} Success status
     */
    async saveProject(projectName) {
        try {
            if (!projectName) throw new Error('Project name is required');
            
            // Get current project data from ComicCreator
            const projectData = this.comicCreator.saveProject();
            
            // Add timestamp and project name
            const timestamp = Date.now();
            projectData.name = projectName;
            projectData.lastModified = timestamp;
            
            // Generate a unique ID if it doesn't exist
            const projectId = projectData.id || `project_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
            projectData.id = projectId;
            
            // Convert to string
            const projectDataStr = JSON.stringify(projectData);
            
            // Save the project data
            localStorage.setItem(`project_${projectId}`, projectDataStr);
            
            // Update the project list with metadata
            const existingIndex = this.projectList.findIndex(p => p.id === projectId);
            const projectInfo = {
                id: projectId,
                name: projectName,
                lastModified: timestamp,
                pageCount: projectData.pages.length,
                thumbnail: projectData.pages[0]?.thumbnail || null
            };
            
            if (existingIndex >= 0) {
                this.projectList[existingIndex] = projectInfo;
            } else {
                this.projectList.push(projectInfo);
            }
            
            // Save the updated project list
            this.saveProjectList();
            
            return true;
        } catch (error) {
            console.error('Error saving project:', error);
            this.comicCreator.uiManager.showNotification(
                'Error saving project: ' + error.message,
                'error'
            );
            return false;
        }
    }

    /**
     * Load a project from local storage
     * @param {string} projectId - ID of the project to load
     * @returns {Promise<boolean>} Success status
     */
    async loadProject(projectId) {
        try {
            // Get project data from local storage
            const projectDataStr = localStorage.getItem(`project_${projectId}`);
            if (!projectDataStr) throw new Error('Project not found');
            
            // Parse project data
            const projectData = JSON.parse(projectDataStr);
            
            // Load project into comic creator
            await this.comicCreator.loadProject(projectData);
            
            // Update last modified timestamp
            const timestamp = Date.now();
            const projectIndex = this.projectList.findIndex(p => p.id === projectId);
            if (projectIndex >= 0) {
                this.projectList[projectIndex].lastModified = timestamp;
                this.saveProjectList();
            }
            
            return true;
        } catch (error) {
            console.error('Error loading project:', error);
            this.comicCreator.uiManager.showNotification(
                'Error loading project: ' + error.message,
                'error'
            );
            return false;
        }
    }

    /**
     * Delete a project from local storage
     * @param {string} projectId - ID of the project to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteProject(projectId) {
        try {
            // Remove from local storage
            localStorage.removeItem(`project_${projectId}`);
            
            // Remove from project list
            this.projectList = this.projectList.filter(p => p.id !== projectId);
            this.saveProjectList();
            
            return true;
        } catch (error) {
            console.error('Error deleting project:', error);
            this.comicCreator.uiManager.showNotification(
                'Error deleting project: ' + error.message,
                'error'
            );
            return false;
        }
    }

    /**
     * Get a list of all saved projects
     * @returns {Array} Array of project metadata objects
     */
    getProjectList() {
        return [...this.projectList].sort((a, b) => b.lastModified - a.lastModified);
    }

    /**
     * Check if a project name already exists
     * @param {string} projectName - Name to check
     * @param {string} excludeId - Optional project ID to exclude from the check
     * @returns {boolean} True if project name exists
     */
    projectNameExists(projectName, excludeId = null) {
        return this.projectList.some(
            p => p.name.toLowerCase() === projectName.toLowerCase() && p.id !== excludeId
        );
    }

    /**
     * Generate a thumbnail for a project
     * @param {HTMLElement} canvasElement - Canvas element to create thumbnail from
     * @returns {Promise<string>} Data URL of the thumbnail
     */
    async generateThumbnail(canvasElement) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            // Draw a scaled-down version of the canvas
            ctx.drawImage(canvasElement, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            return canvas.toDataURL('image/jpeg', 0.7);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return null;
        }
    }
    
    /**
     * Get a list of saved project names
     * @returns {Array<string>} Array of project names
     */
    listSavedProjects() {
        return this.projectList.map(project => project.name);
    }
    
    /**
     * Check if a project name is already taken
     * @param {string} projectName - Name to check
     * @returns {boolean} True if the name is taken
     */
    isProjectNameTaken(projectName) {
        return this.projectNameExists(projectName);
    }
    
    /**
     * Delete a project from local storage by name
     * @param {string} projectName - Name of the project to delete
     * @returns {boolean} Success status
     */
    deleteProjectFromLocal(projectName) {
        try {
            // Find the project by name
            const project = this.projectList.find(p => p.name === projectName);
            if (!project) {
                console.error(`Project "${projectName}" not found`);
                return false;
            }
            
            // Delete the project using its ID
            return this.deleteProject(project.id);
        } catch (error) {
            console.error(`Error deleting project "${projectName}":`, error);
            return false;
        }
    }
} 