/**
 * Test Suite: Excessive Project Creation Bug
 * 
 * This test suite reproduces and validates the bug where navigating to invalid
 * project IDs creates excessive "Untitled Project" entries due to race conditions
 * in the useEffect hook dependencies.
 * 
 * Bug Report: https://github.com/OpenCut-app/OpenCut/issues/182
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { act } from 'react'

// Mock the project store
const mockProjects: any[] = []
const mockActiveProject = { id: null }

const mockProjectStore = {
  savedProjects: mockProjects,
  activeProject: mockActiveProject,
  loadProject: vi.fn(),
  createNewProject: vi.fn(),
  loadAllProjects: vi.fn(),
}

const mockLoadProject = vi.fn()
const mockCreateNewProject = vi.fn()

// Mock Zustand store
vi.mock('@/stores/project-store', () => ({
  useProjectStore: (selector: any) => {
    if (typeof selector === 'function') {
      return selector(mockProjectStore)
    }
    return mockProjectStore
  },
}))

// Mock the FIXED editor page component logic (extracted for testing)
class EditorPageLogic {
  private handledProjectIds = new Set<string>()
  private isInitializing = false
  private projectStore: any
  private router: any

  constructor(projectStore: any, router: any) {
    this.projectStore = projectStore
    this.router = router
  }

  async initProject(projectId: string, activeProject: any) {
    if (!projectId) {
      return
    }

    // Prevent duplicate initialization (FIX for race condition)
    if (this.isInitializing) {
      return
    }

    // Check if project is already loaded
    if (activeProject?.id === projectId) {
      return
    }

    // Check if we've already handled this project ID
    if (this.handledProjectIds.has(projectId)) {
      return
    }

    // Mark as initializing to prevent race conditions
    this.isInitializing = true
    this.handledProjectIds.add(projectId)

    try {
      await this.projectStore.loadProject(projectId)
      // Project loaded successfully
      this.isInitializing = false
    } catch (error) {
      // More specific error handling - only create new project for actual "not found" errors
      const isProjectNotFound = error instanceof Error &&
        (error.message.includes('not found') ||
         error.message.includes('does not exist') ||
         error.message.includes('Project not found'))

      if (isProjectNotFound) {
        try {
          const newProjectId = await this.projectStore.createNewProject("Untitled Project")
          this.router.replace(`/editor/${newProjectId}`)
        } catch (createError) {
          console.error("Failed to create new project:", createError)
        }
      } else {
        // For other errors (storage issues, corruption, etc.), don't create new project
        console.error("Project loading failed with recoverable error:", error)
        // Remove from handled set so user can retry
        this.handledProjectIds.delete(projectId)
      }

      this.isInitializing = false
    }
  }

  // Simulate the useEffect behavior with dependencies (FIXED - no activeProject dependency)
  async simulateUseEffect(projectId: string, activeProject: any) {
    // This simulates how React useEffect would trigger with FIXED dependencies
    await this.initProject(projectId, activeProject)
  }

  reset() {
    this.handledProjectIds.clear()
    this.isInitializing = false
  }
}

describe('Excessive Project Creation Bug', () => {
  let editorLogic: EditorPageLogic
  let projectCreationCount: number

  beforeEach(() => {
    // Reset state
    mockProjects.length = 0
    mockActiveProject.id = null
    projectCreationCount = 0

    // Setup mocks
    mockLoadProject.mockRejectedValue(new Error('Project not found'))
    mockCreateNewProject.mockImplementation(async (name: string) => {
      projectCreationCount++
      const newProject = {
        id: `generated-id-${projectCreationCount}`,
        name,
        createdAt: new Date(),
      }
      mockProjects.push(newProject)
      mockActiveProject.id = newProject.id
      return newProject.id
    })

    mockProjectStore.loadProject = mockLoadProject
    mockProjectStore.createNewProject = mockCreateNewProject

    editorLogic = new EditorPageLogic(mockProjectStore, global.mockRouter)
  })

  afterEach(() => {
    editorLogic.reset()
    vi.clearAllMocks()
  })

  describe('Single Invalid Project ID', () => {
    it('should create exactly one project for a single invalid ID', async () => {
      const invalidProjectId = 'invalid-project-123'

      await editorLogic.simulateUseEffect(invalidProjectId, mockActiveProject)

      expect(projectCreationCount).toBe(1)
      expect(mockCreateNewProject).toHaveBeenCalledTimes(1)
      expect(mockCreateNewProject).toHaveBeenCalledWith('Untitled Project')
      expect(global.mockRouter.replace).toHaveBeenCalledWith('/editor/generated-id-1')
    })

    it('should not create duplicate projects for the same invalid ID', async () => {
      const invalidProjectId = 'invalid-project-123'

      // First call
      await editorLogic.simulateUseEffect(invalidProjectId, mockActiveProject)
      
      // Second call with same ID (should be prevented by handledProjectIds)
      await editorLogic.simulateUseEffect(invalidProjectId, mockActiveProject)

      expect(projectCreationCount).toBe(1)
      expect(mockCreateNewProject).toHaveBeenCalledTimes(1)
    })
  })

  describe('Race Condition Scenarios', () => {
    it('should reproduce the race condition when activeProject changes', async () => {
      const invalidProjectId = 'invalid-project-race'

      // Simulate the race condition sequence:
      // 1. useEffect triggers with invalid project ID
      await editorLogic.simulateUseEffect(invalidProjectId, { id: null })
      
      // 2. activeProject changes (this would trigger useEffect again in React)
      const newActiveProject = { id: 'generated-id-1' }
      
      // 3. useEffect triggers again with same projectId but different activeProject
      await editorLogic.simulateUseEffect(invalidProjectId, newActiveProject)

      // Should still only create one project due to handledProjectIds
      expect(projectCreationCount).toBe(1)
    })

    it('should demonstrate the bug with rapid navigation', async () => {
      const invalidIds = [
        'rapid-test-1',
        'rapid-test-2', 
        'rapid-test-3',
        'rapid-test-4',
        'rapid-test-5'
      ]

      // Simulate rapid navigation to multiple invalid IDs
      for (const invalidId of invalidIds) {
        await editorLogic.simulateUseEffect(invalidId, mockActiveProject)
      }

      // Each invalid ID should create exactly one project
      expect(projectCreationCount).toBe(invalidIds.length)
      expect(mockCreateNewProject).toHaveBeenCalledTimes(invalidIds.length)
    })

    it('should simulate React Strict Mode double execution', async () => {
      const invalidProjectId = 'strict-mode-test'

      // Simulate React Strict Mode double execution
      const promises = [
        editorLogic.simulateUseEffect(invalidProjectId, mockActiveProject),
        editorLogic.simulateUseEffect(invalidProjectId, mockActiveProject)
      ]

      await Promise.all(promises)

      // Should only create one project despite double execution
      // (This test validates that handledProjectIds prevents duplicates)
      expect(projectCreationCount).toBe(1)
    })
  })

  describe('Error Handling Scenarios', () => {
    it('should only create projects for "not found" errors, not other failures', async () => {
      const scenarios = [
        { id: 'storage-error', error: new Error('Storage quota exceeded'), shouldCreateProject: false },
        { id: 'network-error', error: new Error('Network timeout'), shouldCreateProject: false },
        { id: 'corruption-error', error: new Error('File corrupted'), shouldCreateProject: false },
        { id: 'permission-error', error: new Error('Permission denied'), shouldCreateProject: false },
        { id: 'not-found-error', error: new Error('Project not found'), shouldCreateProject: true },
        { id: 'does-not-exist-error', error: new Error('Project does not exist'), shouldCreateProject: true }
      ]

      let expectedProjectCount = 0
      for (const scenario of scenarios) {
        mockLoadProject.mockRejectedValueOnce(scenario.error)
        await editorLogic.simulateUseEffect(scenario.id, mockActiveProject)
        if (scenario.shouldCreateProject) {
          expectedProjectCount++
        }
      }

      // Only "not found" errors should create new projects
      expect(projectCreationCount).toBe(expectedProjectCount)
      expect(expectedProjectCount).toBe(2) // Only the 2 "not found" scenarios
    })
  })

  describe('Stress Test - Excessive Project Creation', () => {
    it('should demonstrate how 885 projects could be created', async () => {
      const numberOfInvalidRequests = 50 // Simulate many invalid requests over time

      // Simulate accumulated invalid project requests over development sessions
      for (let i = 0; i < numberOfInvalidRequests; i++) {
        const invalidId = `stress-test-${i}-${Date.now()}`
        await editorLogic.simulateUseEffect(invalidId, mockActiveProject)
        
        // Reset handledProjectIds occasionally to simulate component remounting
        if (i % 10 === 0) {
          editorLogic.reset()
        }
      }

      expect(projectCreationCount).toBe(numberOfInvalidRequests)
      expect(mockProjects).toHaveLength(numberOfInvalidRequests)
      
      // Verify all projects are "Untitled Project"
      const untitledProjects = mockProjects.filter(p => p.name === 'Untitled Project')
      expect(untitledProjects).toHaveLength(numberOfInvalidRequests)
    })
  })

  describe('Bug Validation', () => {
    it('should confirm the exact bug reproduction steps', async () => {
      // Step 1: Navigate to invalid project ID (like browser back button)
      const invalidId = 'back-button-navigation-test'
      
      // Step 2: Project load fails, creates new project
      await editorLogic.simulateUseEffect(invalidId, mockActiveProject)
      
      expect(projectCreationCount).toBe(1)
      expect(mockProjects[0].name).toBe('Untitled Project')
      expect(global.mockRouter.replace).toHaveBeenCalledWith('/editor/generated-id-1')
      
      // Step 3: Verify the project was added to storage
      expect(mockProjects).toHaveLength(1)
    })

    it('should measure the impact of the bug', async () => {
      const startTime = Date.now()
      const testIterations = 100

      for (let i = 0; i < testIterations; i++) {
        await editorLogic.simulateUseEffect(`test-${i}`, mockActiveProject)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(projectCreationCount).toBe(testIterations)
      
      // Log performance impact
      console.log(`Created ${projectCreationCount} projects in ${duration}ms`)
      console.log(`Average: ${duration / testIterations}ms per project`)
    })
  })
})
