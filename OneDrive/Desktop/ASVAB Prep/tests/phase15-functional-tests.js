/**
 * Phase 15 Functional Testing Suite
 * Comprehensive testing for all Launch & Growth components
 */

// Test Analytics System
function testAnalyticsSystem() {
  console.log('\n🔍 TESTING ANALYTICS SYSTEM...');
  
  try {
    // Load the analytics system (simulating browser environment)
    const ASVABBusinessIntelligence = require('../analytics/business-intelligence-dashboard.js');
    
    // Test 1: System initialization
    const analytics = new ASVABBusinessIntelligence();
    console.log('✅ Analytics system initializes successfully');
    
    // Test 2: Metrics initialization
    const hasUserMetrics = analytics.metrics.has('userAcquisition');
    const hasMilitaryMetrics = analytics.metrics.has('military');
    const hasBusinessMetrics = analytics.metrics.has('business');
    
    if (hasUserMetrics && hasMilitaryMetrics && hasBusinessMetrics) {
      console.log('✅ All core metrics categories initialized');
    } else {
      throw new Error('Missing core metrics categories');
    }
    
    // Test 3: Military branch tracking
    const userAcq = analytics.metrics.get('userAcquisition');
    const branchCount = Object.keys(userAcq.byMilitaryBranch).length;
    
    if (branchCount === 6) {
      console.log('✅ All 6 military branches tracked in user acquisition');
    } else {
      throw new Error(`Expected 6 military branches, found ${branchCount}`);
    }
    
    // Test 4: Dashboard generation
    const dashboard = analytics.generateDashboard();
    const hasOverview = dashboard.overview;
    const hasMilitary = dashboard.military;
    const hasAlerts = dashboard.alerts;
    
    if (hasOverview && hasMilitary && hasAlerts) {
      console.log('✅ Dashboard generates all required sections');
    } else {
      throw new Error('Dashboard missing required sections');
    }
    
    // Test 5: Export functionality
    const exportData = analytics.exportMetrics('json');
    if (exportData && typeof exportData === 'string') {
      console.log('✅ Data export functionality working');
    } else {
      throw new Error('Export functionality failed');
    }
    
    console.log('🎖️ ANALYTICS SYSTEM: ALL TESTS PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Analytics System Test Failed:', error.message);
    return false;
  }
}

// Test Revenue Optimization System
function testRevenueSystem() {
  console.log('\n💰 TESTING REVENUE OPTIMIZATION SYSTEM...');
  
  try {
    const ASVABRevenueOptimization = require('../revenue/revenue-optimization-system.js');
    
    // Test 1: System initialization
    const revenue = new ASVABRevenueOptimization();
    console.log('✅ Revenue system initializes successfully');
    
    // Test 2: Pricing tiers
    const hasRecruit = revenue.pricingTiers.has('recruit');
    const hasWarrior = revenue.pricingTiers.has('warrior');
    const hasCommander = revenue.pricingTiers.has('commander');
    const hasFamily = revenue.pricingTiers.has('family');
    
    if (hasRecruit && hasWarrior && hasCommander && hasFamily) {
      console.log('✅ All pricing tiers configured');
    } else {
      throw new Error('Missing pricing tiers');
    }
    
    // Test 3: Military discounts
    const hasActiveDuty = revenue.militaryDiscounts.has('activeDuty');
    const hasVeteran = revenue.militaryDiscounts.has('veteran');
    const hasSpouse = revenue.militaryDiscounts.has('militarySpouse');
    
    if (hasActiveDuty && hasVeteran && hasSpouse) {
      console.log('✅ Military discount system configured');
    } else {
      throw new Error('Missing military discounts');
    }
    
    // Test 4: Revenue streams
    const streamCount = revenue.revenueStreams.size;
    if (streamCount >= 5) {
      console.log('✅ Multiple revenue streams configured');
    } else {
      throw new Error(`Insufficient revenue streams: ${streamCount}`);
    }
    
    // Test 5: Pricing optimization
    const testUser = {
      isActiveDuty: true,
      isVeteran: false,
      isSpouse: false
    };
    const optimizedPricing = revenue.optimizePricing('warrior', testUser, 'US', 0.5);
    
    if (optimizedPricing && optimizedPricing.savings > 0) {
      console.log('✅ Dynamic pricing optimization working');
    } else {
      throw new Error('Pricing optimization failed');
    }
    
    // Test 6: Revenue forecasting
    const forecast = revenue.forecastRevenue(12, { militaryBudget: 1.0 });
    if (forecast && forecast.forecast && forecast.forecast.length === 12) {
      console.log('✅ Revenue forecasting functional');
    } else {
      throw new Error('Revenue forecasting failed');
    }
    
    console.log('🎖️ REVENUE SYSTEM: ALL TESTS PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Revenue System Test Failed:', error.message);
    return false;
  }
}

// Test Community System
function testCommunitySystem() {
  console.log('\n🤝 TESTING COMMUNITY SYSTEM...');
  
  try {
    const ASVABMilitaryCommunity = require('../community/military-community-system.js');
    
    // Test 1: System initialization
    const community = new ASVABMilitaryCommunity();
    console.log('✅ Community system initializes successfully');
    
    // Test 2: Military branch communities
    const branchCount = community.communityGroups.size;
    if (branchCount === 6) {
      console.log('✅ All 6 military branch communities configured');
    } else {
      throw new Error(`Expected 6 branches, found ${branchCount}`);
    }
    
    // Test 3: Study groups
    const studyGroupCount = community.studyGroups.size;
    if (studyGroupCount >= 5) {
      console.log('✅ Multiple study group types configured');
    } else {
      throw new Error(`Insufficient study groups: ${studyGroupCount}`);
    }
    
    // Test 4: Mentorship programs
    const mentorshipCount = community.mentorshipPrograms.size;
    if (mentorshipCount >= 3) {
      console.log('✅ Mentorship programs configured');
    } else {
      throw new Error(`Insufficient mentorship programs: ${mentorshipCount}`);
    }
    
    // Test 5: Gamification system
    const gamificationCount = community.gamificationSystem.size;
    if (gamificationCount >= 3) {
      console.log('✅ Gamification systems configured');
    } else {
      throw new Error(`Insufficient gamification systems: ${gamificationCount}`);
    }
    
    // Test 6: Study group creation
    const testCreator = {
      militaryBranch: 'ARMY',
      id: 'test_user_001'
    };
    const testConfig = {
      name: 'Test Math Group',
      subject: 'Mathematics',
      capacity: 15,
      schedule: 'Daily 7PM EST',
      militaryFocus: 'Military math applications'
    };
    
    const studyGroup = community.createStudyGroup(testCreator, testConfig);
    if (studyGroup && studyGroup.name === 'Test Math Group') {
      console.log('✅ Study group creation functional');
    } else {
      throw new Error('Study group creation failed');
    }
    
    console.log('🎖️ COMMUNITY SYSTEM: ALL TESTS PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Community System Test Failed:', error.message);
    return false;
  }
}

// Test Partnership Framework
function testPartnershipFramework() {
  console.log('\n🤝 TESTING PARTNERSHIP FRAMEWORK...');
  
  try {
    const ASVABMilitaryPartnerships = require('../partnerships/military-partnership-framework.js');
    
    // Test 1: System initialization
    const partnerships = new ASVABMilitaryPartnerships();
    console.log('✅ Partnership framework initializes successfully');
    
    // Test 2: Partnership types
    const partnershipTypeCount = partnerships.partnershipTypes.size;
    if (partnershipTypeCount >= 5) {
      console.log('✅ Multiple partnership types configured');
    } else {
      throw new Error(`Insufficient partnership types: ${partnershipTypeCount}`);
    }
    
    // Test 3: Military base catalog
    const baseCount = partnerships.militaryBases.size;
    if (baseCount >= 5) {
      console.log('✅ Military base catalog populated');
    } else {
      throw new Error(`Insufficient military bases: ${baseCount}`);
    }
    
    // Test 4: Contractor identification
    const contractorCount = partnerships.contractors.size;
    if (contractorCount >= 4) {
      console.log('✅ Defense contractor database populated');
    } else {
      throw new Error(`Insufficient contractors: ${contractorCount}`);
    }
    
    // Test 5: Partnership development
    const testProposal = {
      name: 'Test Military Base Partnership',
      type: 'pilot_program',
      duration: '3 months',
      personnel: 1000
    };
    
    const partnership = partnerships.developPartnership('military_base', 'Test Base', testProposal);
    if (partnership && partnership.type === 'military_base') {
      console.log('✅ Partnership development workflow functional');
    } else {
      throw new Error('Partnership development failed');
    }
    
    // Test 6: Revenue calculation
    const revenueCalc = partnerships.calculatePartnershipRevenue('military_base', { personnel: 1000 });
    if (revenueCalc && revenueCalc.annualRevenue > 0) {
      console.log('✅ Partnership revenue calculation functional');
    } else {
      throw new Error('Revenue calculation failed');
    }
    
    console.log('🎖️ PARTNERSHIP FRAMEWORK: ALL TESTS PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Partnership Framework Test Failed:', error.message);
    return false;
  }
}

// Test Continuous Improvement System
function testImprovementSystem() {
  console.log('\n🔄 TESTING CONTINUOUS IMPROVEMENT SYSTEM...');
  
  try {
    const ASVABContinuousImprovement = require('../improvement/continuous-improvement-system.js');
    
    // Test 1: System initialization
    const improvement = new ASVABContinuousImprovement();
    console.log('✅ Improvement system initializes successfully');
    
    // Test 2: Improvement areas
    const improvementAreaCount = improvement.improvementAreas.size;
    if (improvementAreaCount >= 4) {
      console.log('✅ Multiple improvement areas configured');
    } else {
      throw new Error(`Insufficient improvement areas: ${improvementAreaCount}`);
    }
    
    // Test 3: Feedback system
    const feedbackSystemCount = improvement.userFeedbackSystem.size;
    if (feedbackSystemCount >= 3) {
      console.log('✅ User feedback system configured');
    } else {
      throw new Error(`Insufficient feedback systems: ${feedbackSystemCount}`);
    }
    
    // Test 4: Feature pipeline
    const featurePipelineCount = improvement.featurePipeline.size;
    if (featurePipelineCount >= 3) {
      console.log('✅ Feature development pipeline configured');
    } else {
      throw new Error(`Insufficient pipeline stages: ${featurePipelineCount}`);
    }
    
    // Test 5: Quality assurance
    const qaCount = improvement.qualityAssurance.size;
    if (qaCount >= 2) {
      console.log('✅ Quality assurance framework configured');
    } else {
      throw new Error(`Insufficient QA framework: ${qaCount}`);
    }
    
    // Test 6: Innovation labs
    const labCount = improvement.innovationLabs.size;
    if (labCount >= 3) {
      console.log('✅ Innovation laboratory network configured');
    } else {
      throw new Error(`Insufficient innovation labs: ${labCount}`);
    }
    
    // Test 7: Improvement cycle
    const improvementCycle = improvement.executeContinuousImprovement();
    if (improvementCycle && improvementCycle.plan && improvementCycle.do && improvementCycle.check && improvementCycle.act) {
      console.log('✅ PDCA improvement cycle functional');
    } else {
      throw new Error('Improvement cycle execution failed');
    }
    
    console.log('🎖️ IMPROVEMENT SYSTEM: ALL TESTS PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Improvement System Test Failed:', error.message);
    return false;
  }
}

// Test HTML Dashboard Integrity
function testHTMLDashboard() {
  console.log('\n📊 TESTING HTML DASHBOARD INTEGRITY...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Test 1: File exists and readable
    const dashboardPath = path.join(__dirname, '../analytics/dashboard.html');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    console.log('✅ Dashboard HTML file readable');
    
    // Test 2: Basic HTML structure
    const hasDoctype = dashboardContent.includes('<!DOCTYPE html>');
    const hasHTML = dashboardContent.includes('<html');
    const hasHead = dashboardContent.includes('<head>');
    const hasBody = dashboardContent.includes('<body>');
    
    if (hasDoctype && hasHTML && hasHead && hasBody) {
      console.log('✅ Valid HTML5 structure');
    } else {
      throw new Error('Invalid HTML structure');
    }
    
    // Test 3: Military theming elements
    const hasMilitaryTitle = dashboardContent.includes('Military Command Dashboard');
    const hasMilitaryEmoji = dashboardContent.includes('🎖️');
    const hasMilitaryColors = dashboardContent.includes('#ffd700'); // Military gold
    
    if (hasMilitaryTitle && hasMilitaryEmoji && hasMilitaryColors) {
      console.log('✅ Military theming elements present');
    } else {
      throw new Error('Missing military theming elements');
    }
    
    // Test 4: JavaScript integration
    const hasScriptTag = dashboardContent.includes('<script src="business-intelligence-dashboard.js">');
    const hasJSFunction = dashboardContent.includes('refreshDashboard()');
    
    if (hasScriptTag && hasJSFunction) {
      console.log('✅ JavaScript integration configured');
    } else {
      throw new Error('JavaScript integration missing');
    }
    
    // Test 5: Export functionality
    const hasExportButtons = dashboardContent.includes('Export JSON') && 
                             dashboardContent.includes('Export CSV') && 
                             dashboardContent.includes('Export Excel');
    
    if (hasExportButtons) {
      console.log('✅ Export functionality UI present');
    } else {
      throw new Error('Export functionality UI missing');
    }
    
    console.log('🎖️ HTML DASHBOARD: ALL TESTS PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ HTML Dashboard Test Failed:', error.message);
    return false;
  }
}

// Test Integration Configuration
function testIntegrationConfig() {
  console.log('\n⚙️ TESTING INTEGRATION CONFIGURATION...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Test 1: Analytics integration file exists
    const configPath = path.join(__dirname, '../analytics/analytics-integration.yml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    console.log('✅ Integration configuration file readable');
    
    // Test 2: Key configuration sections
    const hasAnalyticsConfig = configContent.includes('analytics:');
    const hasIntegrationConfig = configContent.includes('integration:');
    const hasSecurityConfig = configContent.includes('security:');
    
    if (hasAnalyticsConfig && hasIntegrationConfig && hasSecurityConfig) {
      console.log('✅ All major configuration sections present');
    } else {
      throw new Error('Missing configuration sections');
    }
    
    // Test 3: Military-specific metrics
    const hasMilitaryMetrics = configContent.includes('military_user_registrations') &&
                              configContent.includes('asvab_score_improvements') &&
                              configContent.includes('military_partnership_value');
    
    if (hasMilitaryMetrics) {
      console.log('✅ Military-specific metrics configured');
    } else {
      throw new Error('Missing military-specific metrics');
    }
    
    // Test 4: Prometheus integration
    const hasPrometheus = configContent.includes('prometheus:') &&
                         configContent.includes('endpoint: "http://prometheus:9090"');
    
    if (hasPrometheus) {
      console.log('✅ Prometheus integration configured');
    } else {
      throw new Error('Prometheus integration missing');
    }
    
    // Test 5: Grafana integration
    const hasGrafana = configContent.includes('grafana:') &&
                      configContent.includes('endpoint: "http://grafana:3000"');
    
    if (hasGrafana) {
      console.log('✅ Grafana integration configured');
    } else {
      throw new Error('Grafana integration missing');
    }
    
    console.log('🎖️ INTEGRATION CONFIG: ALL TESTS PASSED');
    return true;
    
  } catch (error) {
    console.error('❌ Integration Config Test Failed:', error.message);
    return false;
  }
}

// Main test runner
function runPhase15Tests() {
  console.log('🎖️ PHASE 15 FUNCTIONAL TESTING SUITE');
  console.log('=====================================');
  console.log('Testing all Launch & Growth components for 100% functionality...\n');
  
  const results = {
    analytics: false,
    revenue: false,
    community: false,
    partnerships: false,
    improvement: false,
    dashboard: false,
    integration: false
  };
  
  // Run all tests
  results.analytics = testAnalyticsSystem();
  results.revenue = testRevenueSystem();
  results.community = testCommunitySystem();
  results.partnerships = testPartnershipFramework();
  results.improvement = testImprovementSystem();
  results.dashboard = testHTMLDashboard();
  results.integration = testIntegrationConfig();
  
  // Calculate overall results
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result === true).length;
  const successRate = (passedTests / totalTests) * 100;
  
  console.log('\n🎖️ PHASE 15 TEST RESULTS SUMMARY');
  console.log('=================================');
  console.log(`✅ Analytics System: ${results.analytics ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Revenue Optimization: ${results.revenue ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Community System: ${results.community ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Partnership Framework: ${results.partnerships ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Improvement Pipeline: ${results.improvement ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ HTML Dashboard: ${results.dashboard ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Integration Config: ${results.integration ? 'PASSED' : 'FAILED'}`);
  
  console.log(`\n📊 OVERALL SUCCESS RATE: ${successRate}%`);
  console.log(`🎯 TESTS PASSED: ${passedTests}/${totalTests}`);
  
  if (successRate === 100) {
    console.log('\n🏆 PHASE 15: 100% FUNCTIONAL - READY FOR DEPLOYMENT!');
    console.log('🎖️ All Launch & Growth components tested and validated!');
    console.log('🚀 Military-grade launch systems are GO for production!');
  } else {
    console.log('\n⚠️  PHASE 15: Some components require attention before deployment.');
    console.log('🔧 Please review failed tests and resolve issues.');
  }
  
  return successRate === 100;
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAnalyticsSystem,
    testRevenueSystem,
    testCommunitySystem,
    testPartnershipFramework,
    testImprovementSystem,
    testHTMLDashboard,
    testIntegrationConfig,
    runPhase15Tests
  };
}

// Run tests if called directly
if (require.main === module) {
  runPhase15Tests();
}