#!/usr/bin/env bun

/**
 * CLI Test Runner: Excessive Project Creation Bug
 * 
 * This script runs comprehensive tests to validate the excessive project creation bug
 * and can be executed from the command line like `cargo test`.
 * 
 * Usage:
 *   bun run scripts/test-excessive-projects.ts
 *   bun run test:excessive-projects
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

class ExcessiveProjectsTestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  constructor() {
    console.log('🧪 Excessive Project Creation Bug - Test Runner')
    console.log('=' .repeat(60))
  }

  async runAllTests(): Promise<void> {
    this.startTime = Date.now()

    try {
      // Check if test files exist
      await this.validateTestEnvironment()

      // Run unit tests
      await this.runUnitTests()

      // Run integration tests  
      await this.runIntegrationTests()

      // Run specific excessive projects tests
      await this.runExcessiveProjectsTests()

      // Generate report
      this.generateReport()

    } catch (error) {
      console.error('❌ Test runner failed:', error)
      process.exit(1)
    }
  }

  private async validateTestEnvironment(): Promise<void> {
    console.log('🔍 Validating test environment...')

    const requiredFiles = [
      'src/__tests__/setup.ts',
      'src/__tests__/excessive-projects.test.ts',
      'src/__tests__/editor-page-integration.test.tsx',
      'vitest.config.ts'
    ]

    for (const file of requiredFiles) {
      if (!existsSync(path.join(process.cwd(), file))) {
        throw new Error(`Required test file not found: ${file}`)
      }
    }

    console.log('✅ Test environment validated')
  }

  private async runUnitTests(): Promise<void> {
    console.log('\n📋 Running Unit Tests...')
    
    const result = await this.runVitest([
      'src/__tests__/excessive-projects.test.ts',
      '--reporter=verbose'
    ])

    this.results.push({
      name: 'Unit Tests - Excessive Projects Logic',
      passed: result.success,
      duration: result.duration,
      error: result.error
    })
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests...')
    
    const result = await this.runVitest([
      'src/__tests__/editor-page-integration.test.tsx',
      '--reporter=verbose'
    ])

    this.results.push({
      name: 'Integration Tests - Editor Page Component',
      passed: result.success,
      duration: result.duration,
      error: result.error
    })
  }

  private async runExcessiveProjectsTests(): Promise<void> {
    console.log('\n🚨 Running Excessive Projects Bug Tests...')
    
    const result = await this.runVitest([
      'src/__tests__/excessive-projects.test.ts',
      'src/__tests__/editor-page-integration.test.tsx',
      '--reporter=verbose',
      '--run'
    ])

    this.results.push({
      name: 'Bug Reproduction Tests - All Scenarios',
      passed: result.success,
      duration: result.duration,
      error: result.error
    })
  }

  private async runVitest(args: string[]): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now()

    return new Promise((resolve) => {
      const vitestProcess = spawn('bunx', ['vitest', ...args], {
        stdio: 'inherit',
        cwd: process.cwd()
      })

      vitestProcess.on('close', (code) => {
        const duration = Date.now() - startTime
        resolve({
          success: code === 0,
          duration,
          error: code !== 0 ? `Process exited with code ${code}` : undefined
        })
      })

      vitestProcess.on('error', (error) => {
        const duration = Date.now() - startTime
        resolve({
          success: false,
          duration,
          error: error.message
        })
      })
    })
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.passed).length
    const totalTests = this.results.length

    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST RESULTS SUMMARY')
    console.log('='.repeat(60))

    this.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      const duration = `${result.duration}ms`
      
      console.log(`${index + 1}. ${status} ${result.name} (${duration})`)
      
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    })

    console.log('\n' + '-'.repeat(60))
    console.log(`📈 Overall: ${passedTests}/${totalTests} tests passed`)
    console.log(`⏱️  Total duration: ${totalDuration}ms`)

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Bug reproduction confirmed.')
    } else {
      console.log('⚠️  Some tests failed. Check the output above.')
      process.exit(1)
    }

    console.log('\n💡 To run individual test suites:')
    console.log('   bun run test src/__tests__/excessive-projects.test.ts')
    console.log('   bun run test src/__tests__/editor-page-integration.test.tsx')
    console.log('\n🔧 To run with coverage:')
    console.log('   bun run test:coverage')
  }
}

// CLI execution
if (import.meta.main) {
  const runner = new ExcessiveProjectsTestRunner()
  runner.runAllTests().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { ExcessiveProjectsTestRunner }
