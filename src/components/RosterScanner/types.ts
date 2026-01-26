export type ScanStep = 'upload' | 'processing' | 'mapping' | 'confirmation';

export interface JobMapping {
  rosterJobName: string;
  mappedJobId: string;
  saveAsAlias: boolean;
}
