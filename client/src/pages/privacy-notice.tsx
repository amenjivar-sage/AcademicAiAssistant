import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sage Privacy Notice</h1>
            <p className="text-gray-600">Effective Date: June 16, 2025</p>
          </div>
        </div>

        {/* Privacy Notice Content */}
        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-8">
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed">
                At Sage, we are committed to protecting your privacy and ensuring that your data is handled in a secure, transparent, and responsible way.
              </p>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Information We Collect</h2>
                <p className="text-gray-700 mb-4">
                  We collect the following types of information when you use the Sage platform:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>User Information:</strong> Name, email address, role (student, teacher, admin), and school affiliation.</li>
                  <li><strong>Content Data:</strong> Written content you create or upload within Sage, including drafts, assignments, and feedback.</li>
                  <li><strong>Usage Data:</strong> Analytics about how you interact with the platform (e.g., session duration, features used).</li>
                  <li><strong>AI Interactions:</strong> Prompts and AI-generated suggestions for learning purposes.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                <p className="text-gray-700 mb-4">
                  Your data is used to support and enhance your educational experience:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>To save and manage your writing sessions</li>
                  <li>To provide writing assistance and feedback tools powered by AI</li>
                  <li>To allow teachers to review, comment, and grade assignments</li>
                  <li>To improve platform functionality and support user experience</li>
                </ul>
                <p className="text-gray-700 mt-4 font-semibold">
                  We do not sell or share your personal data with third-party advertisers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Compliance with Education Regulations</h2>
                <p className="text-gray-700 mb-4">
                  Sage is designed with education privacy laws in mind:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>FERPA:</strong> We comply with the Family Educational Rights and Privacy Act by ensuring student records are only accessible to authorized school officials.</li>
                  <li><strong>COPPA:</strong> For users under 13, account creation must be managed by a verified educator or guardian.</li>
                  <li><strong>Data Ownership:</strong> All user-generated content belongs to the student, and is only accessible to the assigned teacher or administrator.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Who Can See Your Content</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Students:</strong> Can see only their own documents and activity.</li>
                  <li><strong>Teachers/Admins:</strong> Can view and comment on student work assigned to them.</li>
                  <li><strong>Sage Staff:</strong> Limited access for troubleshooting and technical support, only when necessary.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. How AI Is Used</h2>
                <p className="text-gray-700 mb-4">
                  Our AI features are designed to support — not replace — your writing process. The AI assistant may provide:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Writing prompts</li>
                  <li>Grammar/spell suggestions</li>
                  <li>Feedback on structure and clarity</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  AI responses are generated based on the content you provide. They are not stored or reused to train third-party models.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention and Deletion</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Assignments and data are retained for as long as your account is active or as required by your school.</li>
                  <li>You may request deletion of your data through your teacher or by contacting our support team at <a href="mailto:sage.edu21@gmail.com" className="text-blue-600 hover:underline">sage.edu21@gmail.com</a></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Consent</h2>
                <p className="text-gray-700">
                  By using Sage, you acknowledge that you understand and agree to this privacy notice. If you are a minor, your parent or teacher must approve your use of the platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
                <p className="text-gray-700">
                  If you have any questions or concerns, please contact us at:
                </p>
                <p className="text-gray-700">
                  <strong>Email:</strong> <a href="mailto:sage.edu21@gmail.com" className="text-blue-600 hover:underline">sage.edu21@gmail.com</a>
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2024 Sage - Empowering ethical AI-assisted learning
          </p>
        </div>
      </div>
    </div>
  );
}