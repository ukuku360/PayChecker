export type JobType = string;

export interface JobConfig {
  id: string;
  name: string;
  color: string; // tailwind color name (e.g., 'blue', 'emerald')
  defaultHours: {
    weekday: number;
    weekend: number;
  };
  hourlyRates: {
    weekday: number;
    saturday: number;
    sunday: number;
    holiday: number;
  };
}

export interface WageConfig {
  [jobType: string]: {
    weekday: number;
    saturday: number;
    sunday: number;
    holiday: number;
  };
}

export interface Shift {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  type: JobType;
  hours: number;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface VacationPeriod {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}
