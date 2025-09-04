#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('📊 COMPREHENSIVE TEST SUMMARY\n');
console.log('=' .repeat(60));

// Run tests with JSON reporter
try {
  console.log('⏳ Running all tests...\n');
  
  const result = execSync('npx playwright test --reporter=json 2>/dev/null', {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  });
  
  const data = JSON.parse(result);
  
  // Calculate totals
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  
  // Group by spec file
  const specSummary = {};
  
  data.suites.forEach(suite => {
    suite.specs.forEach(spec => {
      const fileName = spec.file.split('/').pop();
      
      if (!specSummary[fileName]) {
        specSummary[fileName] = {
          passed: 0,
          failed: 0,
          skipped: 0,
          flaky: 0,
          total: 0,
          failures: []
        };
      }
      
      spec.tests.forEach(test => {
        test.results.forEach(result => {
          totalTests++;
          specSummary[fileName].total++;
          
          switch(result.status) {
            case 'passed':
              passed++;
              specSummary[fileName].passed++;
              break;
            case 'failed':
              failed++;
              specSummary[fileName].failed++;
              specSummary[fileName].failures.push(test.title);
              break;
            case 'skipped':
              skipped++;
              specSummary[fileName].skipped++;
              break;
            case 'flaky':
              flaky++;
              specSummary[fileName].flaky++;
              break;
          }
        });
      });
    });
  });
  
  // Print summary
  console.log('OVERALL RESULTS:');
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  ✅ Passed: ${passed} (${((passed/totalTests)*100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${failed} (${((failed/totalTests)*100).toFixed(1)}%)`);
  if (skipped > 0) console.log(`  ⏭️ Skipped: ${skipped}`);
  if (flaky > 0) console.log(`  ⚠️ Flaky: ${flaky}`);
  console.log();
  
  // Print per-file summary
  console.log('PER TEST FILE:');
  console.log('-'.repeat(60));
  
  Object.entries(specSummary).sort((a, b) => b[1].failed - a[1].failed).forEach(([file, stats]) => {
    const status = stats.failed === 0 ? '✅' : '❌';
    const passRate = ((stats.passed/stats.total)*100).toFixed(0);
    console.log(`${status} ${file.padEnd(35)} ${stats.passed}/${stats.total} (${passRate}%)`);
    
    // Show failures if any
    if (stats.failures.length > 0 && stats.failures.length <= 3) {
      stats.failures.forEach(failure => {
        console.log(`     ↳ ${failure.substring(0, 50)}...`);
      });
    } else if (stats.failures.length > 3) {
      console.log(`     ↳ ${stats.failures.length} test failures`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  // Failure categories
  if (failed > 0) {
    console.log('\n🔍 FAILURE ANALYSIS:');
    
    const failurePatterns = {
      'Authentication': 0,
      'Navigation': 0,
      'Modal/UI': 0,
      'Timeout': 0,
      'Other': 0
    };
    
    data.suites.forEach(suite => {
      suite.specs.forEach(spec => {
        spec.tests.forEach(test => {
          test.results.forEach(result => {
            if (result.status === 'failed' && result.error) {
              const error = result.error.message || '';
              if (error.includes('Login failed') || error.includes('not redirected')) {
                failurePatterns['Authentication']++;
              } else if (error.includes('URL') || error.includes('navigation')) {
                failurePatterns['Navigation']++;
              } else if (error.includes('modal') || error.includes('toBeVisible')) {
                failurePatterns['Modal/UI']++;
              } else if (error.includes('timeout') || error.includes('Timeout')) {
                failurePatterns['Timeout']++;
              } else {
                failurePatterns['Other']++;
              }
            }
          });
        });
      });
    });
    
    Object.entries(failurePatterns).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`  ${category}: ${count} failures`);
      }
    });
  }
  
  // Exit code
  process.exit(failed > 0 ? 1 : 0);
  
} catch (error) {
  console.error('❌ Error running tests:', error.message);
  
  // Fallback to simple summary
  console.log('\n📋 FALLBACK: Running simple test count...\n');
  
  try {
    const output = execSync('npx playwright test --reporter=list 2>&1', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    
    lines.forEach(line => {
      if (line.includes('✓') || line.includes('✅')) passed++;
      if (line.includes('✗') || line.includes('❌') || line.includes('×')) failed++;
    });
    
    console.log(`Estimated Results:`);
    console.log(`  ✅ Passed: ~${passed}`);
    console.log(`  ❌ Failed: ~${failed}`);
    console.log(`  Total: ~${passed + failed}`);
    
  } catch (fallbackError) {
    console.error('Could not generate summary');
  }
}