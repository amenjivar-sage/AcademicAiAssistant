/**
 * FERPA/COPPA Compliance Module for Sage Educational Platform
 * 
 * This module implements data protection standards required for educational technology
 * platforms handling student information under FERPA and COPPA regulations.
 */

export interface ComplianceAuditLog {
  userId: number;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  dataAccessed?: string[];
  purpose: string;
}

export class FERPAComplianceManager {
  private auditLogs: ComplianceAuditLog[] = [];

  /**
   * FERPA Compliance: Log all access to educational records
   */
  logEducationalRecordAccess(log: ComplianceAuditLog): void {
    this.auditLogs.push({
      ...log,
      timestamp: new Date()
    });
    
    // In production: Store in secure, immutable audit database
    console.log('FERPA AUDIT:', JSON.stringify(log, null, 2));
  }

  /**
   * FERPA Compliance: Validate educational purpose for data access
   */
  validateEducationalPurpose(purpose: string, userRole: string): boolean {
    const validPurposes = {
      student: ['view_own_work', 'submit_assignment', 'access_feedback'],
      teacher: ['grade_assignment', 'provide_feedback', 'track_progress', 'manage_class'],
      admin: ['user_management', 'system_administration', 'compliance_audit']
    };

    return validPurposes[userRole]?.includes(purpose) || false;
  }

  /**
   * COPPA Compliance: Age verification for students under 13
   */
  requiresParentalConsent(grade: string): boolean {
    const elementaryGrades = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th'];
    return elementaryGrades.includes(grade);
  }

  /**
   * FERPA Compliance: Data minimization - only collect necessary data
   */
  sanitizeStudentData(studentData: any): any {
    const allowedFields = [
      'id', 'firstName', 'lastName', 'grade', 'email', 
      'writingSessions', 'assignments', 'classrooms'
    ];

    return Object.keys(studentData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = studentData[key];
        return obj;
      }, {} as any);
  }

  /**
   * FERPA Compliance: Directory information restrictions
   */
  canShareDirectoryInfo(studentId: number, requesterRole: string): boolean {
    // Directory information can only be shared with legitimate educational interest
    const authorizedRoles = ['teacher', 'admin', 'counselor'];
    return authorizedRoles.includes(requesterRole);
  }

  /**
   * FERPA Compliance: Student data retention policy
   */
  getDataRetentionPolicy(): {
    activeStudents: string;
    graduatedStudents: string;
    writingData: string;
    auditLogs: string;
  } {
    return {
      activeStudents: "Retained while enrolled and for 1 year after graduation/transfer",
      graduatedStudents: "Retained for 5 years after graduation for transcript purposes",
      writingData: "Retained for 3 years for academic assessment and improvement",
      auditLogs: "Retained for 7 years for compliance verification"
    };
  }

  /**
   * FERPA Compliance: Parent/student rights notification
   */
  getStudentRights(): string[] {
    return [
      "Right to inspect and review educational records",
      "Right to request amendment of inaccurate records",
      "Right to consent to disclosure of personally identifiable information",
      "Right to file complaints with the Department of Education",
      "Right to obtain copy of institution's FERPA policy"
    ];
  }

  /**
   * COPPA Compliance: Safe Harbor provisions for schools
   */
  getSchoolSafeHarborRequirements(): string[] {
    return [
      "School has obtained parental consent for collection of student information",
      "Platform only collects information necessary for educational purposes",
      "Information is not disclosed except to school officials with legitimate interest",
      "Platform implements reasonable security measures",
      "Platform does not use student information for advertising or commercial purposes"
    ];
  }
}

export const ferpaCompliance = new FERPAComplianceManager();

/**
 * Middleware for FERPA-compliant data access logging
 */
export function logDataAccess(userId: number, action: string, purpose: string) {
  return (req: any, res: any, next: any) => {
    ferpaCompliance.logEducationalRecordAccess({
      userId,
      action,
      purpose,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      dataAccessed: [req.path]
    });
    next();
  };
}