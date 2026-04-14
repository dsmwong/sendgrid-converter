const twilio_version = require('twilio/package.json').version;

exports.handler = async function(context, event, callback) {

  console.log(`Entered ${context.PATH} node version ${process.version} twilio version ${twilio_version}`);

  try {
    const SendGridProvider = require(Runtime.getAssets()['/providers/email/sendgrid.js'].path);
    const emailProvider = new SendGridProvider(context.SENDGRID_API_KEY, context.SENDER_EMAIL);

    const parsed = emailProvider.parseInbound(event);
    console.log('Parsed inbound email:', parsed);

    await emailProvider.send(
      parsed.fromEmail,
      `We received your email with subject "${parsed.subject}". This is a validation test.`,
      'Validation Test: Email Received'
    );

    console.log(`Validation email sent to ${parsed.fromEmail}`);
    callback(null, { success: true, message: `Validation email sent to ${parsed.fromEmail}` });
  } catch (error) {
    console.error('Error in test-endpoint:', error);
    callback(error);
  }
};