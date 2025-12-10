const fs = require('fs');
const assert = require('assert');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const projectId = `rules-test-${Date.now()}`;

async function run() {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice', email: 'alice@example.com' }).firestore();
  const admin = testEnv.unauthenticatedContext().firestore();

  // Valid write
  await assertSucceeds(alice.collection('users').doc('alice').set({ tier: 'free', dob: '1980-01-01', retirementAge: 65, currentAnnualIncome: 100000 }));

  // Invalid retirementAge (too low)
  await assertFails(alice.collection('users').doc('alice').set({ tier: 'free', retirementAge: 10 }));

  // Invalid income (negative)
  await assertFails(alice.collection('users').doc('alice').set({ tier: 'free', currentAnnualIncome: -100 }));

  // Invalid dob format
  await assertFails(alice.collection('users').doc('alice').set({ tier: 'free', dob: 'not-a-date' }));

  console.log('All Firestore rules tests ran (check results).');
  await testEnv.cleanup();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
