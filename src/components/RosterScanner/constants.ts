/**
 * Constants for Roster Scanner feature
 */

export const PROCESSING_MESSAGES = [
  'Analyzing roster image...',
  'Detecting shift patterns...',
  'Extracting dates and times...',
  'Matching job names...',
  'Almost done...'
] as const;

export const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  auth: {
    title: 'Authentication required',
    description: 'Please sign in again and retry the scan.'
  },
  blurry: {
    title: 'Image too blurry',
    description: 'Please take a clearer photo of your roster with better lighting.'
  },
  config: {
    title: 'Service not configured',
    description: 'AI scanning is not configured. Please try again later.'
  },
  invalid_input: {
    title: 'Invalid image data',
    description: 'We could not read this file. Please choose a different image.'
  },
  no_shifts: {
    title: 'No shifts found',
    description: 'No work shifts could be detected. Make sure this is a work roster/schedule.'
  },
  network: {
    title: 'Network error',
    description: 'Unable to reach the AI service. Please try again.'
  },
  timeout: {
    title: 'Request timed out',
    description: 'Processing took too long. Please try again with a smaller or clearer image.'
  },
  limit_exceeded: {
    title: 'Monthly limit reached',
    description: "You've reached your monthly scan limit. Limit resets next month."
  },
  parse_error: {
    title: 'Processing error',
    description: 'Failed to process the roster. Please try with a different image.'
  },
  not_roster: {
    title: 'Not a roster',
    description: "This doesn't appear to be a work roster. Please upload a schedule image."
  },
  unknown: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.'
  }
};
