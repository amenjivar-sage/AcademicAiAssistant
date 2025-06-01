import { MailService } from '@sendgrid/mail';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
}

export class EmailService {
  private mailService?: MailService;
  private fromEmail = 'noreply@sage-edu.app'; // Default sender email

  constructor() {
    // Only initialize SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      this.mailService = new MailService();
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('✅ Email service initialized with SendGrid');
    } else {
      console.log('📧 Email service running in preview mode (no SendGrid API key)');
    }
  }

  /**
   * Generate welcome email HTML with Sage branding
   */
  private generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    const roleText = data.role === 'student' ? 'Student' : 'Teacher';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Sage - Your Account Details</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .username-box { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .username { font-size: 24px; font-weight: bold; color: #495057; margin-bottom: 5px; }
        .instructions { background: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌟 Sage</div>
            <p>AI-Powered Academic Writing Platform</p>
        </div>
        
        <div class="content">
            <h2>Welcome, ${data.firstName}!</h2>
            
            <p>Your ${roleText} account has been successfully created on Sage, the AI-powered writing platform designed to support ethical academic learning.</p>
            
            <div class="username-box">
                <div>Your Username:</div>
                <div class="username">${data.username}</div>
                <small style="color: #6c757d;">Save this username - you'll need it to log in</small>
            </div>
            
            <div class="instructions">
                <h3>📋 How to Access Your Account:</h3>
                <ol>
                    <li>Go to the Sage platform login page</li>
                    <li>Enter either your <strong>email address</strong> (${data.email}) or your <strong>username</strong> (${data.username})</li>
                    <li>Use the password you created during registration</li>
                </ol>
            </div>
            
            <h3>🎯 What You Can Do with Sage:</h3>
            <ul>
                ${data.role === 'student' ? `
                <li><strong>Smart Writing Assistance:</strong> Get AI-powered help with grammar, style, and structure</li>
                <li><strong>Assignment Submissions:</strong> Complete and submit writing assignments with built-in feedback</li>
                <li><strong>Progress Tracking:</strong> Monitor your writing improvement over time</li>
                <li><strong>Citation Help:</strong> Receive guidance on proper academic citations</li>
                ` : `
                <li><strong>Assignment Management:</strong> Create and manage writing assignments for your students</li>
                <li><strong>AI Feature Control:</strong> Customize which AI tools students can access</li>
                <li><strong>Student Progress:</strong> Monitor student writing development and engagement</li>
                <li><strong>Classroom Organization:</strong> Organize students into classes and track submissions</li>
                `}
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">Access Sage Platform</a>
            </div>
            
            <p><strong>Need Help?</strong> If you have any questions or need assistance, our support team is here to help you get the most out of Sage.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent because an account was created for ${data.email} on the Sage platform.</p>
            <p>Sage - Empowering Ethical Academic Writing with AI</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Send welcome email with username to new user
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; message: string; emailContent?: string }> {
    const subject = `Welcome to Sage - Your Username is ${data.username}`;
    const htmlContent = this.generateWelcomeEmailHTML(data);
    
    // Always log the email for debugging/manual sending
    console.log('\n📧 EMAIL GENERATED:');
    console.log('To:', data.email);
    console.log('Subject:', subject);
    console.log('Username:', data.username);
    console.log('Role:', data.role);
    
    if (this.mailService) {
      try {
        await this.mailService.send({
          to: data.email,
          from: this.fromEmail,
          subject: subject,
          html: htmlContent,
        });
        
        console.log('✅ Welcome email sent successfully to', data.email);
        return { 
          success: true, 
          message: 'Welcome email sent successfully',
          emailContent: htmlContent
        };
      } catch (error) {
        console.error('❌ Failed to send email:', error);
        return { 
          success: false, 
          message: 'Failed to send email - saved for manual delivery',
          emailContent: htmlContent
        };
      }
    } else {
      // No SendGrid - save email content for preview
      console.log('📧 Email ready to send (add SendGrid API key to enable automatic delivery)');
      return { 
        success: true, 
        message: 'Email generated successfully - ready for delivery when SendGrid is configured',
        emailContent: htmlContent
      };
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return !!this.mailService;
  }
}

export const emailService = new EmailService();