import cronstrue from 'cronstrue';

export const humanizeCron = (cron: string): string => {
  if (!cron.trim()) return 'Manual run only';
  try {
    // cronstrue expect standard 5-part or 6-part cron
    // default options are: throwExceptionOnParseError: true, verbose: false
    return cronstrue.toString(cron.trim(), { use24HourTimeFormat: true });
  } catch (err) {
    return `Invalid: ${err instanceof Error ? err.message : String(err)}`;
  }
};
