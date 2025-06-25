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

interface PasswordResetEmailData extends WelcomeEmailData {
  temporaryPassword?: string;
}

export class EmailService {
  private mailService?: MailService;
  private fromEmail = 'alexander.menjivar@pepperdine.edu'; // Verified institutional sender email
  
  constructor() {
    this.initializeEmailService();
  }
  
  private initializeEmailService() {
    const apiKey = process.env.SENDGRID_API_KEY;
    console.log('🔍 Initializing email service...');
    console.log('🔍 API key exists:', !!apiKey);
    console.log('🔍 API key length:', apiKey?.length || 0);
    console.log('🔍 API key starts with SG.:', apiKey?.startsWith('SG.') || false);
    
    if (apiKey && apiKey.trim().startsWith('SG.')) {
      try {
        this.mailService = new MailService();
        this.mailService.setApiKey(apiKey.trim());
        console.log('✅ SendGrid email service initialized successfully');
        console.log('✅ API Key first 15 chars:', apiKey.substring(0, 15));
      } catch (error) {
        console.error('❌ Failed to initialize SendGrid:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        this.mailService = undefined;
      }
    } else {
      console.log('📧 Email service running in preview mode');
      console.log('📧 Reason: API key missing, empty, or invalid format');
      if (apiKey) {
        console.log('📧 Current API key preview:', apiKey.substring(0, 10) + '...');
      }
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
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                    <rect x="21" y="30" width="6" height="12" rx="3" fill="white"/>
                    <path d="M24 6L30 12L24 18L18 12L24 6Z" fill="white"/>
                    <path d="M12 18L18 24L12 30L6 24L12 18Z" fill="white"/>
                    <path d="M36 18L42 24L36 30L30 24L36 18Z" fill="white"/>
                    <circle cx="15" cy="15" r="3" fill="rgba(255,255,255,0.8)"/>
                    <circle cx="33" cy="15" r="3" fill="rgba(255,255,255,0.8)"/>
                    <circle cx="9" cy="27" r="2" fill="rgba(255,255,255,0.7)"/>
                    <circle cx="39" cy="27" r="2" fill="rgba(255,255,255,0.7)"/>
                </svg>
                <div class="logo">Sage</div>
            </div>
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
   * Generate password reset email HTML with Sage branding
   */
  private generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
    const roleText = data.role === 'student' ? 'Student' : 'Teacher';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sage - Username Recovery & Password Reset</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .username-box { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .username { font-size: 24px; font-weight: bold; color: #495057; margin-bottom: 5px; }
        .instructions { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .warning { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                    <rect x="21" y="30" width="6" height="12" rx="3" fill="white"/>
                    <path d="M24 6L30 12L24 18L18 12L24 6Z" fill="white"/>
                    <path d="M12 18L18 24L12 30L6 24L12 18Z" fill="white"/>
                    <path d="M36 18L42 24L36 30L30 24L36 18Z" fill="white"/>
                    <circle cx="15" cy="15" r="3" fill="rgba(255,255,255,0.8)"/>
                    <circle cx="33" cy="15" r="3" fill="rgba(255,255,255,0.8)"/>
                    <circle cx="9" cy="27" r="2" fill="rgba(255,255,255,0.7)"/>
                    <circle cx="39" cy="27" r="2" fill="rgba(255,255,255,0.7)"/>
                </svg>
                <div class="logo">Sage</div>
            </div>
            <p>AI-Powered Academic Writing Platform</p>
        </div>
        
        <div class="content">
            <h2>Username Recovery & Password Reset</h2>
            
            <p>Hello ${data.firstName},</p>
            
            <p>You requested help recovering your login credentials for your ${roleText} account on Sage.</p>
            
            <div class="username-box">
                <div>Your Username:</div>
                <div class="username">${data.username}</div>
                <small style="color: #6c757d;">Use this username to log in</small>
            </div>
            
            ${data.temporaryPassword ? `
            <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h3 style="color: #856404; margin-top: 0;">🔑 Temporary Password</h3>
                <div style="font-size: 24px; font-weight: bold; color: #856404; margin: 10px 0; font-family: monospace; background: white; padding: 10px; border-radius: 4px; border: 1px solid #ffc107;">${data.temporaryPassword}</div>
                <small style="color: #856404;">This temporary password expires in 24 hours</small>
            </div>
            ` : ''}
            
            <div class="instructions">
                <h3>🔑 How to Access Your Account:</h3>
                <ol>
                    <li>Go to the Sage platform login page</li>
                    <li>Enter either your <strong>email address</strong> (${data.email}) or your <strong>username</strong> (${data.username})</li>
                    <li>${data.temporaryPassword ? `Use your <strong>temporary password</strong> above` : `Use your existing password`}</li>
                    ${data.temporaryPassword ? `<li>You'll be prompted to create a new password on first login</li>` : ''}
                </ol>
            </div>
            
            <div class="warning">
                <h3>⚠️ Important Security Information:</h3>
                ${data.temporaryPassword ? `
                <ul style="text-align: left; margin: 10px 0;">
                    <li>This temporary password expires in 24 hours</li>
                    <li>You must change it on your first login</li>
                    <li>Do not share this password with anyone</li>
                    <li>If you did not request this reset, contact your administrator immediately</li>
                </ul>
                ` : `
                <p>If you've forgotten your password, please contact your school administrator or IT support for assistance with password reset.</p>
                `}
            </div>
            
            <h3>📚 Your Sage Account Includes:</h3>
            <ul>
                ${data.role === 'student' ? `
                <li><strong>Smart Writing Assistance:</strong> AI-powered help with grammar, style, and structure</li>
                <li><strong>Assignment Submissions:</strong> Complete and submit writing assignments</li>
                <li><strong>Progress Tracking:</strong> Monitor your writing improvement</li>
                <li><strong>Citation Help:</strong> Guidance on proper academic citations</li>
                ` : `
                <li><strong>Assignment Management:</strong> Create and manage writing assignments</li>
                <li><strong>AI Feature Control:</strong> Customize student AI tool access</li>
                <li><strong>Student Progress:</strong> Monitor student development and engagement</li>
                <li><strong>Classroom Organization:</strong> Organize students and track submissions</li>
                `}
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">Access Sage Platform</a>
            </div>
            
            <p><strong>Security Notice:</strong> If you did not request this recovery email, please contact your school administrator immediately.</p>
        </div>
        
        <div class="footer">
            <p>This recovery email was sent to ${data.email} for the Sage platform.</p>
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
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Send password reset email with username recovery
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{ success: boolean; message: string; emailContent?: string; temporaryPassword?: string }> {
    // Generate temporary password if not provided
    const temporaryPassword = data.temporaryPassword || this.generateTemporaryPassword();
    const dataWithTempPassword = { ...data, temporaryPassword };
    
    const subject = `Sage - Password Reset for ${data.firstName} ${data.lastName}`;
    const htmlContent = this.generatePasswordResetEmailHTML(dataWithTempPassword);
    
    // Always log the email for debugging/manual sending
    console.log('\n📧 PASSWORD RESET EMAIL GENERATED:');
    console.log('To:', data.email);
    console.log('Subject:', subject);
    console.log('Username:', data.username);
    console.log('Temporary Password:', temporaryPassword);
    console.log('Role:', data.role);
    
    if (this.mailService) {
      try {
        console.log('🚀 Attempting to send password reset email via SendGrid...');
        console.log('To:', data.email);
        console.log('From:', this.fromEmail);
        console.log('Subject:', subject);
        console.log('MailService exists:', !!this.mailService);
        console.log('API Key configured:', !!process.env.SENDGRID_API_KEY);
        
        const emailData = {
          to: data.email,
          from: {
            email: this.fromEmail,
            name: 'Sage Educational Platform - Pepperdine University'
          },
          subject: subject,
          html: htmlContent,
        };
        
        console.log('📤 Sending email with data:', {
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject
        });
        
        const result = await this.mailService.send(emailData);
        console.log('📬 SendGrid Response Details:');
        console.log('- Status Code:', result[0]?.statusCode);
        console.log('- Headers:', JSON.stringify(result[0]?.headers, null, 2));
        console.log('- Body:', JSON.stringify(result[0]?.body, null, 2));
        console.log('- Message ID:', result[0]?.headers?.['x-message-id']);
        
        if (result[0]?.statusCode === 202) {
          console.log('✅ Email queued successfully by SendGrid');
        } else {
          console.log('⚠️ Unexpected status code from SendGrid:', result[0]?.statusCode);
        }
        
        console.log('✅ Password reset email sent successfully to', data.email);
        return { 
          success: true, 
          message: 'Password reset email sent successfully',
          emailContent: htmlContent,
          temporaryPassword
        };
      } catch (error) {
        console.error('❌ SendGrid error details:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error response body:', error.response?.body);
        
        // Check for sender verification error specifically
        if (error.code === 403 && error.response?.body?.errors?.[0]?.message?.includes('verified Sender Identity')) {
          console.error('🚨 SENDER VERIFICATION REQUIRED:');
          console.error('   Go to SendGrid Dashboard > Settings > Sender Authentication');
          console.error('   Click "Verify a Single Sender" and verify:', this.fromEmail);
          console.error('   Check your email for verification link');
        }
        
        return { 
          success: false, 
          message: 'Email configuration issue - password reset saved',
          emailContent: htmlContent,
          temporaryPassword,
          error: {
            needsVerification: error.code === 403,
            message: error.message
          }
        };
      }
    } else {
      // No SendGrid - save email content for preview
      console.log('📧 Password reset email ready to send (add SendGrid API key to enable automatic delivery)');
      console.log('📧 SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      console.log('📧 MailService initialized:', !!this.mailService);
      console.log('📧 Environment check:', {
        hasApiKey: !!process.env.SENDGRID_API_KEY,
        apiKeyLength: process.env.SENDGRID_API_KEY?.length || 0,
        mailServiceExists: !!this.mailService
      });
      return { 
        success: true, 
        message: 'Password reset email generated successfully - ready for delivery when SendGrid is configured',
        emailContent: htmlContent,
        temporaryPassword
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

// Create and export email service instance
export const emailService = new EmailService();