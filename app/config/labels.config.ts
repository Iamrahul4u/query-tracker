/**
 * Field Label Customization Configuration
 * 
 * This file allows customizing UI field labels without changing the underlying sheet column names.
 * Managed by developer only - client requests changes through developer.
 */

export const FIELD_LABELS: Record<string, string> = {
  // Query Fields
  "Query ID": "ID",
  "Query Description": "Description",
  "Query Type": "Type",
  "Status": "Status",
  "Added By": "Added By",
  "Added Date Time": "Added",
  "Assigned To": "Assigned To",
  "Assigned By": "Assigned By",
  "Assignment Date Time": "Assigned",
  "Remarks": "Remarks",
  "Proposal Sent Date Time": "Proposal Sent",
  "Whats Pending": "What's Pending",
  "Entered In SF Date Time": "SF Entry",
  "Event ID in SF": "SF Event ID",
  "Event Title in SF": "SF Event Title",
  "Discarded Date Time": "Discarded",
  "GmIndicator": "GM",
  "Delete Requested Date Time": "Delete Req",
  "Delete Requested By": "Delete Req By",
  "Last Edited Date Time": "Last Edited",
  "Last Edited By": "Edited By",
  "Last Activity Date Time": "Last Activity",
  
  // Deletion Workflow
  "Previous Status": "Previous Status",
  "Delete Approved By": "Approved By",
  "Delete Approved Date Time": "Approved",
  "Delete Rejected": "Rejected",
};

/**
 * Get display label for a field name
 * Falls back to original field name if no custom label exists
 */
export function getLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

/**
 * Get all field labels
 */
export function getAllLabels(): Record<string, string> {
  return { ...FIELD_LABELS };
}
