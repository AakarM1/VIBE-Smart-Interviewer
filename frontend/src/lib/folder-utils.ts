/**
 * Utility functions for handling folder paths in Firebase Storage
 */

/**
 * Generate possible folder paths for submissions
 * @param submissionId - The submission ID
 * @param candidateName - The candidate's name (optional)
 * @returns Array of possible folder paths
 */
export function getPossibleFolderPaths(submissionId: string, candidateName?: string): string[] {
  const paths: string[] = [];
  
  // Standard submission path
  paths.push(`submissions/${submissionId}`);
  
  if (candidateName) {
    // User-named paths
    const cleanName = candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    paths.push(`submissions/${cleanName}_${submissionId}`);
    paths.push(`submissions/${cleanName}`);
    
    // Legacy formats
    paths.push(`submissions/temp_${cleanName}_${submissionId}`);
    paths.push(`submissions/partial_${cleanName}_${submissionId}`);
  }
  
  // Legacy formats without name
  paths.push(`submissions/temp_${submissionId}`);
  paths.push(`submissions/partial_${submissionId}`);
  
  return paths;
}

/**
 * Extract folder name from Firebase Storage URL
 * @param url - Firebase Storage URL
 * @returns Folder name or null if not found
 */
export function extractFolderFromStorageUrl(url: string): string | null {
  const match = url.match(/submissions%2F([^%]+?)%2F/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return null;
}
