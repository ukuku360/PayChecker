import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReadmeModal } from '../ReadmeModal';

const translationTable: Record<string, unknown> = {
  'help.title': 'How to use PayChecker',
  'help.subtitle': 'Your Personal Roster & Pay Manager',
  'help.intro': 'Intro text',
  'help.autoRoster': 'Auto Roster Scanner (Upload & Go)',
  'help.dashboard': 'Smart Dashboard & Savings Goals',
  'help.fiscal': 'Fiscal Year Overview',
  'help.expense': 'Expense Tracker',
  'help.multipleJobs': 'Manage Multiple Jobs',
  'help.getStarted': 'Get Started',
  'help.gotIt': 'Got it!',
  'help.autoRosterItems': [
    { title: 'Snap & Upload', description: 'Upload your file.' },
    { title: 'Automatic Schedule', description: 'Auto add shifts.' },
  ],
  'help.dashboardItems': [
    { title: 'Track Earnings', description: 'Weekly and monthly totals.' },
  ],
  'help.fiscalItems': [
    { title: 'Tax Made Easy', description: 'Fiscal year view.' },
  ],
  'help.expenseItems': [
    { title: 'Log Deductions', description: 'Track expenses.' },
  ],
  'help.multipleJobsItems': [
    { title: 'Multiple Rates', description: 'Per job rates.' },
  ],
  'help.getStartedItems': [
    { title: 'Add Jobs', description: 'Set up jobs and rates.' },
    { title: 'Upload Roster', description: 'Use scanner tab.' },
  ],
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translationTable[key] ?? key,
  }),
}));

describe('ReadmeModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ReadmeModal isOpen={false} onClose={() => undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders structured help items and triggers close', () => {
    const onClose = vi.fn();
    render(<ReadmeModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText('How to use PayChecker')).toBeTruthy();
    expect(screen.getByText('Snap & Upload:')).toBeTruthy();
    expect(screen.getByText('Upload your file.')).toBeTruthy();
    expect(screen.getByText('Upload Roster:')).toBeTruthy();

    fireEvent.click(screen.getByText('Got it!'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

