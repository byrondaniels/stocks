import fetch from 'node-fetch';

const endpoints = [
  '/api/xbrl/companyconcept/CIK0002019061/us-gaap/DeferredTaxLiabilitiesInvestmentInNoncontrolledAffiliates.json',
  '/api/xbrl/companyconcept/CIK0002019061/us-gaap/DeferredTaxLiabilitiesOther.json',
  '/api/xbrl/companyconcept/CIK0002019061/us-gaap/DefinedBenefitPlanAccumulatedOtherComprehensiveIncomeBeforeTax.json',
  '/api/xbrl/companyconcept/CIK0002019061/us-gaap/DefinedBenefitPlanAssetsForPlanBenefitsNoncurrent.json'
];

const baseUrl = 'https://data.sec.gov';

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(baseUrl + endpoint, {
      headers: {
        'User-Agent': 'Test Script (test@example.com)'
      }
    });
    
    const data = await response.text();
    
    console.log(`\n=== ${endpoint} ===`);
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      try {
        const json = JSON.parse(data);
        console.log(`Success! Data length: ${JSON.stringify(json).length} chars`);
        console.log('Sample data:', JSON.stringify(json, null, 2).substring(0, 500) + '...');
      } catch (e) {
        console.log('Success but not JSON:', data.substring(0, 200));
      }
    } else {
      console.log(`Error: ${data.substring(0, 200)}`);
    }
    
  } catch (error) {
    console.log(`\n=== ${endpoint} ===`);
    console.log(`Error: ${error.message}`);
  }
}

async function testAll() {
  console.log('Testing XBRL endpoints for SOBO...\n');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    // Add delay to be respectful to SEC servers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testAll();