// Direct SendGrid test to diagnose email delivery issues
const sgMail = require('@sendgrid/mail');

async function testSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No SendGrid API key found');
    return;
  }
  
  console.log('✅ API Key exists:', apiKey.length, 'characters');
  console.log('✅ API Key prefix:', apiKey.substring(0, 15));
  
  sgMail.setApiKey(apiKey);
  
  const msg = {
    to: 'alexander.menjivar@pepperdine.edu',
    from: 'alexander.menjivar@pepperdine.edu',
    subject: 'SendGrid Test - Sage Platform',
    text: 'This is a test email from Sage platform to verify SendGrid configuration.',
    html: '<p>This is a <strong>test email</strong> from Sage platform to verify SendGrid configuration.</p>'
  };
  
  try {
    console.log('🚀 Sending test email...');
    const response = await sgMail.send(msg);
    console.log('📬 SendGrid Response:');
    console.log('- Status Code:', response[0]?.statusCode);
    console.log('- Headers:', response[0]?.headers);
    console.log('- Body:', response[0]?.body);
    
    if (response[0]?.statusCode === 202) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('⚠️ Unexpected status code:', response[0]?.statusCode);
    }
  } catch (error) {
    console.error('❌ SendGrid Error:');
    console.error('- Message:', error.message);
    console.error('- Code:', error.code);
    console.error('- Status Code:', error.response?.statusCode);
    console.error('- Response Body:', error.response?.body);
    console.error('- Full Error:', JSON.stringify(error, null, 2));
  }
}

testSendGrid();