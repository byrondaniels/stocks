import fetch from 'node-fetch';

async function checkYearlyStructure() {
  const endpoint = '/api/xbrl/companyconcept/CIK0002019061/us-gaap/DeferredTaxLiabilitiesOther.json';
  const baseUrl = 'https://data.sec.gov';
  
  try {
    const response = await fetch(baseUrl + endpoint, {
      headers: {
        'User-Agent': 'Test Script (test@example.com)'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('Full response structure:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n=== Analysis of yearly data ===');
      
      if (data.units && data.units.USD) {
        console.log(`Total data points: ${data.units.USD.length}`);
        console.log('\nData points by year:');
        
        data.units.USD.forEach((item, index) => {
          console.log(`${index + 1}. End Date: ${item.end}, Value: $${item.val?.toLocaleString() || 'N/A'}, FY: ${item.fy}, Form: ${item.form}, Filed: ${item.filed}`);
        });
        
        // Group by fiscal year
        const byYear = {};
        data.units.USD.forEach(item => {
          const fy = item.fy || 'Unknown';
          if (!byYear[fy]) byYear[fy] = [];
          byYear[fy].push(item);
        });
        
        console.log('\n=== Grouped by Fiscal Year ===');
        Object.keys(byYear).sort().forEach(year => {
          console.log(`\nFY ${year}: ${byYear[year].length} entries`);
          byYear[year].forEach(item => {
            console.log(`  - ${item.end}: $${item.val?.toLocaleString() || 'N/A'} (${item.form})`);
          });
        });
      }
      
    } else {
      console.log('Error:', response.status, await response.text());
    }
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

checkYearlyStructure();