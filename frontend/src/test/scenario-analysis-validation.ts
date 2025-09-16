/**
 * @fileOverview Test file to validate the scenario-based analysis implementation
 * This file tests the integration of scenario grouping, penalty calculation, and scenario analysis
 */

import { groupEntriesByScenario, calculatePenaltyScore, isFollowUpQuestion } from '@/lib/scenario-grouping-utils';
import type { ConversationEntry } from '@/types';

// Test data that mimics real SJT submission data
const testEntries: ConversationEntry[] = [
  {
    question: "How would you handle this team conflict?",
    answer: "I would approach the situation by first understanding both perspectives.",
    situation: "Your team members Sarah and John have been arguing about project priorities. The deadline is approaching, and tension is affecting the whole team's productivity.",
    bestResponseRationale: "Demonstrates conflict resolution, empathy, and leadership skills",
    worstResponseRationale: "Ignores the conflict or takes sides without understanding",
    assessedCompetency: "Conflict Resolution, Leadership",
    followUpGenerated: false
  },
  {
    question: "What specific steps would you take to resolve this conflict?",
    answer: "I would schedule individual meetings with both Sarah and John to understand their concerns.",
    situation: "Your team members Sarah and John have been arguing about project priorities. The deadline is approaching, and tension is affecting the whole team's productivity.",
    bestResponseRationale: "Demonstrates conflict resolution, empathy, and leadership skills",
    worstResponseRationale: "Ignores the conflict or takes sides without understanding",
    assessedCompetency: "Conflict Resolution, Leadership",
    followUpGenerated: true
  },
  {
    question: "How would you prioritize tasks in a high-pressure environment?",
    answer: "I would assess the impact and urgency of each task to create a priority matrix.",
    situation: "Multiple urgent projects have landed on your desk simultaneously, and stakeholders are demanding immediate attention to their respective initiatives.",
    bestResponseRationale: "Shows systematic thinking, prioritization skills, and stakeholder management",
    worstResponseRationale: "Panics, works randomly, or delegates without planning",
    assessedCompetency: "Time Management, Decision Making",
    followUpGenerated: false
  }
];

function testScenarioGrouping() {
  console.log('\n🧪 Testing Scenario Grouping...');
  
  const groups = groupEntriesByScenario(testEntries);
  
  console.log(`📊 Found ${groups.size} scenario groups:`);
  groups.forEach((entries, scenarioKey) => {
    console.log(`  - "${scenarioKey}": ${entries.length} entries`);
    entries.forEach((entry, index) => {
      console.log(`    ${index + 1}. ${entry.question.substring(0, 50)}... (Follow-up: ${entry.isFollowUp})`);
    });
  });
  
  // Validate that we get the expected grouping
  const expectedGroups = 2; // Two different situations
  if (groups.size === expectedGroups) {
    console.log('✅ Scenario grouping successful');
  } else {
    console.log(`❌ Expected ${expectedGroups} groups, got ${groups.size}`);
  }
}

function testPenaltyCalculation() {
  console.log('\n🧪 Testing Penalty Calculation...');
  
  const testScores = [
    { score: 8, isFollowUp: false, penalty: 20 },
    { score: 8, isFollowUp: true, penalty: 20 },
    { score: 6, isFollowUp: true, penalty: 15 },
    { score: 4, isFollowUp: false, penalty: 10 }
  ];
  
  testScores.forEach(test => {
    const result = calculatePenaltyScore(test.score, test.isFollowUp, test.penalty);
    console.log(`📊 Score: ${test.score}, Follow-up: ${test.isFollowUp}, Penalty: ${test.penalty}%`);
    console.log(`   Pre-penalty: ${result.prePenaltyScore}, Post-penalty: ${result.postPenaltyScore.toFixed(1)}`);
    
    // Validate calculations
    const expectedPostPenalty = test.isFollowUp ? 
      test.score * (1 - test.penalty / 100) : 
      test.score;
    
    if (Math.abs(result.postPenaltyScore - expectedPostPenalty) < 0.01) {
      console.log('   ✅ Penalty calculation correct');
    } else {
      console.log(`   ❌ Expected ${expectedPostPenalty}, got ${result.postPenaltyScore}`);
    }
  });
}

function testFollowUpDetection() {
  console.log('\n🧪 Testing Follow-up Detection...');
  
  testEntries.forEach((entry, index) => {
    const isFollowUp = isFollowUpQuestion(entry, testEntries, index);
    console.log(`📋 Entry ${index + 1}: "${entry.question.substring(0, 40)}..."`);
    console.log(`   Detected as follow-up: ${isFollowUp}`);
    console.log(`   Explicit flag: ${entry.followUpGenerated}`);
    
    // For our test data, entry 1 (index 1) should be detected as follow-up
    if (index === 1 && isFollowUp) {
      console.log('   ✅ Follow-up detection correct');
    } else if (index !== 1 && !isFollowUp) {
      console.log('   ✅ Non-follow-up detection correct');
    } else {
      console.log('   ⚠️ Detection differs from expected');
    }
  });
}

// Run all tests
export function runValidationTests() {
  console.log('🚀 Starting Scenario-Based Analysis Validation Tests...');
  
  testScenarioGrouping();
  testPenaltyCalculation();
  testFollowUpDetection();
  
  console.log('\n✅ All tests completed. Check output above for results.');
}

// Export test data for other tests
export { testEntries };
