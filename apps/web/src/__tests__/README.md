# Test Suite: Excessive Project Creation Bug

This test suite provides comprehensive testing for the excessive project creation bug reported in [GitHub Issue #182](https://github.com/OpenCut-app/OpenCut/issues/182).

## Overview

The bug occurs when users navigate to invalid project IDs (e.g., via browser back button or direct URL access), causing the editor page to create multiple "Untitled Project" entries due to race conditions in React useEffect dependencies.

## Test Files

### 1. `excessive-projects.test.ts`
**Unit tests** that test the core logic extracted from the editor page component.

**Test Coverage:**
- ✅ Single invalid project ID handling
- ✅ Race condition scenarios
- ✅ React Strict Mode double execution
- ✅ Error handling for different failure types
- ✅ Stress testing (simulating 885 projects)
- ✅ Bug validation and reproduction steps

### 2. `editor-page-integration.test.tsx`
**Integration tests** that test the actual React component behavior.

**Test Coverage:**
- ✅ Component rendering with invalid project IDs
- ✅ Duplicate project prevention
- ✅ Rapid re-render handling
- ✅ Multiple invalid ID scenarios

### 3. `setup.ts`
Test environment setup with mocks for:
- Next.js router
- IndexedDB
- OPFS (Origin Private File System)
- Console output suppression

## Running Tests

### Command Line (like `cargo test`)

```bash
# Run all tests
bun run test

# Run only excessive projects tests
bun run test:excessive-projects

# Run with coverage
bun run test:coverage

# Run with UI
bun run test:ui

# Run specific test file
bun run test src/__tests__/excessive-projects.test.ts

# Run with verbose output
VITEST_VERBOSE=1 bun run test
```

### Using the CLI Test Runner

```bash
# Run comprehensive test suite
bun run scripts/test-excessive-projects.ts

# Or use the npm script
bun run test:excessive-projects
```

## Test Results Interpretation

### Expected Behavior (Bug Reproduction)
- ✅ **Single invalid ID** → Creates exactly 1 project
- ✅ **Multiple invalid IDs** → Creates 1 project per unique ID
- ✅ **Race conditions** → Prevented by handledProjectIds mechanism
- ✅ **React Strict Mode** → No duplicate creation despite double execution

### Bug Indicators
- ❌ **Multiple projects from single invalid ID** → Race condition bug
- ❌ **Exponential project growth** → handledProjectIds mechanism failing
- ❌ **Projects created on every navigation** → Error handling too broad

## Continuous Integration

Tests are automatically run in CI/CD pipeline:
- GitHub Actions workflow: `.github/workflows/bun-ci.yml`
- Runs on: Ubuntu, Windows, macOS
- Triggers: Push to main, Pull requests

## Test Environment

**Framework:** Vitest + Testing Library
**Mocking:** Vi (Vitest's built-in mocking)
**Coverage:** V8 provider
**Environment:** jsdom (simulates browser environment)

## Debugging Tests

### Enable Verbose Logging
```bash
VITEST_VERBOSE=1 bun run test
```

### Run Single Test
```bash
bun run test -t "should create exactly one project"
```

### Debug Mode
```bash
bun run test --inspect-brk
```

## Adding New Tests

1. **Unit Tests**: Add to `excessive-projects.test.ts`
   - Test core logic and edge cases
   - Mock external dependencies

2. **Integration Tests**: Add to `editor-page-integration.test.tsx`
   - Test component behavior
   - Test React lifecycle interactions

3. **Follow Naming Convention**:
   ```typescript
   describe('Feature Area', () => {
     it('should do something specific', async () => {
       // Test implementation
     })
   })
   ```

## Performance Testing

The test suite includes performance measurements:
- Project creation timing
- Memory usage tracking
- Stress test scenarios

Example output:
```
Created 100 projects in 1250ms
Average: 12.5ms per project
```

## Bug Fix Validation

After implementing the fix:

1. **Run full test suite**: `bun run test`
2. **Verify no regressions**: All existing tests should pass
3. **Validate fix effectiveness**: Bug reproduction tests should show controlled behavior
4. **Performance check**: Ensure no performance degradation

## Contributing

When adding tests:
- ✅ Include both positive and negative test cases
- ✅ Test edge cases and error conditions
- ✅ Add performance considerations for stress tests
- ✅ Update this README if adding new test categories
- ✅ Ensure tests are deterministic and not flaky
