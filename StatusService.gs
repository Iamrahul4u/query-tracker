/**
 * Status Transition Logic and Validation
 */

function getAllowedNextStatuses(currentStatus, userRole) {
  const transitions = {
    'A': ['B'], 
    'B': ['C', 'D', 'E', 'F', 'G'], // Added E, F
    'C': ['D', 'E', 'F', 'G'],      // Added D, F
    'D': ['C', 'E', 'F', 'G'],      // Added C
    'E': ['G'],
    'F': ['G'],
    'G': []
  };
  
  return transitions[currentStatus] || [];
}

/**
 * Validate status transition
 */
function canChangeStatus(currentStatus, newStatus, userRole) {
  const allowed = getAllowedNextStatuses(currentStatus, userRole);
  
  if (allowed.indexOf(newStatus) === -1) {
    return {
      allowed: false,
      reason: 'Cannot move from ' + currentStatus + ' to ' + newStatus
    };
  }
  
  return {allowed: true, reason: ''};
}

/**
 * Get required fields for a status
 */
function getRequiredFieldsForStatus(status) {
  const requirements = {
    'D': ['WhatsPending'],
    'F': ['WhatsPending'],
    'E': [], // EventID, EventTitle, GmIndicator are optional
    'F': ['WhatsPending'] // EventID, EventTitle optional
  };
  
  return requirements[status] || [];
}

/**
 * Change query status with validation
 */
function changeQueryStatus(queryId, newStatus, additionalData, editorEmail) {
  try {
    // Get current query
    const query = getQueryById(queryId);
    if (!query) {
      return {success: false, error: 'Query not found'};
    }
    
    // Validate transition
    const validation = canChangeStatus(query.Status, newStatus, 'Senior');
    if (!validation.allowed) {
      return {success: false, error: validation.reason};
    }
    
    // Check required fields
    const requiredFields = getRequiredFieldsForStatus(newStatus);
    for (var i = 0; i < requiredFields.length; i++) {
      const field = requiredFields[i];
      if (!additionalData[field] || additionalData[field].trim() === '') {
        return {success: false, error: 'Field required: ' + field};
      }
    }
    
    // Prepare updates
    const sheet = getQueriesSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find query row
    let rowIndex = -1;
    const queryIdCol = headers.indexOf('Query ID');
    if (queryIdCol === -1) return {success: false, error: 'Column Query ID not found'};
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][queryIdCol] === queryId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return {success: false, error: 'Query not found in sheet'};
    }
    
    const now = new Date();
    
    // Build field updates based on new status
    // MAP INTERNAL KEYS TO SHEET HEADERS
    const updates = [
      {header: 'Status', value: newStatus},
      {header: 'Last Activity Date Time', value: now}
    ];
    
    // Track edit history if editorEmail provided
    if (editorEmail) {
      updates.push({header: 'Last Edited By', value: editorEmail});
      updates.push({header: 'Last Edited Date Time', value: now});
    }
    
    // Status-specific field updates
    switch(newStatus) {
      case 'C':
      case 'D':
        updates.push({header: 'Proposal Sent Date Time', value: now});
        if (newStatus === 'D' && additionalData.WhatsPending) {
          updates.push({header: 'Whats Pending', value: additionalData.WhatsPending});
        }
        break;
        
      case 'E':
      case 'F':
        if (!query.ProposalSentDateTime) {
          updates.push({header: 'Proposal Sent Date Time', value: now});
        }
        updates.push({header: 'Entered In SF Date Time', value: now});
        
        if (additionalData.EventID) {
          updates.push({header: 'Event ID', value: additionalData.EventID});
        }
        if (additionalData.EventTitle) {
          updates.push({header: 'Event Title', value: additionalData.EventTitle});
        }
        if (additionalData.GmIndicator !== undefined) {
          updates.push({header: 'GmIndicator', value: additionalData.GmIndicator});
        }
        if (newStatus === 'F' && additionalData.WhatsPending) {
          updates.push({header: 'Whats Pending', value: additionalData.WhatsPending});
        }
        break;
        
      case 'G':
        updates.push({header: 'Discarded Date Time', value: now});
        break;
    }
    
    // Apply updates
    updates.forEach(function(update) {
      const colIndex = headers.indexOf(update.header);
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(update.value);
      }
    });
    
    return {success: true};
    
  } catch (error) {
    console.error('Error in changeQueryStatus:', error);
    return {success: false, error: error.message};
  }
}

/**
 * Get status display name
 */
function getStatusDisplayName(status) {
  return BUCKET_NAMES[status] || status;
}
