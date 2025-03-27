// Small test script we can run to verify if our function works
import { getInviterInfo } from './client/src/lib/invitation-handler';

async function testGetInviterInfo() {
  // Test with a UUID-like ID
  console.log("Testing with UUID-like ID:");
  const uuidResult = await getInviterInfo('c937809d-2b4b-49bb-a38b-b78aca1dae41');
  console.log("UUID Result:", uuidResult);
  
  // Test with a numeric ID
  console.log("\nTesting with numeric ID:");
  const numericResult = await getInviterInfo('123');
  console.log("Numeric Result:", numericResult);
  
  // Test with an invalid ID
  console.log("\nTesting with invalid ID:");
  const invalidResult = await getInviterInfo('invalid-id');
  console.log("Invalid Result:", invalidResult);
}

testGetInviterInfo().catch(console.error);
