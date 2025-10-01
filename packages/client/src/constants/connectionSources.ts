export interface ConnectionSource {
  id: string;
  title: string;
  status: Status;
  lastSync?: string;
  description?: string;
  badges: string[];
 }

 export type Status = 'Not connected' | 'Connected';

 export const STATUS = {
  NOT_CONNECTED: 'Not connected' as Status,
  CONNECTED: 'Connected' as Status,
};

export const CONNECTION_SOURCES: ConnectionSource[] = [
  {
    id: 'confluence',
    title: 'Confluence',
    status: STATUS.NOT_CONNECTED,
    lastSync: '—',
    badges: ['Knowledge'],
   },
  {
    id: 'sharepoint',
    title: 'SharePoint',
    status: STATUS.NOT_CONNECTED,
    lastSync: '—',
    badges: ['Knowledge'],
   },
  {
    id: 'servicenow',
    title: 'ServiceNow',
    status: STATUS.NOT_CONNECTED,
    lastSync: '—',
    badges: ['Knowledge', 'Ticketing'],
   },
  {
    id: 'web-search',
    title: 'Web Search (LGA)',
    status: STATUS.CONNECTED,
    description: 'Use web results to supplement answers when knowledge isn\'t found.',
    badges: ['Knowledge'],
   }
];

export const VALID_SOURCE_IDS = CONNECTION_SOURCES.map(source => source.id);

// Helper function to get source by ID
export const getSourceById = (id: string): ConnectionSource | undefined => {
  return CONNECTION_SOURCES.find(source => source.id === id);
};
